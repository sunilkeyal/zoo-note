"use client"

import { X } from "lucide-react"

interface SelectionBarProps {
  count: number
  onClear: () => void
}

export default function SelectionBar({ count, onClear }: SelectionBarProps) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded-md mx-1 mb-1">
      <span className="font-medium">{count} selected</span>
      <button
        onClick={onClear}
        className="flex items-center gap-1 hover:bg-primary/80 px-1.5 py-0.5 rounded text-xs"
      >
        <X className="h-3 w-3" />
        Clear
      </button>
    </div>
  )
}
