"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { BookOpen } from "lucide-react"

interface ExplainDialogProps {
  open: boolean
  onClose: () => void
  explanation: string
}

export function ExplainDialog({ open, onClose, explanation }: ExplainDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-700 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <BookOpen className="w-4 h-4 text-blue-400" />
            Workflow Explanation
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap pr-4">
            {explanation}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
