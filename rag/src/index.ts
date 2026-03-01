import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import * as path from "path"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { createClient } from "@supabase/supabase-js"

dotenv.config({ path: path.join(__dirname, "../.env") })

const app = express()
app.use(cors())
app.use(express.json())

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const embedModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" })

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

async function embedQuery(text: string): Promise<number[]> {
  const result = await embedModel.embedContent({
    content: { parts: [{ text }], role: "user" },
    taskType: "RETRIEVAL_QUERY" as any,
    outputDimensionality: 768,
  } as any)
  return result.embedding.values
}

// POST /query — main RAG endpoint
app.post("/query", async (req, res) => {
  const { query, topK = 5 } = req.body
  if (!query || typeof query !== "string") {
    res.status(400).json({ error: "query is required" })
    return
  }

  try {
    const embedding = await embedQuery(query)

    const { data, error } = await supabase.rpc("match_documents", {
      query_embedding: embedding,
      match_count: topK,
    })

    if (error) throw error

    res.json({
      query,
      results: data.map((row: any) => ({
        title: row.title,
        heading: row.heading,
        content: row.content,
        url: row.url,
        similarity: row.similarity,
      })),
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

app.get("/health", (_, res) => res.json({ status: "ok", chunks: "732" }))

const PORT = process.env.RAG_PORT || 3002
app.listen(PORT, () => console.log(`Crett RAG server running on :${PORT}`))
