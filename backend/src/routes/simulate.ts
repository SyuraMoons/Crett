import { Router } from "express"
import { simulateWorkflow } from "../lib/cre-cli"

const router = Router()

const BACKEND_URL = `http://localhost:${process.env.PORT ?? 3001}`

router.post("/", async (req, res) => {
  const { code, config } = req.body
  if (!code) {
    res.status(400).json({ error: "code is required" })
    return
  }

  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")
  res.flushHeaders()

  const send = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  const logLines: string[] = []

  try {
    for await (const line of simulateWorkflow({ code, config: config || { schedule: "*/30 * * * * *" } })) {
      logLines.push(line.trim())
      send({ type: "log", message: line })
    }

    // Parse prices from log lines and store for CRE Live Feed
    const ethMatch = logLines.find(l => l.startsWith("ETH: $"))?.match(/\$([\d,]+(?:\.\d+)?) \(([-+\d.]+)%/)
    const btcMatch = logLines.find(l => l.startsWith("BTC: $"))?.match(/\$([\d,]+(?:\.\d+)?) \(([-+\d.]+)%/)
    const linkMatch = logLines.find(l => l.startsWith("LINK: $"))?.match(/\$([\d,]+(?:\.\d+)?) \(([-+\d.]+)%/)
    const onchainMatch = logLines.find(l => l.includes("Chainlink ETH/USD"))?.match(/\$([\d,]+(?:\.\d+)?)$/)
    const generated = logLines.some(l => l.includes("Generated CRE Workflow"))

    const parsePrice = (m: RegExpMatchArray | null | undefined) =>
      m ? parseFloat(m[1].replace(/,/g, "")) : null

    const payload = {
      eth: parsePrice(ethMatch),
      btc: parsePrice(btcMatch),
      link: parsePrice(linkMatch),
      ethOnchain: parsePrice(onchainMatch),
      generated,
      network: "Base Sepolia",
    }

    if (payload.eth !== null || payload.btc !== null || payload.link !== null) {
      fetch(`${BACKEND_URL}/api/cre-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {/* ignore */})
    }

    send({ type: "done", success: true })
  } catch (err) {
    send({ type: "error", message: String(err) })
    send({ type: "done", success: false })
  } finally {
    res.end()
  }
})

export default router
