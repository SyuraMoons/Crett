import { Router } from "express"
import { generateWorkflow } from "../lib/llm"

const router = Router()

router.post("/", async (req, res) => {
  try {
    const { prompt } = req.body
    if (!prompt || typeof prompt !== "string") {
      res.status(400).json({ error: "prompt is required" })
      return
    }

    const code = await generateWorkflow(prompt)
    res.json({ code })
  } catch (err) {
    console.error("Generate error:", err)
    res.status(500).json({ error: String(err) })
  }
})

export default router
