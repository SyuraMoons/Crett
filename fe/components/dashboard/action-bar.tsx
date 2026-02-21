"use client"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Play, Rocket, BookOpen, Loader2, Info } from "lucide-react"

interface ActionBarProps {
  hasCode: boolean
  simulating: boolean
  deploying: boolean
  explaining: boolean
  onSimulate: () => void
  onDeploy: () => void
  onExplain: () => void
}

export function ActionBar({
  hasCode,
  simulating,
  deploying,
  explaining,
  onSimulate,
  onDeploy,
  onExplain,
}: ActionBarProps) {
  const busy = simulating || deploying || explaining

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

      <Button
        variant="outline"
        size="sm"
        onClick={onExplain}
        disabled={!hasCode || busy}
        className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-500"
      >
        {explaining ? (
          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
        ) : (
          <BookOpen className="w-3.5 h-3.5 mr-1.5" />
        )}
        Explain
      </Button>
    </div>
    </TooltipProvider>
  )
}
