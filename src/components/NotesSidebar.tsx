"use client"

import React, { useState, useRef } from "react"
import { flushSync } from "react-dom"
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useNotes } from "@/contexts/NoteContext"
import DeleteConfirmDialog from "./DeleteConfirmDialog"
import DeleteFolderDialog from "./DeleteFolderDialog"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
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
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import {
  Plus,
  Folder as FolderIcon,
  ChevronRight,
  ChevronDown,
  ChevronsUpDown,
  ChevronsDownUp,
  Trash2,
  Pencil,
  Search,
  Briefcase,
  User,
  GraduationCap,
  Music,
  Image,
  Video,
  FileText,
  File,
  Download,
  Code2,
  Utensils,
  StickyNote,
  FilePlus,
  Lightbulb,
  Star,
  DollarSign,
  Dumbbell,
  Plane,
  ShoppingCart,
  HeartPulse,
  Car,
  BookOpen,
  Info,
} from "lucide-react"
import { useSession, signOut } from "next-auth/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, Settings, User as UserIcon, Rocket, LayoutDashboard, Database, Users, ScrollText, BarChart3 } from "lucide-react"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"

const folderIcons: Record<string, typeof FolderIcon> = {
  // Work
  work: Briefcase,
  office: Briefcase,
  business: Briefcase,
  // Personal
  personal: User,
  private: User,
  // School / Education
  school: GraduationCap,
  study: GraduationCap,
  education: GraduationCap,
  // Learning
  learning: BookOpen,
  reading: BookOpen,
  books: BookOpen,
  book: BookOpen,
  library: BookOpen,
  courses: BookOpen,
  course: BookOpen,
  // Music
  music: Music,
  songs: Music,
  audio: Music,
  // Photos
  photos: Image,
  images: Image,
  pictures: Image,
  // Videos
  videos: Video,
  movies: Video,
  films: Video,
  // Documents
  documents: FileText,
  docs: FileText,
  files: FileText,
  notes: FileText,
  // Downloads
  downloads: Download,
  // Projects / Code
  projects: Code2,
  software: Code2,
  // Recipes / Food
  recipes: Utensils,
  cooking: Utensils,
  food: Utensils,
  // Health / Medical
  health: HeartPulse,
  medical: HeartPulse,
  doctor: HeartPulse,
  // Fitness / Sports
  fitness: Dumbbell,
  sports: Dumbbell,
  gym: Dumbbell,
  workout: Dumbbell,
  // Finance
  finance: DollarSign,
  money: DollarSign,
  budget: DollarSign,
  // Travel
  travel: Plane,
  trips: Plane,
  vacation: Plane,
  itinerary: Plane,
  // Shopping
  shopping: ShoppingCart,
  stores: ShoppingCart,
  // Ideas
  ideas: Lightbulb,
  // Starred
  starred: Star,
  favorites: Star,
  // Automotive
  auto: Car,
  car: Car,
  vehicle: Car,
  garage: Car,
  // Information
  information: Info,
  info: Info,
  reference: Info,
  faq: Info,
  help: Info,
  wiki: Info,
  // Meetings
  meetings: Users,
  meeting: Users,
  conference: Users,
  agenda: Users,
  team: Users,
}

function getFolderIcon(name: string) {
  const key = name.toLowerCase().trim()
  if (folderIcons[key]) return folderIcons[key]
  for (const word of key.split(/[\s-_]+/)) {
    if (folderIcons[word]) return folderIcons[word]
  }
  return FolderIcon
}

const SortableNoteItem = ({ noteId, children }: { noteId: string; children: React.ReactNode }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: noteId })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: "relative" as const,
  }
  
  const child = React.Children.only(children) as React.ReactElement<{ style?: React.CSSProperties }>
  return React.cloneElement(child, {
    ref: setNodeRef,
    style: { ...child.props.style, ...style },
    ...attributes,
    ...listeners,
  } as any)
}

const SortableFolderItem = ({ folderId, dragType, children }: { folderId: string; dragType: string | null; children: React.ReactNode }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({ id: folderId })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: "relative" as const,
  }
  const indicatorClass = isOver && dragType === "note"
    ? "ring-2 ring-blue-500 rounded-md"
    : ""
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className={indicatorClass}
    >
      {children}
    </div>
  )
}

