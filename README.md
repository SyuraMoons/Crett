# Crett — AI-powered CRE Workflow Generator

Hackathon project for Chainlink Convergence 2026.

## Project Structure

```
chainlink/                        ← ROOT (git repo + concurrently)
├── fe/                           ← Next.js frontend  (port 3000)
│   ├── package.json
│   ├── node_modules/
│   └── app/                      ← Next.js App Router routes
│       ├── page.tsx              ← Landing page "/"
│       ├── layout.tsx            ← Root HTML shell + Providers
│       └── dashboard/page.tsx   ← Main dashboard
│
├── backend/                      ← Express API server (port 3001)
│   ├── package.json
│   ├── .env                      ← ZAI_API_KEY, COINGECKO_API_KEY, PORT, RAG_URL
│   ├── node_modules/
│   └── src/
│       ├── index.ts
│       └── lib/
│           ├── llm.ts            ← LLM calls + RAG context injection
│           └── rag.ts            ← RAG service client
│
├── rag/                          ← RAG microservice (port 3002)
│   ├── package.json
│   ├── .env                      ← GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY
│   ├── src/index.ts              ← Express server + /query endpoint
│   ├── scripts/
│   │   ├── scrape.ts             ← Scrapes docs.chain.link/cre (92 pages)
│   │   ├── chunk.ts              ← Splits pages into overlapping chunks
│   │   └── ingest.ts             ← Embeds chunks & upserts to Supabase pgvector
│   └── data/
│       ├── scraped.json          ← Raw scraped content (92 pages)
│       └── chunks.json           ← Processed chunks (732 chunks)
│
└── crett/                        ← CRE CLI project
    └── crett-workflow/
        └── main.ts               ← Overwritten on each generate/simulate
```

**Why 4 separate `node_modules`?**
This is a monorepo. Each package manages its own deps independently:
- Root `node_modules` — only `concurrently` (to run both servers at once)
- `fe/node_modules` — Next.js, React, wagmi, rainbowkit, etc.
- `backend/node_modules` — Express, Z.ai SDK, dotenv, etc.
- `rag/node_modules` — Gemini SDK, Supabase client, Cheerio, Axios, etc.

## Setup

```bash
# Install all dependencies (run once from root)
npm run setup

# OR manually:
npm install            # root (just concurrently)
cd fe && npm install
cd ../backend && npm install
cd ../rag && npm install
```

## Running

```bash
# Start both frontend + backend simultaneously (from root)
npm run dev

# OR start individually:
cd fe && npm run dev        # → http://localhost:3000
cd backend && npm run dev   # → http://localhost:3001
cd rag && npm run dev       # → http://localhost:3002
```

## Environment Variables

### `fe/.env`
```
ZAI_API_KEY=...
COINGECKO_API_KEY=...
NEXT_PUBLIC_WALLETCONNECT_ID=...
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

### `backend/.env`
```
ZAI_API_KEY=...
COINGECKO_API_KEY=...
PORT=3001
RAG_URL=http://localhost:3002
```

### `rag/.env`
```
GEMINI_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
PORT=3002
```

### `crett/.env`
```
CRE_ETH_PRIVATE_KEY=...
CRE_TARGET=staging-settings
```

## RAG Setup

The RAG service provides Chainlink CRE documentation context to the LLM. It scrapes, chunks, embeds, and stores docs in Supabase pgvector, then answers semantic queries at runtime.

### 1. Supabase — Create the table and RPC function

Run this SQL in your Supabase project (SQL Editor):

```sql
-- Enable pgvector
create extension if not exists vector;

-- Documents table
create table documents (
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

-- HNSW index for fast cosine similarity search
create index documents_embedding_idx
  on documents using hnsw (embedding vector_cosine_ops);

-- RPC function used by the RAG service
create or replace function match_documents(
  query_embedding vector(768),
  match_count int default 5
)
returns table (
  chunk_id text,
  path text,
  url text,
  title text,
  heading text,
  content text,
  chunk_index int,
  similarity float
)
language sql stable as $$
  select
    chunk_id, path, url, title, heading, content, chunk_index,
    1 - (embedding <=> query_embedding) as similarity
  from documents
  order by embedding <=> query_embedding
  limit match_count;
$$;
```

### 2. Run the ingestion pipeline

```bash
cd rag

# Step 1 — Scrape docs.chain.link/cre (92 pages → data/scraped.json)
npm run scrape

# Step 2 — Chunk pages into overlapping segments (→ data/chunks.json)
npm run chunk

# Step 3 — Embed chunks with Gemini & upsert to Supabase
npm run ingest

# OR run all three steps at once:
npm run pipeline
```

> **Resume interrupted ingestion:** `npm run ingest -- --resume`

### 3. Start the RAG service

```bash
cd rag && npm run dev   # → http://localhost:3002
```

### RAG API

**Health check**
```bash
curl http://localhost:3002/health
# → {"status":"ok","chunks":"732"}
```

**Query**
```bash
curl -X POST http://localhost:3002/query \
  -H "Content-Type: application/json" \
  -d '{"query":"how to use cron trigger in CRE workflow","topK":5}'
```

### How it works

```
User prompt
    │
    ▼
Backend (llm.ts) ──► RAG service /query
                           │
                    Gemini embedding
                           │
                    Supabase pgvector
                    (cosine similarity)
                           │
                    Top-K doc chunks
                           │
    ◄──────────── Injected into system prompt
    │
    ▼
LLM (Z.ai) generates workflow with CRE doc context
```

- **Embedding model**: `gemini-embedding-001` (768 dims)
- **Vector DB**: Supabase pgvector with HNSW index
- **Similarity**: Cosine
- **Default topK**: 4 chunks per query
- **Graceful degradation**: If the RAG service is unavailable, the backend falls back to the LLM without doc context.

## CRE Workflow Simulation

```bash
cd crett
cre workflow simulate ./crett-workflow \
  -T staging-settings \
  --non-interactive \
  --trigger-index 0
```

## Verification

```bash
curl http://localhost:3001/health
# → {"status":"ok"}
```
