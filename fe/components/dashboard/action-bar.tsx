"use client"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Play, Rocket, Loader2, Info, Bug, Database } from "lucide-react"

interface ActionBarProps {
  hasCode: boolean
  simulating: boolean
  deploying: boolean
  debugging: boolean
  txPending?: boolean
  showDebug: boolean
  showLogOnChain: boolean
  onSimulate: () => void
  onDeploy: () => void
  onDebug: () => void
  onLogOnChain: () => void
}

export function ActionBar({
  hasCode,
  simulating,
  deploying,
  debugging,
  txPending,
  showDebug,
  showLogOnChain,
  onSimulate,
  onDeploy,
  onDebug,
  onLogOnChain,
}: ActionBarProps) {
  const busy = simulating || deploying || debugging

  return (
    <TooltipProvider>
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        variant="outline"
        size="sm"
        onClick={onSimulate}
        disabled={!hasCode || busy}
        className="border-green-700 text-green-400 hover:bg-green-900/30 hover:border-green-500"
      >
        {simulating ? (
          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
        ) : (
          <Play className="w-3.5 h-3.5 mr-1.5" />
        )}
        Simulate
      </Button>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={onDeploy}
            disabled={!hasCode || busy}
            className="border-blue-700 text-blue-400 hover:bg-blue-900/30 hover:border-blue-500"
          >
            {deploying ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Rocket className="w-3.5 h-3.5 mr-1.5" />
            )}
            Deploy
          </Button>
        </TooltipTrigger>
        <TooltipContent className="bg-zinc-900 border-zinc-700 text-zinc-300 max-w-[240px] text-xs">
          <div className="flex gap-1.5">
            <Info className="w-3.5 h-3.5 shrink-0 text-blue-400 mt-0.5" />
            <span>Deploy requires CRE Early Access. Workflow code is ready — request access to deploy onchain.</span>
          </div>
        </TooltipContent>
      </Tooltip>

      {showDebug && (
        <Button
          variant="outline"
          size="sm"
          onClick={onDebug}
          disabled={busy}
          className="border-orange-700 text-orange-400 hover:bg-orange-900/30 hover:border-orange-500"
        >
          {debugging ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <Bug className="w-3.5 h-3.5 mr-1.5" />
          )}
          Debug
        </Button>
      )}

      {showLogOnChain && (
        <Button
          variant="outline"
          size="sm"
          onClick={onLogOnChain}
          disabled={txPending || busy}
          className="border-purple-700 text-purple-400 hover:bg-purple-900/30 hover:border-purple-500"
        >
          {txPending ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <Database className="w-3.5 h-3.5 mr-1.5" />
          )}
          Log to Chain
        </Button>
      )}
    </div>
    </TooltipProvider>
  )
}
