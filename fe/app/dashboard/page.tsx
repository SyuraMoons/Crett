"use client"

import { useState, useEffect, useCallback } from "react"
import { v4 as uuidv4 } from "uuid"
import { toast } from "sonner"
import { PromptInput } from "@/components/dashboard/prompt-input"
import { CodeEditor } from "@/components/dashboard/code-editor"
import { ActionBar } from "@/components/dashboard/action-bar"
import { LogsPanel, LogEntry } from "@/components/dashboard/logs-panel"
import { WorkflowHistory, WorkflowEntry } from "@/components/dashboard/workflow-history"
import { MarketPreview } from "@/components/dashboard/market-preview"
import { ExplainDialog } from "@/components/dashboard/explain-dialog"
import { Separator } from "@/components/ui/separator"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"
const HISTORY_KEY = "crett_workflow_history"

function addLog(logs: LogEntry[], type: LogEntry["type"], message: string): LogEntry[] {
  return [...logs, { id: uuidv4(), type, message: message.trim(), timestamp: new Date() }]
}

export default function DashboardPage() {
  const [prompt, setPrompt] = useState("")
  const [code, setCode] = useState("")
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [history, setHistory] = useState<WorkflowEntry[]>([])
  const [explanation, setExplanation] = useState("")
  const [explainOpen, setExplainOpen] = useState(false)

  const [generating, setGenerating] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [explaining, setExplaining] = useState(false)
  const [simulateSuccess, setSimulateSuccess] = useState<boolean | null>(null)

  // Load history and prefill prompt from sessionStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY)
      if (stored) setHistory(JSON.parse(stored))
    } catch {}

    const prefill = sessionStorage.getItem("crett_prefill_prompt")
    if (prefill) {
      setPrompt(prefill)
      sessionStorage.removeItem("crett_prefill_prompt")
    }
  }, [])

  const saveHistory = useCallback((entry: WorkflowEntry) => {
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, 20)
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
      } catch {}
      return next
    })
  }, [])

  // Generate workflow
  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setGenerating(true)
    setCode("")
    setLogs([])
    setSimulateSuccess(null)

    try {
      const res = await fetch(`${BACKEND_URL}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      })

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Generation failed")
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === "chunk") {
              setCode((prev) => prev + event.code)
            } else if (event.type === "done" && event.success) {
              setCode(event.code)
              const entry: WorkflowEntry = {
                id: uuidv4(),
                prompt,
                code: event.code,
                createdAt: new Date(),
              }
              saveHistory(entry)
              toast.success("Workflow generated!")
            } else if (event.type === "error") {
              throw new Error(event.message)
            }
          } catch (parseErr) {
            // ignore JSON parse errors on partial lines
          }
        }
      }
    } catch (err) {
      toast.error(String(err))
    } finally {
      setGenerating(false)
    }
  }

  // Consume SSE stream (shared for simulate + deploy)
  const consumeStream = async (
    url: string,
    body: object,
    onDone: (success: boolean) => void
  ) => {
    setLogs([])
    setSimulateSuccess(null)

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (!res.ok || !res.body) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || "Stream failed")
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split("\n")
      buffer = lines.pop() || ""

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue
        try {
          const event = JSON.parse(line.slice(6))
          if (event.type === "log") {
            setLogs((prev) => addLog(prev, "log", event.message))
          } else if (event.type === "error") {
            setLogs((prev) => addLog(prev, "error", event.message))
          } else if (event.type === "done") {
            onDone(event.success)
          }
        } catch {}
      }
    }
  }

  // Simulate
  const handleSimulate = async () => {
    if (!code) return
    setSimulating(true)
    try {
      await consumeStream(
        `${BACKEND_URL}/simulate`,
        { code, config: { schedule: "*/30 * * * * *" } },
        (success) => {
          setSimulateSuccess(success)
          if (success) toast.success("Simulation passed!")
          else toast.error("Simulation failed — check logs")
        }
      )
    } catch (err) {
      toast.error(String(err))
      setSimulateSuccess(false)
    } finally {
      setSimulating(false)
    }
  }

  // Deploy
  const handleDeploy = async () => {
    if (!code) return
    setDeploying(true)
    try {
      await consumeStream(
        `${BACKEND_URL}/deploy`,
        { code, config: { schedule: "*/30 * * * * *" } },
        (success) => {
          setSimulateSuccess(success)
          if (success) toast.success("Workflow deployed!")
          else toast.info("Deploy requires CRE Early Access")
        }
      )
    } catch (err) {
      toast.error(String(err))
    } finally {
      setDeploying(false)
    }
  }

  // Explain
  const handleExplain = async () => {
    if (!code) return
    setExplaining(true)
    try {
      const res = await fetch(`${BACKEND_URL}/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setExplanation(data.explanation)
      setExplainOpen(true)
    } catch (err) {
      toast.error(String(err))
    } finally {
      setExplaining(false)
    }
  }

  return (
    <div className="h-[calc(100vh-56px)] flex overflow-hidden">
      {/* LEFT PANEL */}
      <div className="w-72 shrink-0 border-r border-zinc-900 flex flex-col p-4 gap-4 overflow-y-auto">
        <PromptInput
          value={prompt}
          onChange={setPrompt}
          onGenerate={handleGenerate}
          loading={generating}
        />

        <Separator className="bg-zinc-800" />

        <div>
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">History</div>
          <WorkflowHistory
            entries={history}
            onSelect={(e) => {
              setPrompt(e.prompt)
              setCode(e.code)
              setLogs([])
              setSimulateSuccess(null)
            }}
          />
        </div>

        <Separator className="bg-zinc-800" />

        <MarketPreview />
      </div>

      {/* CENTER + BOTTOM PANELS */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Editor */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-900">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Generated Workflow
            </span>
            {code && (
              <span className="text-[10px] text-zinc-600 font-mono">main.ts</span>
            )}
          </div>
          <div className="flex-1 min-h-0">
            <CodeEditor code={code} onChange={setCode} />
          </div>
        </div>

        {/* Bottom action bar + logs */}
        <div className="border-t border-zinc-900 flex flex-col" style={{ height: "220px" }}>
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-900">
            <ActionBar
              hasCode={!!code}
              simulating={simulating}
              deploying={deploying}
              explaining={explaining}
              onSimulate={handleSimulate}
              onDeploy={handleDeploy}
              onExplain={handleExplain}
            />
          </div>
          <div className="flex-1 min-h-0 px-4 py-2 overflow-hidden">
            <LogsPanel logs={logs} running={simulating || deploying} success={simulateSuccess} />
          </div>
        </div>
      </div>

      {/* Explain dialog */}
      <ExplainDialog
        open={explainOpen}
        onClose={() => setExplainOpen(false)}
        explanation={explanation}
      />
    </div>
  )
}
