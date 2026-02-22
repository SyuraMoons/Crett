"use client"

import { Brain, Terminal, TrendingUp, Blocks, Zap, Shield } from "lucide-react"

const FEATURES = [
  {
    icon: Brain,
    title: "AI Workflow Generation",
    description: "Powered by Z.AI GLM-4.7. Describe your automation in plain English and get syntactically valid CRE TypeScript instantly.",
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20",
  },
  {
    icon: Terminal,
    title: "CRE CLI Simulation",
    description: "Runs your workflow through the actual Chainlink CRE CLI simulator. See real execution logs streaming live — no guesswork.",
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/20",
  },
  {
    icon: TrendingUp,
    title: "CoinGecko Pro Integration",
    description: "Rich market data baked into every workflow: ETH price, BTC dominance, DeFi TVL, 24h changes — not just a single price feed.",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10 border-yellow-500/20",
  },
  {
    icon: Blocks,
    title: "Base Sepolia Deploy",
    description: "AlertRegistry, TreasuryMock, and RiskLog contracts deployed on Base Sepolia. Workflows write onchain via CRE writeReport().",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
  },
  {
    icon: Zap,
    title: "30-Second Demo Flow",
    description: "Prompt → Generate → Simulate → Deploy. The full CRE workflow lifecycle in under a minute, with live streaming logs.",
    color: "text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/20",
  },
  {
    icon: Shield,
    title: "Production-Ready Code",
    description: "Zod config validation, consensus aggregation patterns, proper error handling, and runtime logging — every time, automatically.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10 border-cyan-500/20",
  },
]

export function Features() {
  return (
    <section id="features" className="py-24 px-4 max-w-6xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
          Everything you need to build CRE workflows
        </h2>
        <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
          Non-experts can now leverage Chainlink&apos;s distributed offchain+onchain orchestration without weeks of ramp-up.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className={`rounded-xl border p-6 ${f.bg} transition-all hover:scale-[1.01]`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${f.bg}`}>
              <f.icon className={`w-5 h-5 ${f.color}`} />
            </div>
            <h3 className="text-white font-semibold mb-2">{f.title}</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">{f.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
