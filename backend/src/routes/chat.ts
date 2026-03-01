import { Router } from "express"
import { chatWorkflow } from "../lib/llm"

const router = Router()

router.post("/", async (req, res) => {
  const { code, messages } = req.body
  if (!Array.isArray(messages)) {
    res.status(400).json({ error: "messages is required" })
    return
  }
  try {
    const reply = await chatWorkflow(code || undefined, messages)
    res.json({ message: reply })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
})

export default router
