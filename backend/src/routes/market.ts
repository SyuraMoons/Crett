import { Router } from "express"

const router = Router()

router.get("/", async (req, res) => {
  try {
    const apiKey = process.env.COINGECKO_API_KEY
    if (!apiKey) {
      res.status(500).json({ error: "COINGECKO_API_KEY not configured" })
      return
    }

    const response = await fetch(
      "https://pro-api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin,chainlink&vs_currencies=usd&include_24hr_change=true&include_market_cap=true",
      {
        headers: { "x-cg-pro-api-key": apiKey },
      }
    )

    if (!response.ok) {
      res.status(response.status).json({ error: `CoinGecko API error: ${response.statusText}` })
      return
    }

    const data = await response.json()
    res.json(data)
  } catch (err) {
    console.error("Market route error:", err)
    res.status(500).json({ error: String(err) })
  }
})

router.get("/global", async (req, res) => {
  try {
    const apiKey = process.env.COINGECKO_API_KEY
    if (!apiKey) {
      res.status(500).json({ error: "COINGECKO_API_KEY not configured" })
      return
    }

    const response = await fetch("https://pro-api.coingecko.com/api/v3/global", {
      headers: { "x-cg-pro-api-key": apiKey },
    })

    if (!response.ok) {
      res.status(response.status).json({ error: `CoinGecko API error: ${response.statusText}` })
      return
    }

    res.json(await response.json())
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

export default router
