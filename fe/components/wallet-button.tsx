"use client"

import { ConnectButton } from "@rainbow-me/rainbowkit"
import { Button } from "@/components/ui/button"

export function WalletButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openConnectModal, openAccountModal, openChainModal, mounted }) => {
        const connected = mounted && account && chain

        return (
          <div>
            {!connected ? (
              <Button onClick={openConnectModal} className="bg-blue-600 hover:bg-blue-700 text-white">
                Connect Wallet
              </Button>
            ) : chain?.unsupported ? (
              <Button onClick={openChainModal} variant="destructive">
                Wrong Network
              </Button>
            ) : (
              <Button
                onClick={openAccountModal}
                variant="outline"
                className="border-zinc-700 text-zinc-200 hover:bg-zinc-800"
              >
                {account.displayName}
              </Button>
            )}
          </div>
        )
      }}
    </ConnectButton.Custom>
  )
}
