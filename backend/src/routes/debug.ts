import { Router } from "express"
import { debugWorkflow } from "../lib/llm"

const router = Router()

router.post("/", async (req, res) => {
  const { code, logs } = req.body
  if (!code || !logs) {
    return res.status(400).json({ error: "code and logs are required" })
  }
  try {
    const diagnosis = await debugWorkflow(code, logs)
    res.json({ diagnosis })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

export default router
