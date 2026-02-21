"use client"

export const dynamic = "force-dynamic"

import { useAccount } from "wagmi"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { WalletButton } from "@/components/wallet-button"
import { Zap } from "lucide-react"
import Link from "next/link"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isConnected } = useAccount()
  const router = useRouter()

  useEffect(() => {
    if (!isConnected) {
      router.replace("/")
    }
  }, [isConnected, router])

  if (!isConnected) return null

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <nav className="border-b border-zinc-900 bg-zinc-950/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-white hover:text-zinc-300 transition-colors">
            <Zap className="w-4 h-4 text-blue-400" />
            Crett
          </Link>
          <WalletButton />
        </div>
      </nav>
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  )
}
