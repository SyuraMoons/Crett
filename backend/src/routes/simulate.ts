import { Router } from "express"
import { simulateWorkflow } from "../lib/cre-cli"

const router = Router()

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

  try {
    for await (const line of simulateWorkflow({ code, config: config || { schedule: "*/30 * * * * *" } })) {
      send({ type: "log", message: line })
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
