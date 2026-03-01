"use client"

import { X, Plus, FileCode } from "lucide-react"
import type { WorkflowFile } from "@/lib/workflow-types"

interface EditorTabsProps {
  files: WorkflowFile[]
  openTabs: string[]
  activeFileId: string | null
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onNew: () => void
}

export function EditorTabs({ files, openTabs, activeFileId, onSelect, onClose, onNew }: EditorTabsProps) {
  const fileMap = Object.fromEntries(files.map((f) => [f.id, f]))

  return (
    <div className="border-b border-zinc-900 h-9 flex items-center overflow-x-auto bg-zinc-950 shrink-0">
      {openTabs.map((id) => {
        const file = fileMap[id]
        if (!file) return null
        const isActive = id === activeFileId
        return (
          <div
            key={id}
            onClick={() => onSelect(id)}
            className={`group flex items-center gap-1.5 px-3 h-full cursor-pointer shrink-0 border-r border-zinc-900 ${
              isActive
                ? "bg-zinc-900 text-zinc-100 border-b-2 border-b-blue-500"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50"
            }`}
          >
            <FileCode className="w-3 h-3 shrink-0 text-blue-400" />
            <span className="text-xs max-w-[120px] truncate">{file.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClose(id)
              }}
              className="w-4 h-4 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-zinc-700 transition-opacity"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        )
      })}
      <button
        onClick={onNew}
        className="flex items-center justify-center w-8 h-full text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900/50 shrink-0"
        title="New file"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