const workspaceItems = [
  { route: "/workspace/trash",          label: "Trash",            icon: Trash2 },
]

const adminItems = [
  { route: "/admin",           label: "Dashboard",        icon: LayoutDashboard },
  { route: "/admin/analytics", label: "Analytics",        icon: BarChart3 },
  { route: "/admin/backup",    label: "Backup & Restore", icon: Database },
  { route: "/admin/users",     label: "User Management",  icon: Users },
  { route: "/admin/audit",     label: "Audit Logs",       icon: ScrollText },
  { route: "/admin/settings",  label: "System Settings",  icon: Settings },
]

export default function NotesSidebar() {
  const {
    notes, folders, expandedFolders, createNote, deleteNote, updateNote,
    activeNoteId, setActiveNoteId, createFolder, renameFolder,
    deleteFolder, moveNote, moveFolder, toggleFolder,
  } = useNotes()

  const [search, setSearch] = useState("")
  const [searchOpen, setSearchOpen] = useState(false)
  const [deleteNoteTarget, setDeleteNoteTarget] = useState<string | null>(null)
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<Folder | null>(null)
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null)

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const renameInputRef = useRef<HTMLInputElement | null>(null)
  const ignoreNextBlurRef = useRef(false)

  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()



  const filtered = search
    ? notes.filter((n) => n.title.toLowerCase().includes(search.toLowerCase()))
    : notes

  const handleCreate = async () => {
    let targetFolderId: string | undefined
    let position: number | undefined
    if (activeFolderId) {
      targetFolderId = activeFolderId
    } else if (activeNoteId) {
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
    if (note) {
      if (targetFolderId && !expandedFolders.has(targetFolderId)) {
        toggleFolder(targetFolderId)
      }
      setActiveNoteId(note._id)
    }
  }

  const handleCreateRootNote = async () => {
    const rootNotes = notes.filter((n) => !n.folderId).sort((a, b) => a.position - b.position)
    const position = rootNotes.length > 0 ? rootNotes[rootNotes.length - 1].position + 1000 : 0
    const note = await createNote({ title: "Untitled Note", position })
    if (note) {
      setActiveNoteId(note._id)
      setRenamingId(note._id)
      setRenameValue("Untitled Note")
    }
  }

  const handleCreateInFolder = async (folderId: string) => {
    const folderNotes = notes
      .filter((n) => n.folderId === folderId)
      .sort((a, b) => a.position - b.position)
    const position = folderNotes.length > 0
      ? folderNotes[folderNotes.length - 1].position + 1000
      : 0
    const note = await createNote({ title: "Untitled Note", folderId, position })
    if (note) {
      if (!expandedFolders.has(folderId)) {
        toggleFolder(folderId)
      }
      setActiveNoteId(note._id)
      setRenamingId(note._id)
      setRenameValue("Untitled Note")
    }
  }

  const handleExportNote = async (noteId: string, noteTitle: string, format: "markdown" | "pdf") => {
    try {
      const res = await fetch(`/api/notes/${noteId}/export?format=${format}`)
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const ext = format === "markdown" ? "md" : "pdf"
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const safeName = noteTitle.replace(/[/\\?%*:|"<>]/g, "_")
      a.download = `${safeName}.${ext}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Export failed:", err)
    }
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

  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [activeDragType, setActiveDragType] = useState<"note" | "folder" | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 10 },
    })
  )

  const computeInsertPosition = (items: { position: number }[], targetIndex: number): number => {
    const before = items[targetIndex - 1]?.position ?? null
    const after = items[targetIndex]?.position ?? null
    if (before === null && after === null) return 1000
    if (before === null) return after! - 1000
    if (after === null) return before + 1000
    return (before + after) / 2
  }

  const computeInsertAfter = (items: { position: number }[], targetIndex: number): number => {
    const item = items[targetIndex]
    const next = items[targetIndex + 1]
    if (!item) return 1000
    if (!next) return item.position + 1000
    return (item.position + next.position) / 2
  }

  const handleDragStartFn = (event: DragStartEvent) => {
    const id = event.active.id as string
    setActiveDragId(id)
    setActiveDragType(folders.some((f) => f._id === id) ? "folder" : "note")
  }

  const handleDragEndFn = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDragId(null)
    setActiveDragType(null)

    if (!over || active.id === over.id) return

    const activeId = active.id as string
    const overId = over.id as string

    // Folder reorder
    if (folders.some((f) => f._id === activeId)) {
      const sorted = [...folders].sort((a, b) => a.position - b.position)
      const oldIdx = sorted.findIndex((f) => f._id === activeId)
      const newIdx = sorted.findIndex((f) => f._id === overId)
      if (oldIdx === -1 || newIdx === -1) return

      const target = sorted[newIdx]
      let pos: number
      if (oldIdx < newIdx) {
        const next = sorted[newIdx + 1]
        pos = next ? (target.position + next.position) / 2 : target.position + 1000
      } else {
        const prev = sorted[newIdx - 1]
        pos = prev ? (prev.position + target.position) / 2 : target.position - 1000
      }
      await moveFolder(activeId, pos)
      return
    }

    // Note move
    const noteToMove = notes.find((n) => n._id === activeId)
    if (!noteToMove) return

    // Dropped on a folder — append
    if (folders.some((f) => f._id === overId)) {
      const folderNotes = notes
        .filter((n) => n.folderId === overId)
        .sort((a, b) => a.position - b.position)
      const pos = folderNotes.length > 0 ? folderNotes[folderNotes.length - 1].position + 1000 : 0
      await moveNote(activeId, overId, pos)
      return
    }

    // Dropped on a note
    const overNote = notes.find((n) => n._id === overId)
    if (!overNote) return

    const targetFolderId = overNote.folderId ?? null
    const containerNotes = notes
      .filter((n) => targetFolderId === null ? !n.folderId : n.folderId === targetFolderId)
      .sort((a, b) => a.position - b.position)

    const oldIdx = containerNotes.findIndex((n) => n._id === activeId)
    const overIdx = containerNotes.findIndex((n) => n._id === overId)
    if (overIdx === -1) return

    let pos: number
    if (oldIdx === -1) {
      // Cross-container: insert before over item
      pos = computeInsertPosition(containerNotes, overIdx)
    } else if (oldIdx < overIdx) {
      // Dragging forward: match strategy gap — insert AFTER over item
      pos = computeInsertAfter(containerNotes, overIdx)
    } else {
      // Dragging backward: insert BEFORE over item
      pos = computeInsertPosition(containerNotes, overIdx)
    }

    await moveNote(activeId, targetFolderId, pos)
  }

  const handleRenameFromContextMenu = (id: string, name: string) => {
    ignoreNextBlurRef.current = true
    flushSync(() => {
      startRenaming(id, name)
    })
    requestAnimationFrame(() => {
      ignoreNextBlurRef.current = false
      renameInputRef.current?.focus()
    })
  }



  const renderNoteItem = (note: Note, noteIndex: number, parentFolderId: string | null, asRootItem = false) => {
    const Item = asRootItem ? SidebarMenuItem : SidebarMenuSubItem
    const Button = asRootItem ? SidebarMenuButton : SidebarMenuSubButton
    return (
      <Item key={note._id}>
        {renamingId === note._id ? (
          <Input
            ref={(el) => { renameInputRef.current = el }}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={() => { if (!ignoreNextBlurRef.current) finishRename(note._id) }}
            onKeyDown={(e) => { if (e.key === "Enter") finishRename(note._id); if (e.key === "Escape") cancelRename() }}
            autoFocus
            className={`h-6 text-xs px-1 ${asRootItem ? "my-1" : "mx-2 my-0.5"}`}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          />
        ) : (
          <ContextMenu>
            <ContextMenuTrigger render={
              <Button
                isActive={activeNoteId === note._id}
                className={asRootItem ? "data-active:font-normal" : undefined}
                onClick={() => { setActiveNoteId(note._id); setActiveFolderId(null); if (pathname !== "/") router.push("/") }}
                onDoubleClick={() => startRenaming(note._id, note.title)}
              >
                <span className="truncate">{note.title}</span>
              </Button>
            } />
            <ContextMenuContent>
              <ContextMenuItem onClick={() => handleRenameFromContextMenu(note._id, note.title)}>
                <Pencil /> Rename
              </ContextMenuItem>
              <ContextMenuItem onClick={(e) => { e.stopPropagation(); handleExportNote(note._id, note.title, "pdf") }}>
                <File /> Download PDF
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={(e) => { e.stopPropagation(); setDeleteNoteTarget(note._id) }}>
                <Trash2 /> Move to trash
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        )}
      </Item>
    )
  }

  const renderFolder = (folder: Folder) => {
    const folderNotes = filtered.filter((n) => n.folderId === folder._id)
    const isExpanded = expandedFolders.has(folder._id)
    const FolderIconForFolder = getFolderIcon(folder.name)

    return (
      <SortableFolderItem key={folder._id} folderId={folder._id} dragType={activeDragType}>
        <Collapsible
          open={isExpanded}
          onOpenChange={() => { toggleFolder(folder._id); setActiveFolderId(folder._id) }}
        >
          <SidebarGroup className="py-0">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <ContextMenu>
                    <ContextMenuTrigger render={
                      <CollapsibleTrigger render={<SidebarMenuButton isActive={activeFolderId === folder._id} />}>
                        <FolderIconForFolder />
                        {renamingId === folder._id ? (
                          <Input
                            ref={(el) => { renameInputRef.current = el }}
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => { if (!ignoreNextBlurRef.current) finishRename(folder._id) }}
                            onKeyDown={(e) => { if (e.key === "Enter") finishRename(folder._id); if (e.key === "Escape") cancelRename() }}
                            autoFocus
                            className="h-6 text-xs px-1"
                            onClick={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="flex-1 truncate text-left">{folder.name}</span>
                        )}
                      </CollapsibleTrigger>
                    } />
                    <ContextMenuContent>
                      <ContextMenuItem onClick={(e) => { e.stopPropagation(); handleCreateInFolder(folder._id) }}>
                        <Plus /> Create new note
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => handleRenameFromContextMenu(folder._id, folder.name)}>
                        <Pencil /> Rename
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem onClick={(e) => { e.stopPropagation(); setDeleteFolderTarget(folder) }}>
                        <Trash2 /> Move to trash
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                  {!renamingId && (
                    <SidebarMenuAction showOnHover={false} onClick={() => { toggleFolder(folder._id); setActiveFolderId(folder._id) }}>
                      {isExpanded ? <ChevronDown /> : <ChevronRight />}
                    </SidebarMenuAction>
                  )}
                </SidebarMenuItem>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {folderNotes.length === 0 && (
                      <SidebarMenuSubItem>
                        <span className="block px-2 py-1 text-xs text-sidebar-foreground/50">No notes</span>
                      </SidebarMenuSubItem>
                    )}
                    <SortableContext items={folderNotes.map(n => n._id)} strategy={verticalListSortingStrategy}>
                      {folderNotes.map((note, noteIndex) => (
                        <SortableNoteItem key={note._id} noteId={note._id}>
                          {renderNoteItem(note, noteIndex, folder._id)}
                        </SortableNoteItem>
                      ))}
                    </SortableContext>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </Collapsible>
      </SortableFolderItem>
    )
  }

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-1 py-1">
            <img src="/ZooNoteBar.png" alt="ZooNoteBar" className="size-6 rounded-sm" />
            <span className="text-sm font-semibold">ZooNoteBar</span>
          </div>
          <TooltipProvider delay={0}>
          <div className="flex items-center gap-0.5 px-1 pb-1">
            <Tooltip>
              <TooltipTrigger render={<Button variant="ghost" size="icon" onClick={handleCreateRootNote} />}>
                <FilePlus />
              </TooltipTrigger>
              <TooltipContent>New note</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger render={<Button variant="ghost" size="icon" onClick={handleCreateFolder} />}>
                <FolderIcon />
              </TooltipTrigger>
              <TooltipContent>New folder</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger render={<Button variant="ghost" size="icon" onClick={() => setSearchOpen(!searchOpen)} className={searchOpen ? "text-sidebar-accent-foreground" : ""} />}>
                <Search />
              </TooltipTrigger>
              <TooltipContent>Search</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger render={<Button variant="ghost" size="icon" onClick={() => folders.forEach((f) => { if (expandedFolders.has(f._id)) toggleFolder(f._id) })} />}>
                <ChevronsUpDown />
              </TooltipTrigger>
              <TooltipContent>Collapse all</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger render={<Button variant="ghost" size="icon" onClick={() => folders.forEach((f) => { if (!expandedFolders.has(f._id)) toggleFolder(f._id) })} />}>
                <ChevronsDownUp />
              </TooltipTrigger>
              <TooltipContent>Expand all</TooltipContent>
            </Tooltip>
          </div>
          </TooltipProvider>
          {searchOpen && (
            <div className="px-1 pb-2">
              <form onSubmit={(e) => e.preventDefault()}>
                <SidebarInput
                  placeholder="Search notes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </form>
            </div>
          )}
        </SidebarHeader>

        <SidebarContent>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStartFn}
            onDragEnd={handleDragEndFn}
          >
            <div className="px-3 py-1 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
              Notes
            </div>
            <SortableContext items={folders.map(f => f._id)} strategy={verticalListSortingStrategy}>
              {folders.map(renderFolder)}
            </SortableContext>
            {filtered.filter(n => !n.folderId).length > 0 && (
              <SidebarGroup className="py-0">
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SortableContext
                      items={filtered.filter(n => !n.folderId).map(n => n._id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {filtered.filter(n => !n.folderId).map((note, noteIndex) => (
                        <SortableNoteItem key={note._id} noteId={note._id}>
                          {renderNoteItem(note, noteIndex, null, true)}
                        </SortableNoteItem>
                      ))}
                    </SortableContext>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* DragOverlay */}
            <DragOverlay
              dropAnimation={{
                duration: 200,
                easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
              }}
            >
              {activeDragId && activeDragType === "folder" ? (
                <div className="flex items-center gap-2 px-3 py-1.5 text-sm bg-sidebar-accent/80 rounded-md shadow-md backdrop-blur-sm">
                  <FolderIcon className="size-4" />
                  <span className="truncate">{folders.find(f => f._id === activeDragId)?.name}</span>
                </div>
              ) : activeDragId && activeDragType === "note" ? (
                <div className="flex items-center gap-2 px-3 py-1.5 text-sm bg-sidebar-accent/80 rounded-md shadow-md backdrop-blur-sm">
                  <StickyNote className="size-4" />
                  <span className="truncate">{notes.find(n => n._id === activeDragId)?.title}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          {/* Workspace section — visible to all authenticated users */}
          <SidebarSeparator className="my-2" />
          <div className="px-3 py-1 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
            Workspace
          </div>
          <SidebarGroup className="py-0">
            <SidebarGroupContent>
              <SidebarMenu>
                {workspaceItems.map((item) => (
                  <SidebarMenuItem key={item.route}>
                    <SidebarMenuButton render={<Link href={item.route} />} isActive={pathname.startsWith(item.route)}>
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Admin section — admin users only */}
          {session?.user?.role === "admin" && (
            <>
              <SidebarSeparator className="my-2" />
              <div className="px-3 py-1 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                Admin
              </div>
              <SidebarGroup className="py-0">
                <SidebarGroupContent>
                  <SidebarMenu>
                    {adminItems.map((item) => (
                      <SidebarMenuItem key={item.route}>
                        <SidebarMenuButton render={<Link href={item.route} />} isActive={item.route === "/admin" ? pathname === "/admin" : pathname.startsWith(item.route)}>
                          <item.icon />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </>
          )}
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger render={<SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    {session?.user?.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{session?.user?.name || "User"}</span>
                    <span className="truncate text-xs">{(session?.user as { role?: string })?.role || ""}</span>
                  </div>
                </SidebarMenuButton>} />
                <DropdownMenuContent
                  className="min-w-56 rounded-lg"
                  side="top"
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="p-0 font-normal">
                      <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                          {session?.user?.name?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                          <span className="truncate font-semibold">{session?.user?.name || "User"}</span>
                          <span className="truncate text-xs">{session?.user?.email || ""}</span>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled>
                    <Settings /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>
                    <UserIcon /> Account
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>
                    <Rocket /> Upgrade to Pro
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => signOut()}>
                    <LogOut /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <DeleteConfirmDialog open={deleteNoteTarget !== null} onClose={() => setDeleteNoteTarget(null)} onConfirm={handleDeleteNote} />
      <DeleteFolderDialog open={deleteFolderTarget !== null} folderName={deleteFolderTarget?.name || ""}
        notesCount={deleteFolderTarget ? notes.filter((n) => n.folderId === deleteFolderTarget._id).length : 0}
        onClose={() => setDeleteFolderTarget(null)} onConfirm={handleDeleteFolder} />
    </>
  )
}
