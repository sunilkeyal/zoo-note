"use client"
import React, { useEffect, useState } from "react"
import { Editor } from "@tiptap/react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { Trash2 } from "lucide-react"

interface Props {
  editor: Editor
  editorContainerRef: React.RefObject<HTMLElement | null>
}

interface Position { top: number; left: number }

function ToolbarButton({
  title,
  onClick,
  destructive,
  children,
}: {
  title: string
  onClick: () => void
  destructive?: boolean
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            title={title}
            className={`h-6 w-6 flex items-center justify-center rounded hover:bg-accent text-xs font-medium ${destructive ? "text-destructive" : ""}`}
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  )
}

export function TableFloatingToolbar({ editor, editorContainerRef }: Props) {
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 })

  useEffect(() => {
    const update = () => {
      const inTable = editor.isActive("table")
      setVisible(inTable)
      if (inTable && editorContainerRef.current) {
        try {
          const { from } = editor.state.selection
          const rawNode = editor.view.domAtPos(from).node
          const el = rawNode instanceof Element ? rawNode : rawNode.parentElement
          const tableEl = el?.closest("table")
          if (tableEl) {
            const tableRect = tableEl.getBoundingClientRect()
            const containerEl = editorContainerRef.current
            const containerRect = containerEl.getBoundingClientRect()
            setPosition({
              top: Math.max(0, tableRect.top - containerRect.top + containerEl.scrollTop - 40),
              left: tableRect.left - containerRect.left + containerEl.scrollLeft,
            })
          }
        } catch {
          // positioning error — keep last known position
        }
      }
    }

    editor.on("transaction", update)
    update() // sync on mount
    return () => { editor.off("transaction", update) }
  }, [editor, editorContainerRef])

  if (!visible) return null

  return (
    <TooltipProvider>
      <div
        data-testid="table-floating-toolbar"
        className="absolute z-10 flex items-center gap-0.5 px-1.5 py-1 border rounded-lg bg-card shadow-md"
        style={{ top: position.top, left: position.left }}
      >
        <ToolbarButton title="Add row above" onClick={() => editor.chain().focus().addRowBefore().run()}>↑R</ToolbarButton>
        <ToolbarButton title="Add row below" onClick={() => editor.chain().focus().addRowAfter().run()}>↓R</ToolbarButton>
        <ToolbarButton title="Delete row" destructive onClick={() => editor.chain().focus().deleteRow().run()}>−R</ToolbarButton>
        <Separator orientation="vertical" className="mx-0.5 h-4" />
        <ToolbarButton title="Add column left" onClick={() => editor.chain().focus().addColumnBefore().run()}>←C</ToolbarButton>
        <ToolbarButton title="Add column right" onClick={() => editor.chain().focus().addColumnAfter().run()}>→C</ToolbarButton>
        <ToolbarButton title="Delete column" destructive onClick={() => editor.chain().focus().deleteColumn().run()}>−C</ToolbarButton>
        <Separator orientation="vertical" className="mx-0.5 h-4" />
        <ToolbarButton title="Toggle header row" onClick={() => editor.chain().focus().toggleHeaderRow().run()}>H</ToolbarButton>
        <ToolbarButton title="Delete table" destructive onClick={() => editor.chain().focus().deleteTable().run()}>
          <Trash2 className="h-3 w-3" />
        </ToolbarButton>
      </div>
    </TooltipProvider>
  )
}
