import { Router } from "express"
import { analyzeWorkflow } from "../lib/llm"

const router = Router()

router.post("/", async (req, res) => {
  const { code } = req.body
  if (!code) {
    res.status(400).json({ error: "code is required" })
    return
  }
  try {
    const analysis = await analyzeWorkflow(code)
    res.json({ analysis })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({ error: message })
  }
})

export default router
