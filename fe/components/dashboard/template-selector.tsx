"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Wand2, X } from "lucide-react"

type ParamType = "select" | "number" | "text"

interface Param {
  key: string
  label: string
  type: ParamType
  options?: string[]
  placeholder?: string
}

interface Template {
  id: string
  label: string
  color: string
  description: string
  params: Param[]
  buildPrompt: (p: Record<string, string>) => string
}

const TEMPLATES: Template[] = [
  {
    id: "price-alert",
    label: "Price Alert",
    color: "blue",
    description: "Trigger action when asset price crosses threshold",
    params: [
      { key: "asset",     label: "Asset",           type: "select",  options: ["ETH","BTC","LINK","SOL"] },
      { key: "threshold", label: "Price Threshold",  type: "number",  placeholder: "2000" },
      { key: "direction", label: "Direction",        type: "select",  options: ["below","above"] },
      { key: "action",    label: "Action",           type: "select",  options: ["webhook","AlertRegistry","RiskLog"] },
      { key: "schedule",  label: "Check every",      type: "select",  options: ["30s","5min","15min","1hr"] },
    ],
    buildPrompt: (p) =>
      `Monitor ${p.asset} price every ${p.schedule} via CoinGecko. If price goes ${p.direction} $${p.threshold}, ${p.action === "webhook" ? "send webhook alert" : `write to ${p.action} contract on Base Sepolia`}. Use consensusMedianAggregation for price.`,
  },
  {
    id: "treasury-monitor",
    label: "Treasury Monitor",
    color: "green",
    description: "Alert when treasury USDC balance drops below threshold",
    params: [
      { key: "address",   label: "Treasury Contract", type: "text",   placeholder: "0x..." },
      { key: "threshold", label: "Min USD Value",      type: "number", placeholder: "100000" },
      { key: "channel",   label: "Alert Channel",      type: "select", options: ["Slack webhook","Discord webhook","AlertRegistry"] },
      { key: "schedule",  label: "Check every",        type: "select", options: ["1hr","6hr","12hr","24hr"] },
    ],
    buildPrompt: (p) =>
      `Check TreasuryMock contract at ${p.address || "the treasury contract"} USDC balance on Base Sepolia every ${p.schedule} using EVMClient. Get USDC/USD price via CoinGecko. If total USD value drops below $${p.threshold}, send alert via ${p.channel}. Use consensusMedianAggregation for price.`,
  },
  {
    id: "btc-dominance",
    label: "BTC Dominance",
    color: "orange",
    description: "Monitor BTC market dominance, log when out of range",
    params: [
      { key: "minDom",   label: "Min Dominance %",  type: "number", placeholder: "45" },
      { key: "maxDom",   label: "Max Dominance %",  type: "number", placeholder: "55" },
      { key: "schedule", label: "Check every",      type: "select", options: ["30min","1hr","4hr","12hr"] },
      { key: "action",   label: "Action",           type: "select", options: ["RiskLog","webhook","log-only"] },
    ],
    buildPrompt: (p) =>
      `Track BTC market dominance every ${p.schedule} via CoinGecko global endpoint. If dominance goes outside ${p.minDom}%-${p.maxDom}% range, ${p.action === "log-only" ? "log the value with runtime.log" : `write to ${p.action} on Base Sepolia`}. Use consensusMedianAggregation for dominance.`,
  },
  {
    id: "price-divergence",
    label: "Price Divergence",
    color: "purple",
    description: "Alert when CoinGecko vs Chainlink feed diverge",
    params: [
      { key: "asset",     label: "Asset",              type: "select", options: ["ETH","BTC","LINK"] },
      { key: "threshold", label: "Divergence % alert", type: "number", placeholder: "1" },
      { key: "schedule",  label: "Check every",        type: "select", options: ["30s","5min","10min","30min"] },
      { key: "action",    label: "Action",             type: "select", options: ["AlertRegistry","RiskLog","webhook"] },
    ],
    buildPrompt: (p) =>
      `Compare ${p.asset} price from CoinGecko vs Chainlink feed on Base Sepolia every ${p.schedule}. Calculate divergence percentage. If divergence exceeds ${p.threshold}%, write alert to ${p.action} contract on Base Sepolia. Use consensusMedianAggregation for both prices.`,
  },
  {
    id: "defi-tvl",
    label: "DeFi TVL Drop",
    color: "red",
    description: "Alert when total DeFi TVL drops sharply",
    params: [
      { key: "dropPct",  label: "Drop % to alert",  type: "number", placeholder: "15" },
      { key: "window",   label: "Time window",       type: "select", options: ["1hr","4hr","24hr","48hr"] },
      { key: "schedule", label: "Check every",       type: "select", options: ["1hr","4hr","12hr"] },
      { key: "action",   label: "Alert via",         type: "select", options: ["Discord webhook","Slack webhook","RiskLog"] },
    ],
    buildPrompt: (p) =>
      `Monitor total DeFi TVL via CoinGecko DeFi endpoint every ${p.schedule}. If TVL drops more than ${p.dropPct}% within ${p.window}, send alert via ${p.action}. Use consensusMedianAggregation for TVL values.`,
  },
]

