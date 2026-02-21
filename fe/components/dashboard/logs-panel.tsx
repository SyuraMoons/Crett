"use client"

import { useEffect, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

export interface LogEntry {
  id: string
  type: "log" | "error" | "done" | "info"
  message: string
  timestamp: Date
}

interface LogsPanelProps {
  logs: LogEntry[]
  running: boolean
  success?: boolean | null
}

export function LogsPanel({ logs, running, success }: LogsPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Execution Logs</span>
          {running && (
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px]">
              <Loader2 className="w-2.5 h-2.5 mr-1 animate-spin" />
              Running
            </Badge>
          )}
          {success === true && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">
              <CheckCircle className="w-2.5 h-2.5 mr-1" />
              Success
            </Badge>
          )}
          {success === false && (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">
              <XCircle className="w-2.5 h-2.5 mr-1" />
              Failed
            </Badge>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950">
        <div className="p-3 font-mono text-xs space-y-0.5 min-h-[120px]">
          {logs.length === 0 ? (
            <div className="text-zinc-700 select-none">
              Run simulate or deploy to see logs here…
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className={`leading-relaxed ${
                  log.type === "error"
                    ? "text-red-400"
                    : log.type === "done"
                    ? log.message.includes("success")
                      ? "text-green-400"
                      : "text-zinc-500"
                    : "text-zinc-300"
                }`}
              >
                <span className="text-zinc-700 mr-2 select-none">
                  {log.timestamp.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
                {log.message}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  )
}
