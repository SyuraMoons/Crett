import { Router } from "express"
import { generateWorkflowStream } from "../lib/llm"

const router = Router()

router.post("/", async (req, res) => {
  const { prompt } = req.body
  if (!prompt || typeof prompt !== "string") {
    res.status(400).json({ error: "prompt is required" })
    return
  }

  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")
  res.flushHeaders()

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`)

  try {
    let accumulated = ""
    for await (const delta of generateWorkflowStream(prompt)) {
      accumulated += delta
      send({ type: "chunk", code: delta })
    }

    const clean = accumulated
      .replace(/^```(?:typescript|ts)?\n?/m, "")
      .replace(/\n?```$/m, "")
      .trim()

    send({ type: "done", success: true, code: clean })
  } catch (err) {
    console.error("Generate stream error:", err)
    send({ type: "error", message: String(err) })
    send({ type: "done", success: false, code: "" })
  } finally {
    res.end()
  }
})

export default router
