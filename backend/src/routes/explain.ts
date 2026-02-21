import { Router } from "express"
import { explainWorkflow } from "../lib/llm"

const router = Router()

router.post("/", async (req, res) => {
  try {
    const { code } = req.body
    if (!code || typeof code !== "string") {
      res.status(400).json({ error: "code is required" })
      return
    }

    const explanation = await explainWorkflow(code)
    res.json({ explanation })
  } catch (err) {
    console.error("Explain error:", err)
    res.status(500).json({ error: String(err) })
  }
})

export default router
