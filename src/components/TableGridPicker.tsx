"use client"
import React, { useState } from "react"
import { Editor } from "@tiptap/react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Table } from "lucide-react"

const ROWS = 8
const COLS = 8

interface TableGridPickerProps {
  editor: Editor
  triggerClassName?: string
}

export function TableGridPicker({ editor, triggerClassName }: TableGridPickerProps) {
  const [hovered, setHovered] = useState<{ row: number; col: number } | null>(null)
  const [open, setOpen] = useState(false)

  const label = hovered ? `${hovered.col} \u00d7 ${hovered.row}` : "Insert Table"

  function handleInsert(row: number, col: number) {
    editor.chain().focus().insertTable({ rows: row, cols: col, withHeaderRow: false }).run()
    setOpen(false)
    setHovered(null)
  }

  const triggerCls = triggerClassName ??
    "h-7 w-7 flex items-center justify-center rounded-md border border-input hover:bg-accent"

  return (
    <TooltipProvider>
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger render={<PopoverTrigger className={triggerCls} />}>
            <Table className="h-4 w-4" />
          </TooltipTrigger>
          <TooltipContent>Insert table</TooltipContent>
        </Tooltip>
        <PopoverContent className="w-auto p-3" align="start">
          <div className="text-sm font-medium mb-2 select-none">{label}</div>
          <div
            className="grid gap-0.5"
            style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
            onMouseLeave={() => setHovered(null)}
          >
            {Array.from({ length: ROWS }, (_, rowIdx) =>
              Array.from({ length: COLS }, (_, colIdx) => {
                const row = rowIdx + 1
                const col = colIdx + 1
                const highlighted = hovered !== null && row <= hovered.row && col <= hovered.col
                return (
                  <button
                    key={`${row}-${col}`}
                    data-testid={`grid-cell-${row}-${col}`}
                    className={`h-6 w-6 border rounded-sm transition-colors ${
                      highlighted
                        ? "bg-primary border-primary"
                        : "bg-background border-input hover:border-primary"
                    }`}
                    onMouseEnter={() => setHovered({ row, col })}
                    onClick={() => handleInsert(row, col)}
                  />
                )
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  )
}
