# Crett RAG Service

RAG (Retrieval-Augmented Generation) microservice untuk Crett. Scrapes Chainlink CRE docs, chunks dan embeds kontennya ke Supabase pgvector, lalu serve sebagai query API yang dipakai backend Crett untuk memperkaya context LLM.

## Stack

- **Embedding**: Gemini `gemini-embedding-001` (768 dims)
- **Vector DB**: Supabase pgvector (hnsw index)
- **Server**: Express on port 3002

## Struktur

```
rag/
├── data/
│   ├── scraped.json     # Raw scraped CRE docs (91 pages)
│   └── chunks.json      # Chunked docs (732 chunks)
├── scripts/
│   ├── scrape.ts        # Scrape docs.chain.link/cre
│   ├── chunk.ts         # Split scraped pages into chunks
│   └── ingest.ts        # Embed chunks & upload ke Supabase
├── src/
│   └── index.ts         # RAG query server
└── .env
```

## Setup

### 1. Environment Variables

Buat file `.env` di folder ini:

```env
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
RAG_PORT=3002           # optional, default 3002
```

Gemini API key: [aistudio.google.com](https://aistudio.google.com)

### 2. Supabase Setup

Jalankan SQL berikut di Supabase SQL Editor:

```sql
create extension if not exists vector;

create table if not exists documents (
  id bigserial primary key,
  chunk_id text unique,
  path text,
  url text,
  title text,
  heading text,
  content text,
  chunk_index int,
  embedding vector(768)
);

create index documents_embedding_idx
  on documents using hnsw (embedding vector_cosine_ops);
```

Lalu buat fungsi RPC untuk vector search:

```sql
create or replace function match_documents(
  query_embedding vector(768),
  match_count int default 5
)
returns table (
  chunk_id text,
  title text,
  heading text,
  content text,
  url text,
  similarity float
)
language sql stable
as $$
  select
    chunk_id,
    title,
    heading,
    content,
    url,
    1 - (embedding <=> query_embedding) as similarity
  from documents
  order by embedding <=> query_embedding
  limit match_count;
$$;
```

### 3. Install Dependencies

```bash
npm install
```

## Pipeline (Jalankan sekali untuk ingest data)

```bash
# Step 1 — Scrape CRE docs (skip jika scraped.json sudah ada)
npm run scrape

# Step 2 — Chunk scraped pages
npm run chunk

# Step 3 — Embed & upload ke Supabase
npm run ingest

# Atau jalankan semua sekaligus
npm run pipeline
```

> **Note:** `ingest` pakai delay 700ms/request untuk stay under Gemini free tier (100 req/menit). 732 chunks butuh ~10 menit.
> Kalau ingest terputus di tengah, jalankan `npx ts-node scripts/ingest.ts --resume` untuk lanjut dari yang belum masuk.

## Menjalankan Server

```bash
# Development (hot reload)
npm run dev

# Production
npm run build && npm start
```

Server berjalan di `http://localhost:3002`.

## API

### `GET /health`

```json
{ "status": "ok", "chunks": "732" }
```

### `POST /query`

Cari chunks paling relevan untuk sebuah query.

**Request:**
```json
{
  "query": "how to use cron trigger in CRE workflow",
  "topK": 5
}
```

**Response:**
```json
{
  "query": "how to use cron trigger in CRE workflow",
  "results": [
    {
      "title": "Simulating Workflows",
      "heading": "Cron trigger",
      "content": "Cron triggers do not require additional...",
      "url": "https://docs.chain.link/cre/guides/operations/simulating-workflows",
      "similarity": 0.7804
    }
  ]
}
```

`topK` default: 5, recommended range: 3–6.

## Integrasi dengan Backend

Backend Crett memanggil RAG service secara otomatis sebelum setiap LLM call. Pastikan:

1. RAG server jalan di port 3002
2. `RAG_URL=http://localhost:3002` ada di `backend/.env`

Kalau RAG server tidak jalan, backend gracefully degrade — tetap berfungsi tanpa RAG context.

## Re-ingest (Update Docs)

Kalau CRE docs sudah update dan perlu re-scrape:

```bash
npm run scrape   # overwrite scraped.json
npm run chunk    # overwrite chunks.json
npm run ingest   # upsert ke Supabase (chunk_id sebagai conflict key)
```
