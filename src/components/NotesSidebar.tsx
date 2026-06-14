"use client"

import React, { useState, DragEvent } from "react"
import { useNotes } from "@/contexts/NoteContext"
import DeleteConfirmDialog from "./DeleteConfirmDialog"
import DeleteFolderDialog from "./DeleteFolderDialog"
import { Folder, Note } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import {
  Plus,
  Folder as FolderIcon,
  ChevronsUpDown,
  ChevronsDownUp,
  Trash2,
  Pencil,
  Briefcase,
  User,
  GraduationCap,
  Music,
  Image,
  Video,
  FileText,
  Download,
  Code2,
  Utensils,
  Heart,
  StickyNote,
  Lightbulb,
  Star,
  Dumbbell,
  DollarSign,
  Plane,
  ShoppingCart,
  HeartPulse,
} from "lucide-react"

const folderIcons: Record<string, typeof FolderIcon> = {
  work: Briefcase,
  office: Briefcase,
  business: Briefcase,
  personal: User,
  private: User,
  school: GraduationCap,
  study: GraduationCap,
  education: GraduationCap,
  music: Music,
  songs: Music,
  audio: Music,
  photos: Image,
  images: Image,
  pictures: Image,
  videos: Video,
  movies: Video,
  films: Video,
  documents: FileText,
  docs: FileText,
  files: FileText,
  downloads: Download,
  projects: Code2,
  software: Code2,
  recipes: Utensils,
  cooking: Utensils,
  health: Heart,
  fitness: Heart,
  sports: Dumbbell,
  finance: DollarSign,
  money: DollarSign,
  budget: DollarSign,
  travel: Plane,
  trips: Plane,
  vacation: Plane,
  shopping: ShoppingCart,
  medical: HeartPulse,
  notes: StickyNote,
  ideas: Lightbulb,
  starred: Star,
  favorites: Star,
}

function getFolderIcon(name: string) {
  const key = name.toLowerCase().trim()
  if (folderIcons[key]) return folderIcons[key]
  for (const word of key.split(/[\s-_]+/)) {
    if (folderIcons[word]) return folderIcons[word]
  }
  return FolderIcon
}

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
    <SidebarMenuSubItem key={note._id}>
      {renamingId === note._id ? (
        <Input
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onBlur={() => finishRename(note._id)}
          onKeyDown={(e) => { if (e.key === "Enter") finishRename(note._id); if (e.key === "Escape") cancelRename() }}
          autoFocus
          className="h-6 text-xs px-1 mx-2 my-0.5"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div className="relative group/menu-sub-item">
          <SidebarMenuSubButton
            isActive={activeNoteId === note._id}
            onClick={() => setActiveNoteId(note._id)}
            onDoubleClick={() => startRenaming(note._id, note.title)}
            className="pr-8"
            draggable
            onDragStart={(e) => handleDragStart(e, note._id)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleNoteDragOver(e, noteIndex, parentFolderId)}
          >
            <span className="truncate">{note.title}</span>
          </SidebarMenuSubButton>
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 transition-opacity pointer-events-none opacity-0 group-hover/menu-sub-item:pointer-events-auto group-hover/menu-sub-item:opacity-100">
            <Button variant="ghost" size="icon-xs" onClick={(e) => { e.stopPropagation(); startRenaming(note._id, note.title) }}>
              <Pencil />
            </Button>
            <Button variant="ghost" size="icon-xs" onClick={(e) => { e.stopPropagation(); setDeleteNoteTarget(note._id) }}>
              <Trash2 />
            </Button>
          </div>
        </div>
      )}
    </SidebarMenuSubItem>
  )

  const renderFolder = (folder: Folder) => {
    const folderNotes = filtered.filter((n) => n.folderId === folder._id)
    const isExpanded = expandedFolders.has(folder._id)
    const FolderIconForFolder = getFolderIcon(folder.name)

    return (
      <Collapsible
        key={folder._id}
        open={isExpanded}
        onOpenChange={() => { toggleFolder(folder._id); setActiveFolderId(folder._id) }}
      >
        <SidebarGroup className="py-0">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <CollapsibleTrigger render={<SidebarMenuButton isActive={activeFolderId === folder._id} />}>
                  <FolderIconForFolder />
                  {renamingId === folder._id ? (
                    <Input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => finishRename(folder._id)}
                      onKeyDown={(e) => { if (e.key === "Enter") finishRename(folder._id); if (e.key === "Escape") cancelRename() }}
                      autoFocus
                      className="h-6 text-xs px-1"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="flex-1 truncate text-left">{folder.name}</span>
                  )}
                  <SidebarMenuBadge className="transition-opacity group-hover/menu-item:opacity-0">{folderNotes.length}</SidebarMenuBadge>
                </CollapsibleTrigger>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 transition-opacity pointer-events-none opacity-0 group-hover/menu-item:pointer-events-auto group-hover/menu-item:opacity-100 z-10">
                  <Button variant="ghost" size="icon-xs" onClick={(e) => { e.stopPropagation(); startRenaming(folder._id, folder.name) }}>
                    <Pencil />
                  </Button>
                  <Button variant="ghost" size="icon-xs" onClick={(e) => { e.stopPropagation(); setDeleteFolderTarget(folder) }}>
                    <Trash2 />
                  </Button>
                </div>
              </SidebarMenuItem>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {folderNotes.length === 0 && (
                    <SidebarMenuSubItem>
                      <span className="block px-2 py-1 text-xs text-sidebar-foreground/50">No notes</span>
                    </SidebarMenuSubItem>
                  )}
                  {folderNotes.map((note, noteIndex) => renderNoteItem(note, noteIndex, folder._id))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </Collapsible>
    )
  }

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-0.5 px-1 py-1">
            <Button variant="ghost" size="icon"
              onClick={() => folders.forEach((f) => { if (!expandedFolders.has(f._id)) toggleFolder(f._id) })}>
              <ChevronsDownUp />
            </Button>
            <Button variant="ghost" size="icon"
              onClick={() => folders.forEach((f) => { if (expandedFolders.has(f._id)) toggleFolder(f._id) })}>
              <ChevronsUpDown />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleCreate}>
              <Plus />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleCreateFolder}>
              <FolderIcon />
            </Button>
          </div>
          <div className="px-1 pb-2">
            <form onSubmit={(e) => e.preventDefault()}>
              <SidebarInput
                placeholder="Search notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </form>
          </div>
        </SidebarHeader>

        <SidebarContent>
          {folders.map(renderFolder)}
        </SidebarContent>
      </Sidebar>

      <DeleteConfirmDialog open={deleteNoteTarget !== null} onClose={() => setDeleteNoteTarget(null)} onConfirm={handleDeleteNote} />
      <DeleteFolderDialog open={deleteFolderTarget !== null} folderName={deleteFolderTarget?.name || ""}
        notesCount={deleteFolderTarget ? notes.filter((n) => n.folderId === deleteFolderTarget._id).length : 0}
        onClose={() => setDeleteFolderTarget(null)} onConfirm={handleDeleteFolder} />
    </>
  )
}
