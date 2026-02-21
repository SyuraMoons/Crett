"use client"

import { Clock, Code } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

export interface WorkflowEntry {
  id: string
  prompt: string
  code: string
  createdAt: Date
}

interface WorkflowHistoryProps {
  entries: WorkflowEntry[]
  onSelect: (entry: WorkflowEntry) => void
}

export function WorkflowHistory({ entries, onSelect }: WorkflowHistoryProps) {
  if (entries.length === 0) {
    return (
      <div className="text-xs text-zinc-600 py-3 text-center">
        Generated workflows will appear here
      </div>
    )
  }

  return (
    <ScrollArea className="max-h-[220px]">
      <div className="space-y-1.5">
        {entries.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onSelect(entry)}
            className="w-full text-left rounded-lg border border-zinc-800 bg-zinc-900/50 hover:border-zinc-600 hover:bg-zinc-800/50 p-2.5 transition-all group"
          >
            <div className="flex items-start gap-2">
              <Code className="w-3 h-3 text-blue-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs text-zinc-300 truncate leading-relaxed">{entry.prompt}</p>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-zinc-600">
                  <Clock className="w-2.5 h-2.5" />
                  {new Date(entry.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  )
}
