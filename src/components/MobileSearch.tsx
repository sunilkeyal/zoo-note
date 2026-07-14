"use client"

import React, { useState, useMemo } from "react"
import NoteCardGrid from "./NoteCardGrid"
import type { Note, Folder } from "@/types"

interface MobileSearchProps {
  notes: Note[]
  folders?: Folder[]
  onBack: () => void
  onNoteClick: (note: Note) => void
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim()
}

export default function MobileSearch({ notes, folders = [], onBack, onNoteClick }: MobileSearchProps) {
  const [query, setQuery] = useState("")

  const results = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return notes.filter(
      (n) =>
        (n.title || "").toLowerCase().includes(q) ||
        stripHtml(n.content || "").toLowerCase().includes(q)
    )
  }, [query, notes])

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-2">
        <span onClick={onBack} className="text-lg cursor-pointer text-blue-600">←</span>
        <span className="text-[17px] font-bold">Search</span>
      </div>

      {/* Search input */}
      <div className="px-4 pb-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-[10px] bg-muted border border-blue-600">
          <span className="text-sm text-muted-foreground">🔍</span>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes..."
            className="flex-1 border-none bg-transparent outline-none text-sm font-[inherit]"
          />
          {query.length > 0 && (
            <span onClick={() => setQuery("")} className="text-sm text-muted-foreground cursor-pointer">✕</span>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 min-h-0">
        {query.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">Type to search across all notes</div>
        ) : results.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">No results for &ldquo;{query}&rdquo;</div>
        ) : (
          <NoteCardGrid notes={results} folders={folders} onNoteClick={onNoteClick} onNewFolder={() => {}} />
        )}
      </div>
    </div>
  )
}
