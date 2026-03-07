import { Router } from "express"
import { agentClassify, chatWorkflow } from "../lib/llm"
import { getLatestCreData } from "./cre-data"

const router = Router()

router.post("/", async (req, res) => {
  const { message, code, messages = [] } = req.body
  if (!message) {
    res.status(400).json({ error: "message is required" })
    return
  }

  try {
    const hasCode = !!code
    const creStore = getLatestCreData()
    const liveMarketData = creStore?.data as {
      eth?: number | null
      btc?: number | null
      link?: number | null
      ethOnchain?: number | null
      generated?: boolean
      network?: string
    } | null
    const hasMarketData = !!liveMarketData

    const intent = await agentClassify(message, hasCode, hasMarketData)

    // Build system prompt — autonomous mode gets market-aware context
    let systemOverride: string | undefined
    if (intent === "autonomous" && hasMarketData) {
      const d = liveMarketData!
      systemOverride = `You are an autonomous CRE workflow agent with access to real-time market data from a completed simulation.

Current market snapshot (Base Sepolia):
- ETH/USD: $${d.eth ?? "?"} (CoinGecko), $${d.ethOnchain ?? "?"} (Chainlink onchain)
- BTC/USD: $${d.btc ?? "?"}
- LINK/USD: $${d.link ?? "?"}
- Workflow previously generated: ${d.generated ? "yes" : "no"}

The user wants you to autonomously decide what action to take. Analyze the market conditions, explain your reasoning concisely, and recommend ONE specific next step: generate a new workflow tailored to these conditions, simulate the existing workflow, or simply monitor and report.`
    } else if (intent === "autonomous") {
      systemOverride = `You are an autonomous CRE workflow agent. No market data is available yet (run a simulation first to populate live feed data). Explain that you need market data and suggest the user runs a simulation first.`
    }

    const allMessages: { role: "user" | "assistant"; content: string }[] = [
      ...messages,
      { role: "user", content: message },
    ]

    const reply = await chatWorkflow(intent === "autonomous" ? undefined : code, allMessages, systemOverride)

    // Map intent to autoAction — only trigger automatically for unambiguous intents
    let autoAction: "generate" | "simulate" | "analyze" | null = null
    if (intent === "generate") autoAction = "generate"
    else if (intent === "simulate" && hasCode) autoAction = "simulate"
    else if (intent === "analyze" && hasCode) autoAction = "analyze"

    res.json({ intent, message: reply, autoAction })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

export default router
