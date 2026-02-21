"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Wand2, Loader2 } from "lucide-react"

const TEMPLATE_CHIPS = [
  { label: "Price Alert", prompt: "Monitor ETH price every 5 min via CoinGecko, trigger webhook and AlertRegistry if below $2000" },
  { label: "Treasury Monitor", prompt: "Check TreasuryMock USDC balance on Base Sepolia every 6h, alert Slack if USD value drops below $100k using CoinGecko price" },
  { label: "BTC Dominance", prompt: "Track BTC market dominance hourly via CoinGecko, log to RiskLog contract if outside 45-55% range" },
  { label: "Price Divergence", prompt: "Compare ETH price from CoinGecko vs Chainlink feed on Base Sepolia every 10 min, alert if divergence > 1%" },
  { label: "DeFi TVL", prompt: "Monitor total DeFi TVL from CoinGecko every 4h, send Discord webhook if TVL drops 15% in 24h" },
]

interface PromptInputProps {
  value: string
  onChange: (v: string) => void
  onGenerate: () => void
  loading: boolean
}

export function PromptInput({ value, onChange, onGenerate, loading }: PromptInputProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Workflow Prompt</div>

      <div className="flex flex-wrap gap-1.5">
        {TEMPLATE_CHIPS.map((chip) => (
          <button
            key={chip.label}
            onClick={() => onChange(chip.prompt)}
            className="text-[11px] px-2 py-0.5 rounded-full border border-zinc-700 text-zinc-400 hover:border-blue-500 hover:text-blue-400 transition-colors"
          >
            {chip.label}
          </button>
        ))}
      </div>

      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Describe your CRE workflow in plain English…"
        className="min-h-[120px] bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 resize-none text-sm focus:border-blue-500 transition-colors"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onGenerate()
        }}
      />

      <Button
        onClick={onGenerate}
        disabled={loading || !value.trim()}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating…
          </>
        ) : (
          <>
            <Wand2 className="w-4 h-4 mr-2" />
            Generate Workflow
          </>
        )}
      </Button>

      <p className="text-[11px] text-zinc-600 text-center">⌘+Enter to generate</p>
    </div>
  )
}
