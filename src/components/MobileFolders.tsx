"use client"

import React from "react"
import type { Note, Folder } from "@/types"

interface MobileFoldersProps {
  folders: Folder[]
  notes: Note[]
  onFolderClick: (folder: Folder) => void
  onNewFolder: () => void
}

const FOLDER_COLORS: Record<string, string> = {
  Work: "#dbeafe",
  Personal: "#dcfce7",
  Ideas: "#fef3c7",
  Research: "#e0e7ff",
  Archive: "#f3f4f6",
}

const FOLDER_ICONS: Record<string, string> = {
  Work: "💼",
  Personal: "🏠",
  Ideas: "💡",
  Research: "🔬",
  Archive: "📦",
}

function getFolderColor(name: string): string {
  return FOLDER_COLORS[name] || "#f3f4f6"
}

function getFolderIcon(name: string): string {
  return FOLDER_ICONS[name] || "📁"
}

export default function MobileFolders({ folders, notes, onFolderClick, onNewFolder }: MobileFoldersProps) {
  const notesByFolder = React.useMemo(() => {
    const map: Record<string, number> = {}
    for (const note of notes) {
      if (note.folderId) {
        map[note.folderId] = (map[note.folderId] || 0) + 1
      }
    }
    return map
  }, [notes])

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto px-3 py-3">
      <div className="grid grid-cols-2 gap-2.5">
        {folders.map((folder) => (
          <div
            key={folder._id}
            onClick={() => onFolderClick(folder)}
            className="border border-border rounded-xl p-4 cursor-pointer transition-shadow hover:shadow-md"
            style={{ background: `${getFolderColor(folder.name)}40` }}
          >
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-xl">{getFolderIcon(folder.name)}</span>
              <span className="text-sm font-semibold truncate">{folder.name}</span>
            </div>
            <div className="text-2xl font-bold">{notesByFolder[folder._id] || 0}</div>
            <div className="text-xs text-muted-foreground">notes</div>
          </div>
        ))}
      </div>
      <div
        onClick={onNewFolder}
        className="mt-3 py-3 border border-dashed border-border rounded-xl text-center text-sm text-muted-foreground cursor-pointer"
      >
        + New Folder
      </div>
    </div>
  )
}
