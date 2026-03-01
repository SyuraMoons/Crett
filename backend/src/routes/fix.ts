import { Router } from "express"
import { fixWorkflow } from "../lib/llm"

const router = Router()

router.post("/", async (req, res) => {
  const { code, improvement } = req.body
  if (!code || !improvement) {
    res.status(400).json({ error: "code and improvement are required" })
    return
  }
  try {
    const fixed = await fixWorkflow(code, improvement)
    res.json({ code: fixed })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
})

export default router
