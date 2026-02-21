"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAccount } from "wagmi"
import { useConnectModal } from "@rainbow-me/rainbowkit"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Zap } from "lucide-react"

const DEMO_PROMPTS = [
  "Monitor ETH price every 5 min via CoinGecko, trigger webhook if below $2000",
  "Check treasury USDC balance on Base Sepolia every 6h, alert Slack if low",
  "Track BTC dominance hourly, log to RiskLog contract if outside 45-55% range",
  "Compare ETH price from CoinGecko vs Chainlink feed every 10 min, alert if divergence > 1%",
  "Monitor DeFi TVL from CoinGecko every 4h, send Discord alert if TVL drops 15%",
]

export function Hero() {
  const [promptIndex, setPromptIndex] = useState(0)
  const [displayText, setDisplayText] = useState("")
  const [charIndex, setCharIndex] = useState(0)
  const router = useRouter()
  const { isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()

  useEffect(() => {
    const target = DEMO_PROMPTS[promptIndex]
    if (charIndex < target.length) {
      const timeout = setTimeout(() => {
        setDisplayText(target.slice(0, charIndex + 1))
        setCharIndex((c) => c + 1)
      }, 30)
      return () => clearTimeout(timeout)
    } else {
      const timeout = setTimeout(() => {
        setPromptIndex((i) => (i + 1) % DEMO_PROMPTS.length)
        setCharIndex(0)
        setDisplayText("")
      }, 2500)
      return () => clearTimeout(timeout)
    }
  }, [charIndex, promptIndex])

  const handleGetStarted = () => {
    if (isConnected) {
      router.push("/dashboard")
    } else {
      openConnectModal?.()
    }
  }

  return (
    <section className="relative flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <Badge className="mb-6 bg-blue-600/20 text-blue-400 border-blue-500/30 hover:bg-blue-600/20">
        <Zap className="w-3 h-3 mr-1" />
        Chainlink Convergence 2026 — CRE &amp; AI Track
      </Badge>

      <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-br from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
        Crett
      </h1>

      <p className="text-xl md:text-2xl text-zinc-400 mb-4 max-w-2xl">
        Describe any blockchain automation.
        <br />
        <span className="text-white font-semibold">Get a deploy-ready CRE workflow instantly.</span>
      </p>

      {/* Animated prompt display */}
      <div className="w-full max-w-2xl mx-auto mb-10 mt-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 backdrop-blur p-4 text-left font-mono text-sm text-zinc-300 min-h-[56px] flex items-center">
          <span className="text-blue-400 mr-2">$</span>
          <span>{displayText}</span>
          <span className="ml-0.5 animate-pulse text-blue-400">|</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <Button
          size="lg"
          onClick={handleGetStarted}
          className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-6 text-lg rounded-xl"
        >
          Get Started
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 px-8 py-6 text-lg rounded-xl"
          onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
        >
          See How It Works
        </Button>
      </div>
    </section>
  )
}
