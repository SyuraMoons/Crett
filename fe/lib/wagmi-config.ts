"use client"

import { http, createConfig } from "wagmi"
import { baseSepolia } from "wagmi/chains"
import { getDefaultConfig } from "@rainbow-me/rainbowkit"

export const config = getDefaultConfig({
  appName: "Crett",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_ID || "demo",
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http(),
  },
})
