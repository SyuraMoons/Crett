"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Wand2, Loader2 } from "lucide-react"
import { TemplateSelector } from "./template-selector"

interface PromptInputProps {
  value: string
  onChange: (v: string) => void
  onGenerate: (prompt?: string) => void
  loading: boolean
}

export function PromptInput({ value, onChange, onGenerate, loading }: PromptInputProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Workflow Prompt</div>

      <TemplateSelector
        onGenerate={(prompt) => onGenerate(prompt)}
        loading={loading}
      />

      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Or describe your CRE workflow in plain English…"
        className="min-h-[100px] bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 resize-none text-sm focus:border-blue-500 transition-colors"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onGenerate()
        }}
      />

      <Button
        onClick={() => onGenerate()}
        disabled={loading || !value.trim()}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating…
          </>
        ) : (
          <>
            <Wand2 className="w-4 h-4 mr-2" />
            Generate Workflow
          </>
        )}
      </Button>

      <p className="text-[11px] text-zinc-600 text-center">⌘+Enter to generate</p>
    </div>
  )
}
