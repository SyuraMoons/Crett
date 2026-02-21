"use client"

import { useState, useEffect } from "react"
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { WagmiProvider } from "wagmi"
import { config } from "@/lib/wagmi-config"
import { Toaster } from "sonner"

import "@rainbow-me/rainbowkit/styles.css"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider
            theme={darkTheme({
              accentColor: "#3b82f6",
              accentColorForeground: "white",
              borderRadius: "medium",
            })}
          >
            {mounted ? children : null}
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
      <Toaster position="bottom-right" theme="dark" richColors />
    </>
  )
}
