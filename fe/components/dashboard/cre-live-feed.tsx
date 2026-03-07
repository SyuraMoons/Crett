"use client"

import { useState, useEffect } from "react"
import { Activity, RefreshCw } from "lucide-react"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

interface CREPayload {
  eth: number | null
  btc: number | null
  link: number | null
  ethOnchain: number | null
  generated: boolean
  network: string
}

interface CREResponse {
  data: CREPayload | null
  updatedAt: string | null
}

function fmt(n: number | null) {
  if (n === null) return "—"
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function CreLiveFeed() {
  const [state, setState] = useState<CREResponse>({ data: null, updatedAt: null })
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const fetchData = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/cre-data`)
      if (res.ok) {
        const json = await res.json()
        setState(json)
        setLastRefresh(new Date())
      }
    } catch {
      // backend not yet running
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10_000)
    return () => clearInterval(interval)
  }, [])

  const formatTime = (iso: string | null) => {
    if (!iso) return null
    return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  }

  const d = state.data

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 shrink-0">
        <Activity className="w-3.5 h-3.5 text-blue-400" />
        <span className="text-xs font-semibold text-zinc-300">CRE Live Feed</span>
        <span className="ml-auto text-[10px] text-zinc-600">Base Sepolia</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Connecting...
          </div>
        ) : d === null ? (
          <div className="space-y-2">
            <div className="text-xs text-zinc-500 leading-relaxed">
              Waiting for CRE workflow...
            </div>
            <div className="text-[10px] text-zinc-700 leading-relaxed">
              Run the simulator to populate this panel.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {d.generated && (
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400 bg-emerald-950/40 rounded px-2 py-1">
                <span>✓</span>
                <span>AI Generated Workflow</span>
              </div>
            )}
            <div className="space-y-1">
              <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Prices (CoinGecko)</div>
              <div className="grid grid-cols-2 gap-x-3 text-xs">
                <div className="text-zinc-500">ETH / USD</div>
                <div className="text-zinc-200 font-mono">{fmt(d.eth)}</div>
                <div className="text-zinc-500">BTC / USD</div>
                <div className="text-zinc-200 font-mono">{fmt(d.btc)}</div>
                <div className="text-zinc-500">LINK / USD</div>
                <div className="text-zinc-200 font-mono">{fmt(d.link)}</div>
              </div>
            </div>
            {d.ethOnchain !== null && (
              <div className="space-y-1">
                <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Chainlink Onchain</div>
                <div className="grid grid-cols-2 gap-x-3 text-xs">
                  <div className="text-zinc-500">ETH / USD</div>
                  <div className="text-blue-300 font-mono">{fmt(d.ethOnchain)}</div>
                </div>
              </div>
            )}
            <div className="text-[10px] text-zinc-700">{d.network}</div>
          </div>
        )}
      </div>

      {(state.updatedAt || lastRefresh) && (
        <div className="shrink-0 px-4 py-2 border-t border-zinc-800 flex items-center justify-between">
          <span className="text-[10px] text-zinc-700">
            Last run: {formatTime(state.updatedAt) ?? "—"}
          </span>
          <span className="text-[10px] text-zinc-700">
            Polled: {lastRefresh ? formatTime(lastRefresh.toISOString()) : "—"}
          </span>
        </div>
      )}
    </div>
  )
}
