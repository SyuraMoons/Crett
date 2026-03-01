import { Router } from "express"

const router = Router()

let latest: { data: unknown; updatedAt: string } | null = null

router.post("/", (req, res) => {
  latest = { data: req.body, updatedAt: new Date().toISOString() }
  res.json({ ok: true })
})

router.get("/", (_, res) => {
  res.json(latest ?? { data: null, updatedAt: null })
})

export default router
