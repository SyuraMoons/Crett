"use client"

import { useState } from "react"
import { X, CheckCircle, AlertTriangle, Loader2, Send } from "lucide-react"
import type { WorkflowAnalysis, RiskFlag } from "@/lib/analysis-types"

type ChatMessage = { role: "user" | "assistant"; content: string }

interface AnalysisSidebarProps {
  analysis: WorkflowAnalysis | null
  analyzing: boolean
  onClose: () => void
  chatMessages: ChatMessage[]
  chatLoading: boolean
  onChat: (message: string) => void
}

function scoreColor(score: number): string {
  if (score < 40) return "text-red-400"
  if (score < 60) return "text-yellow-400"
  if (score < 80) return "text-blue-400"
  return "text-green-400"
}

function scoreBg(score: number): string {
  if (score < 40) return "border-red-700 bg-red-950/30"
  if (score < 60) return "border-yellow-700 bg-yellow-950/30"
  if (score < 80) return "border-blue-700 bg-blue-950/30"
  return "border-green-700 bg-green-950/30"
}

function severityColor(severity: RiskFlag["severity"]): string {
  switch (severity) {
    case "critical": return "bg-red-900/40 text-red-400 border border-red-700"
    case "high": return "bg-orange-900/40 text-orange-400 border border-orange-700"
    case "medium": return "bg-yellow-900/40 text-yellow-400 border border-yellow-700"
    case "low": return "bg-zinc-800 text-zinc-400 border border-zinc-700"
  }
}

function ScoreBar({ score }: { score: number }) {
  const color = score < 40 ? "bg-red-500" : score < 60 ? "bg-yellow-500" : score < 80 ? "bg-blue-500" : "bg-green-500"
  return (
    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-1">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
    </div>
  )
}

const subScoreEntries = [
  { label: "CRE Compliance", key: "cre_compliance" as const },
  { label: "Code Quality", key: "code_quality" as const },
  { label: "Runtime Safety", key: "runtime_safety" as const },
]

function ChatInput({ onSend, disabled }: { onSend: (msg: string) => void; disabled: boolean }) {
  const [value, setValue] = useState("")
  const send = () => {
    const msg = value.trim()
    if (!msg || disabled) return
    onSend(msg)
    setValue("")
  }
  return (
    <div className="flex gap-1.5">
      <input
        className="flex-1 text-xs bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-zinc-200 placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none"
        placeholder="Ask about this workflow…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && send()}
        disabled={disabled}
      />
      <button
        onClick={send}
        disabled={disabled || !value.trim()}
        className="shrink-0 px-2 py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition-colors"
      >
        <Send className="w-3 h-3" />
      </button>
    </div>
  )
}

export function AnalysisSidebar({
  analysis,
  analyzing,
  onClose,
  chatMessages,
  chatLoading,
  onChat,
}: AnalysisSidebarProps) {
  return (
    <div className="w-80 shrink-0 h-full flex flex-col border-l border-zinc-800 bg-zinc-950">
      {/* Header */}
      <div className="h-9 flex items-center justify-between px-3 border-b border-zinc-800 shrink-0">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">AI Analysis</span>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {analyzing ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-zinc-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-xs">Analyzing workflow...</span>
          </div>
        ) : analysis ? (
          <div className="space-y-5">
            {/* Score + verdict */}
            <div className="flex items-start gap-3">
              <div className={`shrink-0 w-16 h-16 rounded-xl border-2 flex flex-col items-center justify-center ${scoreBg(analysis.overall_score)}`}>
                <span className={`text-2xl font-bold leading-none ${scoreColor(analysis.overall_score)}`}>
                  {analysis.overall_score}
                </span>
                <span className="text-[10px] text-zinc-500 mt-0.5">/ 100</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs italic text-zinc-300 leading-snug">{analysis.one_line_verdict}</p>
                <div className="mt-2">
                  {analysis.deploy_ready ? (
                    <div className="flex items-center gap-1.5 text-green-400 text-xs">
                      <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-medium">Ready to simulate</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-orange-400 text-xs">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-medium">Needs review</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sub-score cards (vertical in sidebar) */}
            <div className="space-y-2">
              {subScoreEntries.map(({ label, key }) => {
                const sub = analysis.sub_scores[key]
                return (
                  <div key={key} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide">{label}</span>
                      <span className={`text-sm font-bold ${scoreColor(sub.score)}`}>{sub.score}</span>
                    </div>
                    <ScoreBar score={sub.score} />
                    <p className="text-[11px] text-zinc-500 mt-2 leading-relaxed">{sub.reasoning}</p>
                  </div>
                )
              })}
            </div>

            {/* Risk flags */}
            {analysis.risk_flags.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Risk Flags</div>
                <div className="space-y-1.5">
                  {analysis.risk_flags.map((flag, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${severityColor(flag.severity)}`}>
                        {flag.severity.toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <span className="text-xs font-medium text-zinc-300">{flag.label}</span>
                        <span className="text-xs text-zinc-500 ml-1.5">{flag.detail}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Improvements */}
            {analysis.improvements.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Improvements</div>
                <ol className="space-y-1.5">
                  {analysis.improvements.map((item, i) => (
                    <li key={i} className="flex gap-2 text-xs text-zinc-400">
                      <span className="shrink-0 text-zinc-600 font-mono">{i + 1}.</span>
                      <span className="flex-1">{item}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Chat */}
            <div className="border-t border-zinc-800 pt-3">
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Ask AI
              </div>

              {/* Message list */}
              <div className="space-y-2 max-h-48 overflow-y-auto mb-2 pr-1">
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`text-xs rounded-lg px-2.5 py-1.5 leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-blue-900/30 text-blue-200 ml-4"
                        : "bg-zinc-800 text-zinc-300 mr-4"
                    }`}
                  >
                    {msg.content.includes("```")
                      ? msg.content.replace(/```[\s\S]*?```/g, "[code applied to editor]")
                      : msg.content}
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
                    <Loader2 className="w-3 h-3 animate-spin" /> Thinking…
                  </div>
                )}
              </div>

              <ChatInput onSend={onChat} disabled={chatLoading} />
            </div>
          </div>
        ) : (
          <p className="text-xs text-zinc-500 text-center mt-10">
            Click Analyze to review your workflow
          </p>
        )}
      </div>
    </div>
  )
}
