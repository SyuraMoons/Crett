"use client"

import { useState, useEffect, useCallback } from "react"
import { v4 as uuidv4 } from "uuid"
import { toast } from "sonner"
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { FolderOpen, Wand2, BarChart2, Activity, Bot } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CodeEditor } from "@/components/dashboard/code-editor"
import { ActionBar } from "@/components/dashboard/action-bar"
import { LogsPanel, LogEntry } from "@/components/dashboard/logs-panel"
import { PromptInput } from "@/components/dashboard/prompt-input"
import { MarketPreview } from "@/components/dashboard/market-preview"
import { EditorTabs } from "@/components/dashboard/editor-tabs"
import { FileExplorer } from "@/components/dashboard/file-explorer"
import { ExplainDialog } from "@/components/dashboard/explain-dialog"
import { AgentPanel } from "@/components/dashboard/agent-panel"
import { CreLiveFeed } from "@/components/dashboard/cre-live-feed"
import { RISK_LOG_ADDRESS, RISK_LOG_ABI } from "@/lib/contracts"
import type { WorkflowAnalysis } from "@/lib/analysis-types"
import type { WorkflowFile } from "@/lib/workflow-types"
import { STARTER_TEMPLATES } from "@/lib/starter-templates"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"
const FILES_KEY = "crett_workflow_files"

type SidePanel = "files" | "generate" | "market" | "cre" | "agent"
type ChatMessage = { role: "user" | "assistant"; content: string }

function addLog(logs: LogEntry[], type: LogEntry["type"], message: string): LogEntry[] {
  return [...logs, { id: uuidv4(), type, message: message.trim(), timestamp: new Date() }]
}

function appendSeparator(logs: LogEntry[], label: string): LogEntry[] {
  return [
    ...logs,
    {
      id: uuidv4(),
      type: "separator",
      message: `── ${label} · ${new Date().toLocaleTimeString()} ──`,
      timestamp: new Date(),
    },
  ]
}

