"use client"

import { useEffect, useRef, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CheckCircle, XCircle, Loader2, X } from "lucide-react"

export interface LogEntry {
  id: string
  type: "log" | "error" | "done" | "info" | "separator"
  message: string
  timestamp: Date
}

interface LogsPanelProps {
  logs: LogEntry[]
  running: boolean
  success?: boolean | null
  onClear: () => void
}

function classifyLine(msg: string): "setup" | "data" | "error" | "success" | "normal" {
  const lower = msg.toLowerCase()
  if (lower.includes("error") || lower.includes("failed") || lower.includes("exception")) return "error"
  if (lower.includes("simulation complete") || lower.includes("success")) return "success"
  if (msg.startsWith("[cre]") || msg.startsWith("[crett]")) return "setup"
  if (/\w+:\s+[\d$%.,-]+/.test(msg)) return "data"
  return "normal"
}

function parseDataPairs(logs: LogEntry[]): { key: string; value: string }[] {
  const pairs: { key: string; value: string }[] = []
  for (const log of logs) {
    if (log.type === "error" || log.type === "separator") continue
    const match = log.message.match(/^([A-Za-z][A-Za-z0-9 _/-]+?):\s+(.+)$/)
    if (match) {
      pairs.push({ key: match[1].trim(), value: match[2].trim() })
    }
  }
  const seen = new Map<string, string>()
  for (const p of pairs) seen.set(p.key, p.value)
  return Array.from(seen.entries()).map(([key, value]) => ({ key, value }))
}

export function LogsPanel({ logs, running, success, onClear }: LogsPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs])

  const summaryPairs = useMemo(() => {
    if (success == null || logs.length === 0) return []
    return parseDataPairs(logs).slice(0, 6)
  }, [logs, success])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Terminal</span>
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

        <div className="flex items-center gap-3">
          {summaryPairs.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {summaryPairs.map(({ key, value }) => (
                <span key={key} className="text-[10px] font-mono">
                  <span className="text-zinc-500">{key}: </span>
                  <span className="text-blue-300">{value}</span>
                </span>
              ))}
            </div>
          )}
          {logs.length > 0 && (
            <button
              onClick={onClear}
              className="flex items-center justify-center w-5 h-5 rounded text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              title="Clear terminal"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950">
        <div className="p-3 font-mono text-xs space-y-0.5 min-h-[80px]">
          {logs.length === 0 ? (
            <div className="text-zinc-700 select-none">
              Run simulate or deploy to see logs here…
            </div>
          ) : (
            logs.map((log) => {
              if (log.type === "separator") {
                return (
                  <div key={log.id} className="text-[10px] text-zinc-600 text-center py-1 select-none">
                    {log.message}
                  </div>
                )
              }

              const kind = classifyLine(log.message)
              const colorClass =
                log.type === "error" || kind === "error"
                  ? "text-red-400"
                  : kind === "success"
                  ? "text-green-400"
                  : kind === "setup"
                  ? "text-zinc-500"
                  : kind === "data"
                  ? "text-blue-300"
                  : log.type === "done"
                  ? log.message.includes("success")
                    ? "text-green-400"
                    : "text-zinc-500"
                  : "text-zinc-300"

              return (
                <div key={log.id} className={`leading-relaxed ${colorClass}`}>
                  <span className="text-zinc-700 mr-2 select-none">
                    {log.timestamp.toLocaleTimeString("en-US", {
                      hour12: false,
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                  {log.message}
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  )
}
