import { Hero } from "@/components/landing/hero"
import { Features } from "@/components/landing/features"
import { DemoScenarios } from "@/components/landing/demo-scenarios"
import { WalletButton } from "@/components/wallet-button"
import { Zap } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-white">
            <Zap className="w-5 h-5 text-blue-400" />
            Crett
          </div>
          <WalletButton />
        </div>
      </nav>

      {/* Content */}
      <div className="pt-16">
        <Hero />
        <Features />
        <DemoScenarios />

        {/* Footer */}
        <footer className="border-t border-zinc-900 py-8 text-center text-zinc-600 text-sm">
          Built for Chainlink Convergence 2026 · CRE &amp; AI Track · Powered by Z.AI GLM-4.7 + CoinGecko Pro
        </footer>
      </div>
    </div>
  )
}
