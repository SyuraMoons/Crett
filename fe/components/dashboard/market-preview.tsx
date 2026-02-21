"use client"

import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react"

interface CoinData {
  usd: number
  usd_24h_change: number
  usd_market_cap: number
}

interface MarketData {
  ethereum: CoinData
  bitcoin: CoinData
  chainlink: CoinData
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

const COIN_LABELS: Record<string, { name: string; symbol: string }> = {
  ethereum: { name: "Ethereum", symbol: "ETH" },
  bitcoin: { name: "Bitcoin", symbol: "BTC" },
  chainlink: { name: "Chainlink", symbol: "LINK" },
}

function formatPrice(n: number): string {
  if (n >= 10000) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
  if (n >= 100) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
  return `$${n.toFixed(4)}`
}

function formatMarketCap(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  return `$${n.toLocaleString()}`
}

export function MarketPreview() {
  const [data, setData] = useState<MarketData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchData = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/market`)
      if (res.ok) {
        setData(await res.json())
        setLastUpdated(new Date())
      }
    } catch {
      // silently fail — market data is optional
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Live Market</span>
        <button
          onClick={fetchData}
          className="text-zinc-600 hover:text-zinc-400 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading && !data ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 rounded bg-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : data ? (
        <div className="space-y-2">
          {(Object.entries(data) as [string, CoinData][]).map(([id, coin]) => {
            const label = COIN_LABELS[id]
            const positive = coin.usd_24h_change >= 0
            return (
              <div key={id} className="flex items-center justify-between py-1">
                <div>
                  <div className="text-xs font-medium text-white">{label?.symbol}</div>
                  <div className="text-[10px] text-zinc-500">{formatMarketCap(coin.usd_market_cap)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono text-white">{formatPrice(coin.usd)}</div>
                  <div className={`text-[10px] flex items-center gap-0.5 justify-end ${positive ? "text-green-400" : "text-red-400"}`}>
                    {positive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                    {Math.abs(coin.usd_24h_change).toFixed(2)}%
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-xs text-zinc-600">Market data unavailable</p>
      )}

      {lastUpdated && (
        <div className="text-[10px] text-zinc-700 mt-2">
          Updated {lastUpdated.toLocaleTimeString()}
        </div>
      )}
    </div>
  )
}
