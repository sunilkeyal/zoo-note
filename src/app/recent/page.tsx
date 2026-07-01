"use client"

import React, { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Clock, FileText, Folder, Search, Pencil, File, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog"
import { useNotes } from "@/contexts/NoteContext"
import { Note } from "@/types"

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim()
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const diff = now - new Date(dateStr).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return "just now"
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 14) return `${d}d ago`
  const w = Math.floor(d / 7)
  if (w < 8) return `${w}w ago`
  return new Date(dateStr).toLocaleDateString()
}

function NoteFooter({ note, folderMap }: { note: Note; folderMap: Map<string, string> }) {
  const folderName = note.folderId ? folderMap.get(note.folderId) : undefined
  return (
    <div className="flex items-center justify-between mt-3 pt-3 border-t">
      {folderName ? (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Folder className="h-3 w-3" />{folderName}
        </span>
      ) : <span />}
      <span className="text-xs text-muted-foreground">{formatRelativeTime(note.updatedAt)}</span>
    </div>
  )
}

export default function RecentPage() {
  const { notes, folders, loading, error, setActiveNoteId, expandedFolders, toggleFolder, fetchNotes, updateNote, deleteNote } = useNotes()
  const [filter, setFilter] = useState("")
  const router = useRouter()

  const [renameTarget, setRenameTarget] = useState<{ id: string; title: string } | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const folderMap = useMemo(
    () => new Map(folders.map(f => [f._id, f.name])),
    [folders]
  )

  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [notes]
  )

  const filteredNotes = useMemo(() => {
    if (!filter.trim()) return sortedNotes
    const q = filter.toLowerCase()
    return sortedNotes.filter(n => n.title.toLowerCase().includes(q))
  }, [sortedNotes, filter])

  function handleNoteClick(id: string) {
    const note = notes.find(n => n._id === id)
    if (note?.folderId && !expandedFolders.has(note.folderId)) {
      toggleFolder(note.folderId)
    }
    setActiveNoteId(id)
    router.push("/")
  }

  function openRename(note: Note) {
    setRenameTarget({ id: note._id, title: note.title })
    setRenameValue(note.title)
  }

  async function handleRenameConfirm() {
    if (!renameTarget || !renameValue.trim()) return
    await updateNote(renameTarget.id, { title: renameValue.trim() })
    setRenameTarget(null)
  }

  async function handleExportPdf(noteId: string, noteTitle: string) {
    try {
      const res = await fetch(`/api/notes/${noteId}/export?format=pdf`)
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${noteTitle.replace(/[/\\?%*:|"<>]/g, "_")}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Export failed:", err)
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    await deleteNote(deleteTarget)
    if (deleteTarget === (renameTarget?.id ?? null)) setRenameTarget(null)
    setDeleteTarget(null)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive">{error}</p>
          <Button variant="outline" onClick={() => fetchNotes()}>Retry</Button>
        </div>
      </div>
    )
  }

  const [hero, ...rest] = filteredNotes

  return (
    <div className="py-2 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
            <Clock className="size-5 text-violet-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Recent</h1>
            <p className="text-xs text-muted-foreground">Your most recently edited notes</p>
          </div>
        </div>
        <div className="relative hidden sm:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter notes..."
            className="pl-8 h-8 text-sm w-44"
          />
        </div>
      </div>

      {/* Empty state */}
      {filteredNotes.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-12">
          {notes.length === 0
            ? "No notes yet. Create your first note to see it here."
            : "No notes match your search."}
        </p>
      )}

      {/* Hero card */}
      {hero && (
        <ContextMenu>
          <ContextMenuTrigger>
            <div
              onClick={() => handleNoteClick(hero._id)}
              className="p-5 rounded-xl border-2 border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-900/10 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors cursor-pointer"
            >
              <p className="font-semibold text-base">{hero.title || "Untitled"}</p>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {stripHtml(hero.content) || "No content"}
              </p>
              <NoteFooter note={hero} folderMap={folderMap} />
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => openRename(hero)}>
              <Pencil className="h-4 w-4 mr-2" /> Rename
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleExportPdf(hero._id, hero.title)}>
              <File className="h-4 w-4 mr-2" /> Download PDF
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => setDeleteTarget(hero._id)} className="text-destructive focus:text-destructive">
              <Trash2 className="h-4 w-4 mr-2" /> Move to trash
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      )}

      {/* Grid */}
      {rest.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {rest.map(note => (
            <ContextMenu key={note._id}>
              <ContextMenuTrigger>
                <div
                  onClick={() => handleNoteClick(note._id)}
                  className="flex flex-col gap-2 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{note.title || "Untitled"}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {stripHtml(note.content) || "No content"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pl-7">
                    {note.folderId && folderMap.get(note.folderId) ? (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Folder className="h-3 w-3" />{folderMap.get(note.folderId)}
                      </span>
                    ) : <span />}
                    <span className="text-xs text-muted-foreground">{formatRelativeTime(note.updatedAt)}</span>
                  </div>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => openRename(note)}>
                  <Pencil className="h-4 w-4 mr-2" /> Rename
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleExportPdf(note._id, note.title)}>
                  <File className="h-4 w-4 mr-2" /> Download PDF
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => setDeleteTarget(note._id)} className="text-destructive focus:text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" /> Move to trash
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </div>
      )}

      {/* Rename dialog */}
      <Dialog open={!!renameTarget} onOpenChange={open => { if (!open) setRenameTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename note</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleRenameConfirm(); if (e.key === "Escape") setRenameTarget(null) }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>Cancel</Button>
            <Button onClick={handleRenameConfirm} disabled={!renameValue.trim()}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
