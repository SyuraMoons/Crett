"use client"

import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-zinc-900 rounded-lg">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    ),
  }
)

interface CodeEditorProps {
  code: string
  onChange?: (code: string) => void
  readOnly?: boolean
}

export function CodeEditor({ code, onChange, readOnly = false }: CodeEditorProps) {
  const placeholder = `// Your generated CRE TypeScript workflow will appear here.
// Select a template or describe your workflow to get started.

import { CronCapability, handler, Runner, type Runtime } from "@chainlink/cre-sdk"
import { z } from "zod"

const configSchema = z.object({
  schedule: z.string(),
})
type Config = z.infer<typeof configSchema>

const onCronTrigger = (runtime: Runtime<Config>): string => {
  runtime.log("Workflow triggered")
  return "complete"
}

const initWorkflow = (config: Config) => {
  const cron = new CronCapability()
  return [handler(cron.trigger({ schedule: config.schedule }), onCronTrigger)]
}

export async function main() {
  const runner = await Runner.newRunner<Config>({ configSchema })
  await runner.run(initWorkflow)
}
main()`

  return (
    <MonacoEditor
      height="100%"
      language="typescript"
      theme="vs-dark"
      value={code || placeholder}
      onChange={(v) => onChange?.(v || "")}
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 13,
        fontFamily: "var(--font-geist-mono), 'Fira Code', monospace",
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        wordWrap: "on",
        padding: { top: 16, bottom: 16 },
        renderLineHighlight: "gutter",
        bracketPairColorization: { enabled: true },
        automaticLayout: true,
      }}
    />
  )
}
