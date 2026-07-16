"use client"

import React from "react"
import NoteCardGrid from "./NoteCardGrid"
import type { Note, Folder } from "@/types"

interface MobileFolderDetailProps {
  folder: Folder
  notes: Note[]
  onBack: () => void
  onNoteClick: (note: Note) => void
  onNewNote: () => void
}

const FOLDER_ICONS: Record<string, string> = {
  Work: "💼",
  Personal: "🏠",
  Ideas: "💡",
  Research: "🔬",
  Archive: "📦",
}

function getFolderIcon(name: string): string {
  return FOLDER_ICONS[name] || "📁"
}

export default function MobileFolderDetail({ folder, notes, onBack, onNoteClick, onNewNote }: MobileFolderDetailProps) {
  const folderNotes = notes.filter((n) => n.folderId === folder._id)

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-4 py-2.5 flex items-center gap-2 border-b border-border flex-shrink-0">
        <span onClick={onBack} className="text-lg cursor-pointer text-blue-600">←</span>
        <span className="text-xl">{getFolderIcon(folder.name)}</span>
        <span className="text-base font-semibold">{folder.name}</span>
        <span className="text-xs text-muted-foreground ml-1">{folderNotes.length} notes</span>
      </div>
      <NoteCardGrid notes={folderNotes} folders={[]} onNoteClick={onNoteClick} onNewFolder={() => {}} showFolderFilter={false} />
      <div onClick={onNewNote} className="fixed bottom-20 right-4 w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl shadow-lg cursor-pointer z-50" aria-label="Create new note" role="button">+</div>
    </div>
  )
}
