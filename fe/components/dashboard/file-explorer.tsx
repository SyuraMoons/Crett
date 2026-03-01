"use client"

import { useState } from "react"
import { FileCode, Plus, X } from "lucide-react"
import type { WorkflowFile } from "@/lib/workflow-types"

interface FileExplorerProps {
  files: WorkflowFile[]
  activeFileId: string | null
  onOpen: (id: string) => void
  onDelete: (id: string) => void
  onNew: () => void
  onRename: (id: string, name: string) => void
}

export function FileExplorer({ files, activeFileId, onOpen, onDelete, onNew, onRename }: FileExplorerProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")

  const startRename = (file: WorkflowFile, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(file.id)
    setEditName(file.name)
  }

  const commitRename = (id: string) => {
    if (editName.trim()) onRename(id, editName.trim())
    setEditingId(null)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-900 shrink-0">
        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Explorer</span>
        <button
          onClick={onNew}
          className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
          title="New file"
        >
          <Plus className="w-3 h-3" />
          New
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {files.length === 0 ? (
          <div className="px-3 py-6 text-[11px] text-zinc-700 text-center leading-relaxed">
            No files yet.
            <br />
            Generate a workflow or click + New.
          </div>
        ) : (
          files.map((file) => {
            const isActive = file.id === activeFileId
            return (
              <div
                key={file.id}
                onClick={() => onOpen(file.id)}
                onDoubleClick={(e) => startRename(file, e)}
                className={`group flex items-center gap-2 px-3 py-1.5 cursor-pointer select-none ${
                  isActive ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:bg-zinc-900"
                }`}
              >
                <FileCode className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                {editingId === file.id ? (
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => commitRename(file.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename(file.id)
                      if (e.key === "Escape") setEditingId(null)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 min-w-0 text-xs bg-zinc-800 border border-blue-500 rounded px-1 py-0 outline-none text-zinc-100"
                  />
                ) : (
                  <span className="flex-1 min-w-0 text-xs truncate">{file.name}</span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(file.id)
                  }}
                  className="w-4 h-4 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-zinc-700 transition-opacity shrink-0"
                  title="Delete file"
                >
                  <X className="w-2.5 h-2.5 text-zinc-500 hover:text-red-400" />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
