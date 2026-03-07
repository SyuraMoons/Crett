const RAG_URL = process.env.RAG_URL || "http://localhost:3002"

interface RagResult {
  title: string
  heading: string
  content: string
  url: string
  similarity: number
}

export async function queryRAG(query: string, topK = 4): Promise<string> {
  try {
    const res = await fetch(`${RAG_URL}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, topK }),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return ""

    const data = await res.json() as { results?: RagResult[] }
    const results: RagResult[] = data.results ?? []
    if (results.length === 0) return ""

    console.log(`[RAG] query="${query.slice(0, 60)}" → ${results.length} chunks (top similarity: ${results[0].similarity.toFixed(3)})`)
    results.forEach((r, i) => console.log(`  [${i + 1}] ${r.title} > ${r.heading}`))

    return results
      .map((r) => `### ${r.title} — ${r.heading}\nSource: ${r.url}\n\n${r.content}`)
      .join("\n\n---\n\n")
  } catch {
    // RAG service unavailable — degrade gracefully
    console.warn("[RAG] service unavailable, skipping context injection")
    return ""
  }
}