export default function DashboardPage() {
  // File state
  const [files, setFiles] = useState<WorkflowFile[]>([])
  const [openTabs, setOpenTabs] = useState<string[]>([])
  const [activeFileId, setActiveFileId] = useState<string | null>(null)

  // Panel state
  const [activePanel, setActivePanel] = useState<SidePanel | null>("files")

  // Other state
  const [prompt, setPrompt] = useState("")
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [explanation, setExplanation] = useState("")
  const [explainOpen, setExplainOpen] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<WorkflowAnalysis | null>(null)
  const [showAgentPanel, setShowAgentPanel] = useState(false)

  const [generating, setGenerating] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [debugging, setDebugging] = useState(false)
  const [simulateSuccess, setSimulateSuccess] = useState<boolean | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatLoading, setChatLoading] = useState(false)

  const { writeContract, data: txHash } = useWriteContract()
  const { isLoading: txPending } = useWaitForTransactionReceipt({ hash: txHash })

  // Derive current code from active file
  const activeFile = files.find((f) => f.id === activeFileId)
  const code = activeFile?.code ?? ""

  // Load files from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FILES_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        const loaded = parsed.map((f: WorkflowFile & { createdAt: string; updatedAt: string }) => ({
          ...f,
          createdAt: new Date(f.createdAt),
          updatedAt: new Date(f.updatedAt),
        }))
        setFiles(loaded)
      } else {
        // First open — pre-load the Hello World starter
        const starters: WorkflowFile[] = STARTER_TEMPLATES.map((t) => ({
          id: t.id,
          name: t.name,
          code: t.code,
          createdAt: new Date(),
          updatedAt: new Date(),
        }))
        setFiles(starters)
        try { localStorage.setItem(FILES_KEY, JSON.stringify(starters)) } catch {}
        setActiveFileId(STARTER_TEMPLATES[0].id)
        setOpenTabs([STARTER_TEMPLATES[0].id])
      }
    } catch {}

    const prefill = sessionStorage.getItem("crett_prefill_prompt")
    if (prefill) {
      setPrompt(prefill)
      sessionStorage.removeItem("crett_prefill_prompt")
    }
  }, [])

  // ── File CRUD ──────────────────────────────────────────────────────────────

  const persistFiles = (next: WorkflowFile[]) => {
    try {
      localStorage.setItem(FILES_KEY, JSON.stringify(next))
    } catch {}
  }

  const createFile = useCallback((name: string, fileCode: string): string => {
    const file: WorkflowFile = {
      id: uuidv4(),
      name,
      code: fileCode,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setFiles((prev) => {
      const next = [...prev, file]
      persistFiles(next)
      return next
    })
    setOpenTabs((prev) => (prev.includes(file.id) ? prev : [...prev, file.id]))
    setActiveFileId(file.id)
    return file.id
  }, [])

  const updateFile = useCallback((id: string, fileCode: string) => {
    setFiles((prev) => {
      const next = prev.map((f) => (f.id === id ? { ...f, code: fileCode, updatedAt: new Date() } : f))
      persistFiles(next)
      return next
    })
  }, [])

  const deleteFile = useCallback((id: string) => {
    setFiles((prev) => {
      const next = prev.filter((f) => f.id !== id)
      persistFiles(next)
      return next
    })
    setOpenTabs((prev) => {
      const idx = prev.indexOf(id)
      const next = prev.filter((t) => t !== id)
      setActiveFileId((active) => {
        if (active !== id) return active
        if (next.length === 0) return null
        return next[Math.max(0, idx - 1)] ?? next[0]
      })
      return next
    })
  }, [])

  const renameFile = useCallback((id: string, name: string) => {
    setFiles((prev) => {
      const next = prev.map((f) => (f.id === id ? { ...f, name, updatedAt: new Date() } : f))
      persistFiles(next)
      return next
    })
  }, [])

  const openTab = useCallback((id: string) => {
    setOpenTabs((prev) => (prev.includes(id) ? prev : [...prev, id]))
    setActiveFileId(id)
  }, [])

  const closeTab = useCallback((id: string) => {
    setOpenTabs((prev) => {
      const idx = prev.indexOf(id)
      const next = prev.filter((t) => t !== id)
      setActiveFileId((active) => {
        if (active !== id) return active
        if (next.length === 0) return null
        return next[Math.max(0, idx - 1)] ?? null
      })
      return next
    })
  }, [])

  const newFile = useCallback(() => {
    setFiles((prev) => {
      const n = prev.length + 1
      const file: WorkflowFile = {
        id: uuidv4(),
        name: `workflow-${n}.ts`,
        code: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const next = [...prev, file]
      persistFiles(next)
      setOpenTabs((tabs) => (tabs.includes(file.id) ? tabs : [...tabs, file.id]))
      setActiveFileId(file.id)
      return next
    })
  }, [])

  const handleSidebarClick = (id: SidePanel) => {
    if (id === "agent") { setShowAgentPanel((prev) => !prev); return }
    setActivePanel((prev) => (prev === id ? null : id))
  }

  // ── Generate workflow ──────────────────────────────────────────────────────

  const handleGenerate = async (templatePrompt?: string) => {
    const activePrompt = templatePrompt ?? prompt
    if (templatePrompt) setPrompt(templatePrompt)
    if (!activePrompt.trim()) return
    setGenerating(true)
    setSimulateSuccess(null)

    try {
      const res = await fetch(`${BACKEND_URL}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: activePrompt }),
      })

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Generation failed")
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let streaming = ""

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
              streaming += event.code
              // Update active file while streaming (if already created)
              setActiveFileId((current) => {
                if (current) updateFile(current, streaming)
                return current
              })
            } else if (event.type === "done" && event.success) {
              // Create a new file with the generated code
              setFiles((prev) => {
                const n = prev.length + 1
                const file: WorkflowFile = {
                  id: uuidv4(),
                  name: `workflow-${n}.ts`,
                  code: event.code,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                }
                const next = [...prev, file]
                persistFiles(next)
                setOpenTabs((tabs) => (tabs.includes(file.id) ? tabs : [...tabs, file.id]))
                setActiveFileId(file.id)
                return next
              })
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

  // ── SSE stream (simulate + deploy) ────────────────────────────────────────

  const consumeStream = async (
    url: string,
    body: object,
    label: string,
    onDone: (success: boolean) => void
  ) => {
    setLogs((prev) => appendSeparator(prev, label))
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

  const handleSimulate = async () => {
    if (!code) return
    setSimulating(true)
    try {
      await consumeStream(
        `${BACKEND_URL}/simulate`,
        { code, config: { schedule: "*/30 * * * * *" } },
        "Simulate",
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

  const handleDeploy = async () => {
    if (!code) return
    setDeploying(true)
    try {
      await consumeStream(
        `${BACKEND_URL}/deploy`,
        { code, config: { schedule: "*/30 * * * * *" } },
        "Deploy",
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

  const handleDebug = async () => {
    if (!code) return
    setDebugging(true)
    try {
      const res = await fetch(`${BACKEND_URL}/debug`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, logs: logs.map((l) => l.message).join("\n") }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setExplanation(data.diagnosis)
      setExplainOpen(true)
    } catch (err) {
      toast.error(String(err))
    } finally {
      setDebugging(false)
    }
  }

  const handleLogOnChain = () => {
    try {
      writeContract({
        address: RISK_LOG_ADDRESS,
        abi: RISK_LOG_ABI,
        functionName: "logRisk",
        args: ["simulation", 3, `Workflow simulated: ${prompt.slice(0, 100)}`],
      })
    } catch (err) {
      toast.error(String(err))
    }
  }

  const handleChat = async (message: string) => {
    const userMsg: ChatMessage = { role: "user", content: message }
    const next = [...chatMessages, userMsg]
    setChatMessages(next)
    setChatLoading(true)
    try {
      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, messages: next }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const reply = data.message as string
      setChatMessages([...next, { role: "assistant", content: reply }])
      const codeMatch = reply.match(/```(?:typescript|ts)?\n([\s\S]+?)\n```/)
      if (codeMatch && activeFileId) {
        updateFile(activeFileId, codeMatch[1].trim())
        toast.success("Code updated by assistant!")
      }
    } catch (err) {
      toast.error(String(err))
    } finally {
      setChatLoading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!code) return
    setShowAgentPanel(true)
    setAnalyzing(true)
    setChatMessages([])
    try {
      const res = await fetch(`${BACKEND_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAnalysisResult(data.analysis)
    } catch (err) {
      toast.error(String(err))
    } finally {
      setAnalyzing(false)
    }
  }

  // ── Sidebar icon config ────────────────────────────────────────────────────

  const sidebarIcons: { id: SidePanel; icon: React.ElementType; label: string }[] = [
    { id: "files", icon: FolderOpen, label: "Explorer" },
    { id: "generate", icon: Wand2, label: "AI Generate" },
    { id: "market", icon: BarChart2, label: "Market" },
    { id: "cre", icon: Activity, label: "CRE Live Feed" },
    { id: "agent", icon: Bot, label: "Agent" },
  ]

  return (
    <div className="h-[calc(100vh-56px)] flex overflow-hidden">
      {/* Icon sidebar (48px) */}
      <TooltipProvider delayDuration={300}>
        <div className="w-12 shrink-0 flex flex-col items-center pt-2 gap-1 border-r border-zinc-900 bg-zinc-950">
          {sidebarIcons.map(({ id, icon: Icon, label }) => {
            const isActive = id === "agent" ? showAgentPanel : activePanel === id
            return (
              <Tooltip key={id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleSidebarClick(id)}
                    className={`w-9 h-9 rounded flex items-center justify-center transition-colors ${
                      isActive
                        ? "bg-zinc-800 text-zinc-100"
                        : "text-zinc-600 hover:text-zinc-300 hover:bg-zinc-900"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-zinc-900 border-zinc-700 text-zinc-300 text-xs">
                  {label}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </TooltipProvider>

      {/* Expandable side panel (260px) */}
      {activePanel && (
        <div className="w-64 shrink-0 border-r border-zinc-900 flex flex-col overflow-hidden">
          {activePanel === "files" && (
            <FileExplorer
              files={files}
              activeFileId={activeFileId}
              onOpen={openTab}
              onDelete={deleteFile}
              onNew={newFile}
              onRename={renameFile}
            />
          )}
          {activePanel === "generate" && (
            <div className="flex flex-col h-full overflow-y-auto p-4">
              <PromptInput
                value={prompt}
                onChange={setPrompt}
                onGenerate={handleGenerate}
                loading={generating}
              />
            </div>
          )}
          {activePanel === "market" && (
            <div className="flex flex-col h-full overflow-y-auto p-4">
              <MarketPreview />
            </div>
          )}
          {activePanel === "cre" && <CreLiveFeed />}
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Editor tabs */}
        <EditorTabs
          files={files}
          openTabs={openTabs}
          activeFileId={activeFileId}
          onSelect={openTab}
          onClose={closeTab}
          onNew={newFile}
        />

        {/* Monaco editor */}
        <div className="flex-1 min-h-0">
          <CodeEditor
            code={code}
            onChange={(c) => {
              if (activeFileId) updateFile(activeFileId, c)
            }}
          />
        </div>

        {/* Action bar + terminal */}
        <div className="border-t border-zinc-900 flex flex-col" style={{ height: "220px" }}>
          <div className="h-9 flex items-center px-3 border-b border-zinc-900 shrink-0">
            <ActionBar
              hasCode={!!code}
              simulating={simulating}
              deploying={deploying}
              debugging={debugging}
              txPending={txPending}
              showDebug={simulateSuccess === false}
              showLogOnChain={simulateSuccess === true}
              onSimulate={handleSimulate}
              onDeploy={handleDeploy}
              onDebug={handleDebug}
              onLogOnChain={handleLogOnChain}
            />
          </div>
          <div className="flex-1 min-h-0 overflow-hidden px-3 py-2">
            <LogsPanel
              logs={logs}
              running={simulating || deploying}
              success={simulateSuccess}
              onClear={() => setLogs([])}
            />
          </div>
        </div>
      </div>

      {showAgentPanel && (
        <AgentPanel
          hasCode={!!code}
          analysis={analysisResult}
          analyzing={analyzing}
          onAnalyze={handleAnalyze}
          chatMessages={chatMessages}
          chatLoading={chatLoading}
          onChat={handleChat}
          onClose={() => setShowAgentPanel(false)}
        />
      )}

      <ExplainDialog
        open={explainOpen}
        onClose={() => setExplainOpen(false)}
        explanation={explanation}
      />
    </div>
  )
}
