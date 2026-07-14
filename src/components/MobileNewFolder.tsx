"use client"

import React, { useState } from "react"

interface MobileNewFolderProps {
  existingFolders: string[]
  onBack: () => void
  onCreate: (name: string) => void
}

export default function MobileNewFolder({ existingFolders, onBack, onCreate }: MobileNewFolderProps) {
  const [name, setName] = useState("")
  const isDuplicate = existingFolders.includes(name)
  const canCreate = name.length > 0 && !isDuplicate

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <span onClick={onBack} className="text-lg cursor-pointer text-blue-600">←</span>
          <span className="text-[17px] font-bold">New Folder</span>
        </div>
        <span
          onClick={() => canCreate && onCreate(name)}
          className={`text-sm font-semibold ${canCreate ? "text-blue-600 cursor-pointer" : "text-muted-foreground"}`}
        >
          Create
        </span>
      </div>

      {/* Name input */}
      <div className="px-4 py-4">
        <label className="text-xs text-muted-foreground block mb-1.5">Folder name</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Projects"
          className="w-full px-3 py-2.5 rounded-lg border border-border text-sm font-[inherit] outline-none"
        />
        {isDuplicate && (
          <div className="text-xs text-destructive mt-1.5">A folder with this name already exists</div>
        )}
      </div>

      {/* Existing folders */}
      <div className="px-4">
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Existing Folders</div>
        {existingFolders.map((f, i) => (
          <div key={i} className="py-2.5 border-b border-border text-sm flex items-center gap-2">
            <span className="text-muted-foreground">📁</span> {f}
          </div>
        ))}
      </div>
    </div>
  )
}
