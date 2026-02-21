"use client"

import { useRouter } from "next/navigation"
import { useAccount } from "wagmi"
import { useConnectModal } from "@rainbow-me/rainbowkit"
import { Badge } from "@/components/ui/badge"
import { ArrowRight } from "lucide-react"

const SCENARIOS = [
  {
    label: "Price Alert",
    prompt: "Monitor ETH price every 5 min via CoinGecko, trigger webhook and AlertRegistry if below $2000",
    color: "bg-blue-500/10 border-blue-500/20 hover:border-blue-400/50",
    badge: "blue",
  },
  {
    label: "Treasury Monitor",
    prompt: "Check TreasuryMock USDC balance on Base Sepolia every 6h, alert Slack if USD value drops below $100k using CoinGecko price",
    color: "bg-green-500/10 border-green-500/20 hover:border-green-400/50",
    badge: "green",
  },
  {
    label: "Dominance Watch",
    prompt: "Track BTC market dominance hourly via CoinGecko, log to RiskLog contract if outside 45-55% range",
    color: "bg-yellow-500/10 border-yellow-500/20 hover:border-yellow-400/50",
    badge: "yellow",
  },
  {
    label: "Price Divergence",
    prompt: "Compare ETH price from CoinGecko vs Chainlink feed on Base Sepolia every 10 min, alert if divergence > 1%",
    color: "bg-purple-500/10 border-purple-500/20 hover:border-purple-400/50",
    badge: "purple",
  },
  {
    label: "DeFi TVL Drop",
    prompt: "Monitor total DeFi TVL from CoinGecko every 4h, send Discord webhook if TVL drops 15% in 24h",
    color: "bg-red-500/10 border-red-500/20 hover:border-red-400/50",
    badge: "red",
  },
]

export function DemoScenarios() {
  const router = useRouter()
  const { isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()

  const handleScenario = (prompt: string) => {
    if (isConnected) {
      sessionStorage.setItem("crett_prefill_prompt", prompt)
      router.push("/dashboard")
    } else {
      openConnectModal?.()
    }
  }

  return (
    <section className="py-16 px-4 max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-2xl md:text-3xl font-bold mb-3 text-white">
          Try a demo scenario
        </h2>
        <p className="text-zinc-500">Click any prompt to generate a real CRE workflow</p>
      </div>

      <div className="space-y-3">
        {SCENARIOS.map((s) => (
          <button
            key={s.label}
            onClick={() => handleScenario(s.prompt)}
            className={`w-full text-left rounded-xl border p-4 flex items-center gap-4 transition-all cursor-pointer group ${s.color}`}
          >
            <Badge className="shrink-0 text-xs" variant="outline">
              {s.label}
            </Badge>
            <span className="text-zinc-300 text-sm flex-1">{s.prompt}</span>
            <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 shrink-0 transition-colors" />
          </button>
        ))}
      </div>
    </section>
  )
}
