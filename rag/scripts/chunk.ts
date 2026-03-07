import * as fs from "fs"
import * as path from "path"
import type { ScrapedPage } from "./scrape"

export interface Chunk {
  id: string
  path: string
  url: string
  title: string
  heading: string
  content: string
  chunkIndex: number
}

const MAX_CHARS = 1500
const OVERLAP_CHARS = 150

function splitIntoChunks(text: string): string[] {
  if (text.length <= MAX_CHARS) return [text]

  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    let end = start + MAX_CHARS

    // Try to break at sentence boundary
    if (end < text.length) {
      const breakAt = text.lastIndexOf(". ", end)
      if (breakAt > start + MAX_CHARS / 2) end = breakAt + 1
    }

    chunks.push(text.slice(start, end).trim())
    start = end - OVERLAP_CHARS
  }

  return chunks.filter((c) => c.length > 50)
}

function chunkPage(page: ScrapedPage): Chunk[] {
  const chunks: Chunk[] = []
  let chunkIndex = 0

  for (const section of page.sections) {
    if (!section.content || section.content.length < 30) continue

    const text = `${section.heading}\n\n${section.content}`
    const parts = splitIntoChunks(text)

    for (const part of parts) {
      chunks.push({
        id: `${page.path.replace(/\//g, "_")}_${chunkIndex}`,
        path: page.path,
        url: page.url,
        title: page.title,
        heading: section.heading,
        content: part,
        chunkIndex,
      })
      chunkIndex++
    }
  }

  // If no sections, chunk the raw content
  if (chunks.length === 0 && page.content.length > 30) {
    const parts = splitIntoChunks(page.content)
    for (const part of parts) {
      chunks.push({
        id: `${page.path.replace(/\//g, "_")}_${chunkIndex}`,
        path: page.path,
        url: page.url,
        title: page.title,
        heading: page.title,
        content: part,
        chunkIndex,
      })
      chunkIndex++
    }
  }

  return chunks
}

async function main() {
  const scrapedPath = path.join(__dirname, "../data/scraped.json")
  const outputPath = path.join(__dirname, "../data/chunks.json")

  console.log("✂️  Starting chunking...")
  const pages: ScrapedPage[] = JSON.parse(fs.readFileSync(scrapedPath, "utf8"))
  console.log(`   Pages loaded: ${pages.length}`)

  const allChunks: Chunk[] = []
  for (const page of pages) {
    const chunks = chunkPage(page)
    allChunks.push(...chunks)
  }

  fs.writeFileSync(outputPath, JSON.stringify(allChunks, null, 2))

  console.log(`\n✅ Chunking complete!`)
  console.log(`   Total chunks: ${allChunks.length}`)
  console.log(
    `   Avg chunk size: ${Math.round(allChunks.reduce((s, c) => s + c.content.length, 0) / allChunks.length)} chars`
  )
  console.log(`   Saved to: ${outputPath}`)
}

main().catch(console.error)
