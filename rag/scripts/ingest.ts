import * as fs from "fs"
import * as path from "path"
import * as dotenv from "dotenv"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { createClient } from "@supabase/supabase-js"
import type { Chunk } from "./chunk"

dotenv.config({ path: path.join(__dirname, "../.env") })

const BATCH_SIZE = 20
const DELAY_MS = 700 // delay between requests to stay under 100 req/min

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const embedModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" })

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

async function embedText(text: string, retries = 5): Promise<number[]> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const result = await embedModel.embedContent({
        content: { parts: [{ text }], role: "user" },
        taskType: "RETRIEVAL_DOCUMENT" as any,
        outputDimensionality: 768,
      } as any)
      return result.embedding.values
    } catch (err: any) {
      const msg: string = err?.message ?? ""
      const retryMatch = msg.match(/Please retry in (\d+(\.\d+)?)s/)
      const waitSec = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) + 2 : 60
      if (attempt < retries - 1) {
        process.stdout.write(`\n    ⏳ Rate limited, waiting ${waitSec}s... `)
        await sleep(waitSec * 1000)
      } else {
        throw err
      }
    }
  }
  throw new Error("Max retries exceeded")
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  const chunksPath = path.join(__dirname, "../data/chunks.json")
  if (!fs.existsSync(chunksPath)) {
    console.error("❌ chunks.json not found. Run `npm run chunk` first.")
    process.exit(1)
  }

  let chunks: Chunk[] = JSON.parse(fs.readFileSync(chunksPath, "utf8"))

  // Resume mode: skip already-ingested chunks
  const resume = process.argv.includes("--resume")
  if (resume) {
    const { data: existing } = await supabase.from("documents").select("chunk_id")
    const done = new Set((existing ?? []).map((r: any) => r.chunk_id))
    const before = chunks.length
    chunks = chunks.filter((c) => !done.has(c.id))
    console.log(`⏭️  Resume mode: skipping ${before - chunks.length} already ingested chunks`)
  }

  console.log(`🚀 Starting ingest of ${chunks.length} chunks into Supabase...`)
  console.log(`   Batch size: ${BATCH_SIZE} | Delay: ${DELAY_MS}ms/request\n`)

  let success = 0
  let failed = 0

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(chunks.length / BATCH_SIZE)
    process.stdout.write(`  Batch ${batchNum}/${totalBatches} ... `)

    try {
      // Embed sequentially to stay under rate limit
      const embeddings: number[][] = []
      for (const chunk of batch) {
        embeddings.push(await embedText(chunk.content))
        await sleep(DELAY_MS)
      }

      const rows = batch.map((chunk, idx) => ({
        chunk_id: chunk.id,
        path: chunk.path,
        url: chunk.url,
        title: chunk.title,
        heading: chunk.heading,
        content: chunk.content,
        chunk_index: chunk.chunkIndex,
        embedding: embeddings[idx],
      }))

      const { error } = await supabase.from("documents").upsert(rows, {
        onConflict: "chunk_id",
      })

      if (error) throw error

      success += batch.length
      console.log(`✓ (${batch.length} chunks)`)
    } catch (err: any) {
      failed += batch.length
      console.log(`✗ ${err.message}`)
    }

    if (i + BATCH_SIZE < chunks.length) await sleep(DELAY_MS)
  }

  console.log(`\n✅ Ingest complete!`)
  console.log(`   Success: ${success} | Failed: ${failed}`)
}

main().catch(console.error)
