"use client"

import React, { useState, useMemo } from "react"
import Image from "next/image"
import type { Note, Folder } from "@/types"

interface NoteCardGridProps {
  notes: Note[]
  folders: Folder[]
  onNoteClick: (note: Note) => void
  onNewFolder: () => void
  showFolderFilter?: boolean
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim()
}

function wordCount(html: string): number {
  return stripHtml(html).split(/\s+/).filter(Boolean).length
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return "Yesterday"
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

const FOLDER_COLORS: Record<string, string> = {
  Work: "#dbeafe",
  Personal: "#dcfce7",
  Ideas: "#fef3c7",
}

function getFolderColor(folderName?: string): string {
  if (folderName && FOLDER_COLORS[folderName]) return FOLDER_COLORS[folderName]
  const colors = ["#e0e7ff", "#fce7f3", "#f3e8ff", "#dbeafe", "#dcfce7", "#fef3c7"]
  let hash = 0
  if (folderName) for (let i = 0; i < folderName.length; i++) hash = folderName.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export default function NoteCardGrid({ notes, folders, onNoteClick, onNewFolder, showFolderFilter = true }: NoteCardGridProps) {
  const [activeFolder, setActiveFolder] = useState("All Notes")

  const sorted = useMemo(() => {
    return [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [notes])

  const filtered = useMemo(() => {
    if (activeFolder === "All Notes") return sorted
    const folder = folders.find((f) => f.name === activeFolder)
    if (!folder) return sorted
    return sorted.filter((n) => n.folderId === folder._id)
  }, [sorted, activeFolder, folders])

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Folder filter chips */}
      {showFolderFilter && (
        <div className="px-3 py-2 flex gap-1.5 overflow-x-auto flex-shrink-0">
          {["All Notes", ...folders.map((f) => f.name)].map((name) => (
            <div
              key={name}
              onClick={() => setActiveFolder(name)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer transition-colors ${
                activeFolder === name
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {name}
            </div>
          ))}
          <div
            onClick={onNewFolder}
            className="px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap cursor-pointer bg-muted text-muted-foreground"
          >
            + New
          </div>
        </div>
      )}

      {/* Notes grid */}
      <div className="flex-1 overflow-y-auto px-3 pt-2.5 pb-20">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <Image
              src="/ZooNote.png"
              alt="ZooNote"
              width={80}
              height={80}
              className="rounded-xl mb-4"
              priority
            />
            <h2 className="text-xl font-semibold mb-2">Welcome to ZooNote</h2>
            <p className="text-base text-muted-foreground max-w-[280px]">
              Your personal space for notes and ideas. Tap + to create your first note.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((note) => (
              <div
                key={note._id}
                onClick={() => onNoteClick(note)}
                className="border border-border rounded-[10px] overflow-hidden cursor-pointer relative"
              >
                {/* Color accent bar */}
                <div className="h-[5px]" style={{ background: getFolderColor(note.folderName) }} />

                <div className="px-2.5 pt-2.5 pb-2">
                  {/* Star indicator */}
                  {note.isFavorite && (
                    <span className="absolute top-2.5 right-2.5 text-xs text-amber-500">★</span>
                  )}

                  {/* Title */}
                  <div
                    className="text-base font-bold leading-[1.3] mb-1.5 line-clamp-2 pr-1"
                    style={{ paddingRight: note.isFavorite ? 16 : 4 }}
                  >
                    {note.title || "Untitled"}
                  </div>

                  {/* Preview */}
                  <div className="text-sm text-muted-foreground leading-[1.5] line-clamp-3">
                    {stripHtml(note.content || "")}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-2.5 py-1.5 border-t border-border/50 flex justify-between items-center">
                  <span className="text-xs text-muted-foreground/60">{timeAgo(note.updatedAt)}</span>
                  <span className="text-xs text-muted-foreground/60">{wordCount(note.content || "")} words</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
