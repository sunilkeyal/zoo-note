"use client"

import React, { useState } from "react"
import type { Folder } from "@/types"

interface MobileNewNoteProps {
  folders: Folder[]
  onBack: () => void
  onSave: (data: { title: string; folderId?: string }) => void
}

export default function MobileNewNote({ folders, onBack, onSave }: MobileNewNoteProps) {
  const [title, setTitle] = useState("")
  const [folderId, setFolderId] = useState<string | undefined>(folders[0]?._id)

  const handleSave = () => {
    onSave({ title, folderId })
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <span onClick={onBack} className="text-lg cursor-pointer text-blue-600">←</span>
          <span className="text-[17px] font-bold">New Note</span>
        </div>
        <span onClick={handleSave} className="text-sm text-blue-600 font-semibold cursor-pointer">Save</span>
      </div>

      {/* Title input */}
      <div className="px-4 pt-3">
        <input
          placeholder="Note title"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border-none outline-none text-lg font-bold font-[inherit] bg-transparent"
        />
      </div>

      {/* Folder picker */}
      <div className="px-4 py-2 flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Folder:</span>
        {folders.map((f) => (
          <div
            key={f._id}
            onClick={() => setFolderId(f._id)}
            className={`px-2.5 py-0.5 rounded-full text-xs cursor-pointer transition-colors ${
              folderId === f._id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {f.name}
          </div>
        ))}
      </div>

      {/* Editor area placeholder */}
      <div className="flex-1 px-4 text-sm text-muted-foreground leading-7">
        Start typing your note...
      </div>

      {/* Mobile toolbar */}
      <div className="border-t border-border bg-background/50 py-1.5 px-2 flex gap-0.5 flex-shrink-0">
        {["B", "I", "U", "S̶", "H", "≡", "☑", "+ 🎨 📷"].map((t, i) => (
          <div
            key={i}
            className={`min-w-[36px] min-h-[36px] rounded-md flex items-center justify-center text-[13px] ${
              i === 0 ? "bg-primary text-primary-foreground" : "text-foreground"
            }`}
          >
            {t}
          </div>
        ))}
      </div>
    </div>
  )
}