const BTN_IDLE: Record<string, string> = {
  blue:   "border-blue-800 text-blue-500 hover:bg-blue-900/20",
  green:  "border-green-800 text-green-500 hover:bg-green-900/20",
  orange: "border-orange-800 text-orange-500 hover:bg-orange-900/20",
  purple: "border-purple-800 text-purple-500 hover:bg-purple-900/20",
  red:    "border-red-800 text-red-500 hover:bg-red-900/20",
}

const BTN_ACTIVE: Record<string, string> = {
  blue:   "border-blue-500 bg-blue-900/20 text-blue-300",
  green:  "border-green-500 bg-green-900/20 text-green-300",
  orange: "border-orange-500 bg-orange-900/20 text-orange-300",
  purple: "border-purple-500 bg-purple-900/20 text-purple-300",
  red:    "border-red-500 bg-red-900/20 text-red-300",
}

const INPUT_CLS = "w-full h-6 px-1.5 rounded text-[11px] bg-zinc-950 border border-zinc-700 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"

interface TemplateSelectorProps {
  onGenerate: (prompt: string) => void
  loading: boolean
}

export function TemplateSelector({ onGenerate, loading }: TemplateSelectorProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [params, setParams] = useState<Record<string, string>>({})

  const activeTemplate = TEMPLATES.find((t) => t.id === activeId) ?? null

  function selectTemplate(t: Template) {
    if (activeId === t.id) {
      setActiveId(null)
      setParams({})
      return
    }
    const defaults: Record<string, string> = {}
    for (const p of t.params) {
      defaults[p.key] = p.options?.[0] ?? p.placeholder ?? ""
    }
    setActiveId(t.id)
    setParams(defaults)
  }

  function handleGenerate() {
    if (!activeTemplate) return
    const prompt = activeTemplate.buildPrompt(params)
    onGenerate(prompt)
    setActiveId(null)
    setParams({})
  }

  function set(key: string, value: string) {
    setParams((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Templates</div>
      <div className="grid grid-cols-2 gap-1.5">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => selectTemplate(t)}
            className={`text-[11px] px-2 py-1 rounded border text-left transition-colors ${
              activeId === t.id ? BTN_ACTIVE[t.color] : BTN_IDLE[t.color]
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTemplate && (
        <div className="mt-1 p-2.5 rounded-lg border border-zinc-800 bg-zinc-900/60 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-300">{activeTemplate.label}</span>
            <button
              onClick={() => { setActiveId(null); setParams({}) }}
              className="text-zinc-600 hover:text-zinc-400"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <p className="text-[10px] text-zinc-500">{activeTemplate.description}</p>

          {activeTemplate.params.map((param) => (
            <div key={param.key} className="flex flex-col gap-0.5">
              <label className="text-[10px] text-zinc-400">{param.label}</label>
              {param.type === "select" ? (
                <select
                  value={params[param.key] ?? ""}
                  onChange={(e) => set(param.key, e.target.value)}
                  className={INPUT_CLS}
                >
                  {param.options?.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={param.type === "number" ? "number" : "text"}
                  placeholder={param.placeholder}
                  value={params[param.key] ?? ""}
                  onChange={(e) => set(param.key, e.target.value)}
                  className={INPUT_CLS}
                />
              )}
            </div>
          ))}

          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={loading}
            className="w-full mt-1 bg-blue-600 hover:bg-blue-500 text-white h-7 text-[11px]"
          >
            <Wand2 className="w-3 h-3 mr-1.5" />
            Generate from template
          </Button>
        </div>
      )}
    </div>
  )
}
