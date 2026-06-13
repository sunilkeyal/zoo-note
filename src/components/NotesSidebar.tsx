"use client"

import React, { useState, DragEvent } from "react"
import { useNotes } from "@/contexts/NoteContext"
import DeleteConfirmDialog from "./DeleteConfirmDialog"
import DeleteFolderDialog from "./DeleteFolderDialog"
import { Folder, Note } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus,
  Folder as FolderIcon,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Search,
  ChevronsUpDown,
  ChevronsDownUp,
  Trash2,
  Pencil,
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function NotesSidebar() {
  const {
    notes, folders, expandedFolders, createNote, deleteNote, updateNote,
    activeNoteId, setActiveNoteId, createFolder, renameFolder,
    deleteFolder, moveNote, toggleFolder,
  } = useNotes()

  const [search, setSearch] = useState("")
  const [deleteNoteTarget, setDeleteNoteTarget] = useState<string | null>(null)
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<Folder | null>(null)
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null)

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")

  const [dragActive, setDragActive] = useState(false)
  const [dropTarget, setDropTarget] = useState<{
    folderId: string | null
    noteIndex: number
  } | null>(null)

  const filtered = search
    ? notes.filter((n) => n.title.toLowerCase().includes(search.toLowerCase()))
    : notes

  const quickNotes = filtered.filter((n) => !n.folderId)

  const handleCreate = async () => {
    let targetFolderId = activeFolderId ?? undefined
    let position: number | undefined
    if (activeNoteId) {
      const selectedNote = notes.find((n) => n._id === activeNoteId)
      if (selectedNote) {
        targetFolderId = selectedNote.folderId
        const siblings = notes
          .filter((n) => n.folderId === selectedNote.folderId)
          .sort((a, b) => a.position - b.position)
        const idx = siblings.findIndex((n) => n._id === activeNoteId)
        const nextNote = siblings[idx + 1]
        position = nextNote
          ? (selectedNote.position + nextNote.position) / 2
          : selectedNote.position + 1000
      }
    }
    const note = await createNote({ title: "Untitled Note", folderId: targetFolderId, position })
    if (note) setActiveNoteId(note._id)
  }

  const handleCreateFolder = async () => {
    const folder = await createFolder("New Folder")
    if (folder) {
      setRenamingId(folder._id)
      setRenameValue(folder.name)
      toggleFolder(folder._id)
    }
  }

  const handleDeleteNote = async () => {
    if (!deleteNoteTarget) return
    await deleteNote(deleteNoteTarget)
    if (activeNoteId === deleteNoteTarget) setActiveNoteId(null)
    setDeleteNoteTarget(null)
  }

  const handleDeleteFolder = async () => {
    if (!deleteFolderTarget) return
    await deleteFolder(deleteFolderTarget._id)
    setDeleteFolderTarget(null)
  }

  const startRenaming = (id: string, currentName: string) => {
    setRenamingId(id)
    setRenameValue(currentName)
  }

  const finishRename = async (id: string) => {
    if (!renamingId || !renameValue.trim()) { cancelRename(); return }
    if (folders.some((f) => f._id === id)) {
      await renameFolder(id, renameValue.trim())
    } else {
      await updateNote(id, { title: renameValue.trim() })
    }
    cancelRename()
  }

  const cancelRename = () => { setRenamingId(null); setRenameValue("") }

  const handleDragStart = (e: DragEvent, noteId: string) => {
    e.dataTransfer.setData("text/plain", noteId)
    e.dataTransfer.effectAllowed = "move"
    setDragActive(true)
  }

  const handleDragOver = (e: DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move" }

  const handleDrop = async (e: DragEvent, targetFolderId: string | null) => {
    e.preventDefault()
    const noteId = e.dataTransfer.getData("text/plain")
    if (noteId && dropTarget && dropTarget.folderId === targetFolderId) {
      const targetNotes = notes
        .filter((n) => targetFolderId === null ? !n.folderId : n.folderId === targetFolderId)
        .sort((a, b) => a.position - b.position)
      const { noteIndex } = dropTarget
      let position: number
      if (targetNotes.length === 0) { position = 0 }
      else if (noteIndex <= 0) { position = targetNotes[0].position - 1000 }
      else if (noteIndex >= targetNotes.length) { position = targetNotes[targetNotes.length - 1].position + 1000 }
      else { position = (targetNotes[noteIndex - 1].position + targetNotes[noteIndex].position) / 2 }
      await moveNote(noteId, targetFolderId, position)
    } else if (noteId) { await moveNote(noteId, targetFolderId) }
    setDropTarget(null); setDragActive(false)
  }

  const handleNoteDragOver = (e: DragEvent, noteIndex: number, parentFolderId: string | null) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const relativeY = e.clientY - rect.top
    const index = relativeY < rect.height / 2 ? noteIndex : noteIndex + 1
    setDropTarget({ folderId: parentFolderId, noteIndex: index })
  }

  const handleDragEnd = () => { setDropTarget(null); setDragActive(false) }

  const renderNoteItem = (note: Note, noteIndex: number, parentFolderId: string | null) => (
    <div
      key={note._id}
      draggable
      onDragStart={(e) => handleDragStart(e, note._id)}
      onDragEnd={handleDragEnd}
      className="relative group"
    >
      {dropTarget?.folderId === parentFolderId && dropTarget.noteIndex === noteIndex && (
        <div className="absolute top-0 left-9 right-3 h-0.5 bg-primary rounded z-10" />
      )}
      <div
        className={cn(
          "flex items-center gap-1 rounded-lg px-2 py-1 cursor-pointer text-sm ml-7 mr-1",
          activeNoteId === note._id ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
        )}
        onClick={() => setActiveNoteId(note._id)}
        onDoubleClick={() => startRenaming(note._id, note.title)}
        onDragOver={(e) => handleNoteDragOver(e, noteIndex, parentFolderId)}
      >
        {renamingId === note._id ? (
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={() => finishRename(note._id)}
            onKeyDown={(e) => { if (e.key === "Enter") finishRename(note._id); if (e.key === "Escape") cancelRename() }}
            autoFocus className="h-6 text-xs px-1"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <>
            <span className="flex-1 truncate text-sm">{note.title}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => startRenaming(note._id, note.title)}>
                  <Pencil className="h-3 w-3 mr-2" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setDeleteNoteTarget(note._id)}>
                  <Trash2 className="h-3 w-3 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </div>
  )

  const renderFolder = (folder: Folder) => {
    const folderNotes = filtered.filter((n) => n.folderId === folder._id)
    const isExpanded = expandedFolders.has(folder._id)

    return (
      <Collapsible
        key={folder._id}
        open={isExpanded}
        onOpenChange={() => { toggleFolder(folder._id); setActiveFolderId(folder._id) }}
      >
        <div
          onDragOver={(e) => { handleDragOver(e); setDropTarget((prev) => prev?.folderId === folder._id ? prev : null) }}
          onDrop={(e) => handleDrop(e, folder._id)}
        >
          <CollapsibleTrigger className="flex w-full items-center gap-1 rounded-lg px-2 py-1 hover:bg-accent/50">
            {isExpanded
              ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            }
            {isExpanded
              ? <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
              : <FolderIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            }
            {renamingId === folder._id ? (
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => finishRename(folder._id)}
                onKeyDown={(e) => { if (e.key === "Enter") finishRename(folder._id); if (e.key === "Escape") cancelRename() }}
                autoFocus className="h-6 text-xs px-1"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="flex-1 truncate text-sm font-semibold">{folder.name}</span>
            )}
            <Badge variant="secondary" className="h-4 text-[10px] px-1">{folderNotes.length}</Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-5 w-5">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => startRenaming(folder._id, folder.name)}>
                  <Pencil className="h-3 w-3 mr-2" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setDeleteFolderTarget(folder)}>
                  <Trash2 className="h-3 w-3 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CollapsibleTrigger>
          <CollapsibleContent>
            {folderNotes.length === 0 && dragActive && (
              <div className="h-0 relative mx-3">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary rounded" />
              </div>
            )}
            {folderNotes.map((note, noteIndex) => renderNoteItem(note, noteIndex, folder._id))}
            {dropTarget?.folderId === folder._id && dropTarget.noteIndex === folderNotes.length && folderNotes.length > 0 && (
              <div className="h-0 relative">
                <div className="absolute top-0 left-9 right-3 h-0.5 bg-primary rounded z-10" />
              </div>
            )}
          </CollapsibleContent>
        </div>
      </Collapsible>
    )
  }

  return (
    <>
      <aside className="w-[280px] h-full flex flex-col border-r bg-background">
        <div className="flex items-center justify-end gap-0.5 px-2 py-1 border-b">
          <Button variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => folders.forEach((f) => { if (!expandedFolders.has(f._id)) toggleFolder(f._id) })}>
            <ChevronsDownUp className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => folders.forEach((f) => { if (expandedFolders.has(f._id)) toggleFolder(f._id) })}>
            <ChevronsUpDown className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCreate}>
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCreateFolder}>
            <FolderIcon className="h-4 w-4" />
          </Button>
        </div>

        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search notes..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 pl-7 text-sm" />
          </div>
        </div>

        <div className="flex-1 overflow-auto px-2">
          {folders.map(renderFolder)}

          <div
            onDragOver={(e) => { handleDragOver(e); setDropTarget((prev) => prev?.folderId === null ? prev : null) }}
            onDrop={(e) => handleDrop(e, null)}
          >
            <div className="flex items-center gap-1 rounded-lg px-2 py-1 cursor-pointer hover:bg-accent/50"
              onClick={() => setActiveFolderId(null)}>
              <FolderIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate text-sm font-semibold">Quick Notes</span>
              <Badge variant="secondary" className="h-4 text-[10px] px-1">{quickNotes.length}</Badge>
            </div>
            {quickNotes.length === 0 && dragActive && (
              <div className="h-0 relative mx-3">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary rounded" />
              </div>
            )}
            {quickNotes.map((note, noteIndex) => renderNoteItem(note, noteIndex, null))}
            {dropTarget?.folderId === null && dropTarget.noteIndex === quickNotes.length && quickNotes.length > 0 && (
              <div className="h-0 relative">
                <div className="absolute top-0 left-9 right-3 h-0.5 bg-primary rounded z-10" />
              </div>
            )}
          </div>
        </div>
      </aside>

      <DeleteConfirmDialog open={deleteNoteTarget !== null} onClose={() => setDeleteNoteTarget(null)} onConfirm={handleDeleteNote} />
      <DeleteFolderDialog open={deleteFolderTarget !== null} folderName={deleteFolderTarget?.name || ""}
        notesCount={deleteFolderTarget ? notes.filter((n) => n.folderId === deleteFolderTarget._id).length : 0}
        onClose={() => setDeleteFolderTarget(null)} onConfirm={handleDeleteFolder} />
    </>
  )
}
