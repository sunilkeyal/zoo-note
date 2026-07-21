"use client"

import React, { useState, useRef, useEffect } from "react"
import { flushSync } from "react-dom"
import { useSidebarKeyboardNav } from "@/hooks/use-sidebar-keyboard-nav"
import { useMultiSelect } from "@/hooks/use-multi-select"

import BulkDeleteDialog from "./BulkDeleteDialog"
import { toast } from "sonner"
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  TouchSensor,
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
import AccountSheet from "./AccountSheet"
import SettingsSheet from "@/components/SettingsSheet"
import ImportExportSheet from "./ImportExportSheet"
import { useSidebarDensity, type SidebarDensity } from "@/hooks/use-sidebar-density"
import DeleteConfirmDialog from "./DeleteConfirmDialog"
import DeleteFolderDialog from "./DeleteFolderDialog"
import EmptyTrashDialog from "./EmptyTrashDialog"
import SearchDropdown from "@/components/SearchDropdown"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { stripHtml } from "@/lib/utils"
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
  House,
  Clock,
  CalendarDays,
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
  RotateCcw,
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
import { LogOut, Settings, User as UserIcon, Rocket, LayoutDashboard, Database, Users, ScrollText, Upload } from "lucide-react"

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

const folderIconColors: Record<string, string> = {
  work: "text-blue-600 dark:text-blue-500",
  office: "text-blue-600 dark:text-blue-500",
  business: "text-blue-600 dark:text-blue-500",
  personal: "text-purple-600 dark:text-purple-500",
  private: "text-purple-600 dark:text-purple-500",
  school: "text-amber-700 dark:text-amber-600",
  study: "text-amber-700 dark:text-amber-600",
  education: "text-amber-700 dark:text-amber-600",
  learning: "text-emerald-600 dark:text-emerald-500",
  reading: "text-emerald-600 dark:text-emerald-500",
  books: "text-emerald-600 dark:text-emerald-500",
  book: "text-emerald-600 dark:text-emerald-500",
  library: "text-emerald-600 dark:text-emerald-500",
  courses: "text-emerald-600 dark:text-emerald-500",
  course: "text-emerald-600 dark:text-emerald-500",
  music: "text-pink-600 dark:text-pink-500",
  songs: "text-pink-600 dark:text-pink-500",
  audio: "text-pink-600 dark:text-pink-500",
  photos: "text-sky-700 dark:text-sky-600",
  images: "text-sky-700 dark:text-sky-600",
  pictures: "text-sky-700 dark:text-sky-600",
  videos: "text-red-600 dark:text-red-500",
  movies: "text-red-600 dark:text-red-500",
  films: "text-red-600 dark:text-red-500",
  documents: "text-stone-700 dark:text-stone-600",
  docs: "text-stone-700 dark:text-stone-600",
  files: "text-stone-700 dark:text-stone-600",
  notes: "text-stone-700 dark:text-stone-600",
  downloads: "text-cyan-700 dark:text-cyan-600",
  projects: "text-indigo-600 dark:text-indigo-500",
  software: "text-indigo-600 dark:text-indigo-500",
  recipes: "text-orange-600 dark:text-orange-500",
  cooking: "text-orange-600 dark:text-orange-500",
  food: "text-orange-600 dark:text-orange-500",
  health: "text-rose-600 dark:text-rose-500",
  medical: "text-rose-600 dark:text-rose-500",
  doctor: "text-rose-600 dark:text-rose-500",
  fitness: "text-lime-700 dark:text-lime-600",
  sports: "text-lime-700 dark:text-lime-600",
  gym: "text-lime-700 dark:text-lime-600",
  workout: "text-lime-700 dark:text-lime-600",
  finance: "text-yellow-700 dark:text-yellow-600",
  money: "text-yellow-700 dark:text-yellow-600",
  budget: "text-yellow-700 dark:text-yellow-600",
  travel: "text-teal-600 dark:text-teal-500",
  trips: "text-teal-600 dark:text-teal-500",
  vacation: "text-teal-600 dark:text-teal-500",
  itinerary: "text-teal-600 dark:text-teal-500",
  shopping: "text-rose-600 dark:text-rose-500",
  stores: "text-rose-600 dark:text-rose-500",
  ideas: "text-yellow-700 dark:text-yellow-600",
  starred: "text-amber-700 dark:text-amber-600",
  favorites: "text-amber-700 dark:text-amber-600",
  auto: "text-slate-700 dark:text-slate-600",
  car: "text-slate-700 dark:text-slate-600",
  vehicle: "text-slate-700 dark:text-slate-600",
  garage: "text-slate-700 dark:text-slate-600",
  information: "text-blue-500 dark:text-blue-400",
  info: "text-blue-500 dark:text-blue-400",
  reference: "text-blue-500 dark:text-blue-400",
  faq: "text-blue-500 dark:text-blue-400",
  help: "text-blue-500 dark:text-blue-400",
  wiki: "text-blue-500 dark:text-blue-400",
  meetings: "text-violet-600 dark:text-violet-500",
  meeting: "text-violet-600 dark:text-violet-500",
  conference: "text-violet-600 dark:text-violet-500",
  agenda: "text-violet-600 dark:text-violet-500",
  team: "text-violet-600 dark:text-violet-500",
}

function getFolderIcon(name: string) {
  const key = name.toLowerCase().trim()
  if (folderIcons[key]) return folderIcons[key]
  for (const word of key.split(/[\s-_]+/)) {
    if (folderIcons[word]) return folderIcons[word]
  }
  return FolderIcon
}

function getFolderIconColor(name: string): string {
  const key = name.toLowerCase().trim()
  if (folderIconColors[key]) return folderIconColors[key]
  for (const word of key.split(/[\s-_]+/)) {
    if (folderIconColors[word]) return folderIconColors[word]
  }
  return "text-sidebar-foreground"
}

const SortableNoteItem = ({ noteId, children }: { noteId: string; children: React.ReactNode }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: noteId })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: "relative" as const,
  }
  const { tabIndex: _sortableTabIndex, ...restAttributes } = attributes
  const child = React.Children.only(children) as React.ReactElement<{ style?: React.CSSProperties }>
  return React.cloneElement(child, {
    ref: setNodeRef,
    style: { ...child.props.style, ...style },
    ...restAttributes,
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
  const { tabIndex: _sortableTabIndex, ...restAttributes } = attributes
  return (
    <div ref={setNodeRef} style={style} {...restAttributes} {...listeners}
      className={indicatorClass}
    >
      {children}
    </div>
  )
}

const adminItems = [
  { route: "/admin",           label: "Dashboard",        icon: LayoutDashboard, iconColor: "text-violet-600 dark:text-violet-500" },
  { route: "/admin/imports",   label: "Import Jobs",      icon: Upload,          iconColor: "text-purple-600 dark:text-purple-500" },
  { route: "/admin/backup",    label: "Backup & Restore", icon: Database,        iconColor: "text-teal-600 dark:text-teal-500" },
  { route: "/admin/users",     label: "User Management",  icon: Users,           iconColor: "text-blue-600 dark:text-blue-500" },
  { route: "/admin/audit",     label: "Audit Logs",       icon: ScrollText,      iconColor: "text-orange-600 dark:text-orange-500" },
  { route: "/admin/settings",  label: "System Settings",  icon: Settings,        iconColor: "text-slate-700 dark:text-slate-600" },
]

function navItemClass(density: SidebarDensity): string {
  const base = "transition-all duration-100"
  if (density === "default") return `${base} h-[28px]! px-[10px]! py-[3px]! text-[13px]! gap-[6px]!`
  if (density === "compact") return `${base} h-[24px]! px-[8px]! py-[2px]! text-[12px]! gap-[4px]!`
  return base
}

function subItemClass(density: SidebarDensity): string {
  const base = "transition-all duration-100"
  if (density === "default") return `${base} h-[24px]! px-[8px]! py-[2px]! text-[13px]!`
  if (density === "compact") return `${base} h-[20px]! px-[6px]! py-[1px]! text-[12px]!`
  return base
}

export default function NotesSidebar() {
  const {
    notes, folders, expandedFolders, createNote, deleteNote, updateNote,
    activeNoteId, setActiveNoteId, createFolder, renameFolder,
    deleteFolder, moveNote, moveFolder, toggleFolder, favoriteNotes, toggleFavorite,
    trashItems, restoreItems, permanentDeleteItems,
  } = useNotes()

  const [search, setSearch] = useState("")
  const [searchOpen, setSearchOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [deleteNoteTarget, setDeleteNoteTarget] = useState<string | null>(null)
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<Folder | null>(null)
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
  const [searchFocused, setSearchFocused] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const renameInputRef = useRef<HTMLInputElement | null>(null)
  const ignoreNextBlurRef = useRef(false)

  const { data: session } = useSession()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [importExportOpen, setImportExportOpen] = useState(false)
  const [emptyTrashDialogOpen, setEmptyTrashDialogOpen] = useState(false)
  const { density, setDensity } = useSidebarDensity()
  const pathname = usePathname()
  const router = useRouter()

  const { selectedIds, lastSelectedId, isSelecting, toggleSelect, selectRange, selectAll, clearSelection } = useMultiSelect()
  const [bulkDeleteTarget, setBulkDeleteTarget] = useState<{ notes: string[]; folders: string[] } | null>(null)
  const skipNextClearRef = useRef(false)
  const preSelectIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (skipNextClearRef.current) {
      skipNextClearRef.current = false
      return
    }
    clearSelection()
  }, [pathname, clearSelection])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isSelecting) {
        e.stopPropagation()
        preSelectIdRef.current = null
        clearSelection()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "a" && isSelecting) {
        e.preventDefault()
        const allIds = [
          ...folders.flatMap((f) => [f._id, ...notes.filter((n) => n.folderId === f._id).map((n) => n._id)]),
          ...notes.filter((n) => !n.folderId).map((n) => n._id),
        ]
        selectAll(allIds)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isSelecting, clearSelection, selectAll, folders, notes])



  const trashNoteCount = trashItems.notes.length
  const trashFolderCount = trashItems.folders.length
  const trashTotalCount = trashNoteCount + trashFolderCount
  const trashCountLabel = trashTotalCount === 0
    ? "Trash is empty"
    : [
        trashNoteCount > 0 ? `${trashNoteCount} note${trashNoteCount !== 1 ? "s" : ""}` : null,
        trashFolderCount > 0 ? `${trashFolderCount} folder${trashFolderCount !== 1 ? "s" : ""}` : null,
      ].filter(Boolean).join(", ")

  const query = search.toLowerCase()
  const filtered = search
    ? notes.filter((n) =>
        n.title.toLowerCase().includes(query) ||
        stripHtml(n.content).toLowerCase().includes(query)
      )
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

  const handleSearchResultClick = (noteId: string) => {
    const note = notes.find((n) => n._id === noteId)
    if (note?.folderId && !expandedFolders.has(note.folderId)) {
      toggleFolder(note.folderId)
    }
    setActiveNoteId(noteId)
    setActiveFolderId(null)
    const searchParam = search ? `?q=${encodeURIComponent(search)}` : ""
    router.push(`/notes/${noteId}${searchParam}`)
    setSearchOpen(false)
    setSearchFocused(false)
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
    if (activeNoteId === deleteNoteTarget) {
      setActiveNoteId(null)
      router.push("/")
    }
    setDeleteNoteTarget(null)
  }

  const handleDeleteFolder = async () => {
    if (!deleteFolderTarget) return
    await deleteFolder(deleteFolderTarget._id)
    if (activeNoteId && notes.find((n) => n._id === activeNoteId && n.folderId === deleteFolderTarget._id)) {
      setActiveNoteId(null)
      router.push("/")
    }
    setDeleteFolderTarget(null)
  }

  const startRenaming = (id: string, currentName: string) => {
    clearSelection()
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

  const sidebarRef = useRef<HTMLDivElement>(null)
  useSidebarKeyboardNav(sidebarRef)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 10 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 300,
        tolerance: 8,
      },
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
    clearSelection()
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
                className={`${asRootItem ? `data-active:font-normal ${navItemClass(density)}` : subItemClass(density)} ${
  selectedIds.has(note._id) ? "!bg-stone-300 dark:!bg-stone-700" : ""
}`}
                onClick={(e) => {
  if (e.shiftKey || e.ctrlKey || e.metaKey) {
    e.preventDefault()
    const allSidebarIds = [
      ...folders.flatMap((f) => [f._id, ...notes.filter((n) => n.folderId === f._id).map((n) => n._id)]),
      ...notes.filter((n) => !n.folderId).map((n) => n._id),
    ]
    if (preSelectIdRef.current && preSelectIdRef.current !== note._id) {
      toggleSelect(preSelectIdRef.current)
    }
    preSelectIdRef.current = null
    if (e.shiftKey) {
      selectRange(note._id, allSidebarIds)
    } else {
      toggleSelect(note._id)
    }
  } else {
    if (isSelecting) clearSelection()
    preSelectIdRef.current = note._id
    setActiveNoteId(note._id)
    setActiveFolderId(null)
    setSearchOpen(false)
    skipNextClearRef.current = true
    router.push(`/notes/${note._id}`)
  }
}}
                onDoubleClick={() => startRenaming(note._id, note.title)}
                data-sidebar-nav-item={`note-${note._id}`}
                role="treeitem"
              >
                <StickyNote className="size-3.5 text-stone-400 dark:text-stone-500 shrink-0" />
                <span className="truncate">{note.title}</span>
                {note.isFavorite && (
                  <span className="flex items-center">
                    <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                  </span>
                )}
              </Button>
            } />
            <ContextMenuContent>
              {isSelecting ? (
                <>
                  <ContextMenuGroup>
                    <ContextMenuLabel className="text-xs text-muted-foreground">
                      {selectedIds.size} item{selectedIds.size !== 1 ? "s" : ""} selected
                    </ContextMenuLabel>
                  </ContextMenuGroup>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={(e) => {
                    e.stopPropagation()
                    const noteIds = [...selectedIds].filter((id) => notes.some((n) => n._id === id))
                    Promise.all(noteIds.map((id) => toggleFavorite(id)))
                    clearSelection()
                    toast.success(`${noteIds.length} note${noteIds.length !== 1 ? "s" : ""} updated`)
                  }}>
                    <Star /> Add to Favorites
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      const noteIds = [...selectedIds].filter((id) => notes.some((n) => n._id === id))
                      const folderIds = [...selectedIds].filter((id) => {
                        if (!folders.some((f) => f._id === id)) return false
                        return !noteIds.some((nid) => {
                          const note = notes.find((n) => n._id === nid)
                          return note?.folderId === id
                        })
                      })
                      setBulkDeleteTarget({ notes: noteIds, folders: folderIds })
                    }}
                  >
                    <Trash2 /> Move to Trash ({selectedIds.size})
                  </ContextMenuItem>
                </>
              ) : (
                <>
                  <ContextMenuItem onClick={() => handleRenameFromContextMenu(note._id, note.title)}>
                    <Pencil /> Rename
                  </ContextMenuItem>
                  <ContextMenuItem onClick={(e) => { e.stopPropagation(); handleExportNote(note._id, note.title, "pdf") }}>
                    <File /> Download PDF
                  </ContextMenuItem>
                  <ContextMenuItem onClick={(e) => { e.stopPropagation(); toggleFavorite(note._id) }}>
                    {note.isFavorite ? (
                      <><Star className="h-4 w-4 text-amber-500 fill-amber-500" /> Remove from Favorite</>
                    ) : (
                      <><Star className="h-4 w-4" /> Add to Favorite</>
                    )}
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={(e) => { e.stopPropagation(); setDeleteNoteTarget(note._id) }}>
                    <Trash2 /> Move to trash
                  </ContextMenuItem>
                </>
              )}
            </ContextMenuContent>
          </ContextMenu>
        )}
      </Item>
    )
  }

  const renderFolder = (folder: Folder) => {
    const folderNotes = notes.filter((n) => n.folderId === folder._id)
    const isExpanded = expandedFolders.has(folder._id)
    const FolderIconForFolder = getFolderIcon(folder.name)

    const handleFolderSelect = (e: React.MouseEvent) => {
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        e.preventDefault()
        e.stopPropagation()
        const allSidebarIds = [
          ...folders.flatMap((f) => [f._id, ...notes.filter((n) => n.folderId === f._id).map((n) => n._id)]),
          ...notes.filter((n) => !n.folderId).map((n) => n._id),
        ]
        if (e.shiftKey) {
          selectRange(folder._id, allSidebarIds)
        } else {
          toggleSelect(folder._id)
        }
      } else if (isSelecting) {
        clearSelection()
      }
    }

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
                      <CollapsibleTrigger render={<SidebarMenuButton isActive={activeFolderId === folder._id} className={`${navItemClass(density)} ${selectedIds.has(folder._id) ? "!bg-stone-300 dark:!bg-stone-700" : ""}`} data-sidebar-nav-item={`folder-${folder._id}`} aria-expanded={isExpanded} role="treeitem" onClick={handleFolderSelect} />}>
                        <FolderIconForFolder className={getFolderIconColor(folder.name)} />
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
                      {isSelecting ? (
                        <>
                          <ContextMenuGroup>
                            <ContextMenuLabel className="text-xs text-muted-foreground">
                              {selectedIds.size} item{selectedIds.size !== 1 ? "s" : ""} selected
                            </ContextMenuLabel>
                          </ContextMenuGroup>
                          <ContextMenuSeparator />
                          <ContextMenuItem onClick={(e) => {
                            e.stopPropagation()
                            const noteIds = [...selectedIds].filter((id) => notes.some((n) => n._id === id))
                            Promise.all(noteIds.map((id) => toggleFavorite(id)))
                            clearSelection()
                            toast.success(`${noteIds.length} note${noteIds.length !== 1 ? "s" : ""} updated`)
                          }}>
                            <Star /> Add to Favorites
                          </ContextMenuItem>
                          <ContextMenuSeparator />
                          <ContextMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              const noteIds = [...selectedIds].filter((id) => notes.some((n) => n._id === id))
                              const folderIds = [...selectedIds].filter((id) => {
                                if (!folders.some((f) => f._id === id)) return false
                                return !noteIds.some((nid) => {
                                  const note = notes.find((n) => n._id === nid)
                                  return note?.folderId === id
                                })
                              })
                              setBulkDeleteTarget({ notes: noteIds, folders: folderIds })
                            }}
                          >
                            <Trash2 /> Move to Trash ({selectedIds.size})
                          </ContextMenuItem>
                        </>
                      ) : (
                        <>
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
                        </>
                      )}
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
      <Sidebar collapsible="icon" ref={sidebarRef}>
        <SidebarHeader>
          <div className="flex items-center gap-2 px-1 py-1">
            <img src="/ZooNote.png" alt="ZooNote" className="size-6 rounded-sm" />
            <span className="text-sm font-semibold">ZooNote</span>
          </div>
          <TooltipProvider delay={0}>
          <div className="flex items-center gap-0.5 px-1 pb-1" role="toolbar" aria-label="Sidebar actions">
            <Tooltip>
              <TooltipTrigger render={<Button variant="ghost" size="icon" onClick={handleCreateRootNote} data-sidebar-nav-item="new-note" role="menuitem" />}>
                <Plus />
              </TooltipTrigger>
              <TooltipContent>New note</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger render={<Button variant="ghost" size="icon" onClick={handleCreateFolder} data-sidebar-nav-item="new-folder" role="menuitem" />}>
                <FolderIcon />
              </TooltipTrigger>
              <TooltipContent>New folder</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger render={<Button variant="ghost" size="icon" onClick={() => { setSearchOpen(!searchOpen); setSearchFocused(false); setSearch("") }} className={searchOpen ? "text-sidebar-accent-foreground" : ""} data-sidebar-nav-item="search" role="menuitem" />}>
                <Search />
              </TooltipTrigger>
              <TooltipContent>Search</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger render={<Button variant="ghost" size="icon" onClick={() => folders.forEach((f) => { if (!expandedFolders.has(f._id)) toggleFolder(f._id) })} />}>
                <ChevronsDownUp />
              </TooltipTrigger>
              <TooltipContent>Expand all</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger render={<Button variant="ghost" size="icon" onClick={() => folders.forEach((f) => { if (expandedFolders.has(f._id)) toggleFolder(f._id) })} />}>
                <ChevronsUpDown />
              </TooltipTrigger>
              <TooltipContent>Collapse all</TooltipContent>
            </Tooltip>
          </div>
          </TooltipProvider>
          {searchOpen && (
            <div className="px-1 pb-2">
              <form onSubmit={(e) => e.preventDefault()} className="relative">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <SidebarInput
                    ref={searchInputRef}
                    placeholder="Search notes..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setSearchFocused(true) }}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                    autoFocus
                    className="pl-7"
                  />
                </div>
                <SearchDropdown
                  open={searchOpen && searchFocused && search.trim().length > 0}
                  query={search}
                  results={filtered}
                  onSelect={handleSearchResultClick}
                  onClose={() => setSearchFocused(false)}
                  variant="sidebar"
                />
              </form>
            </div>
          )}
        </SidebarHeader>

        <SidebarContent>
          <SidebarSeparator className="mb-2 mt-0" />

          {/* Primary navigation */}
          <SidebarGroup className="py-0">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton render={<Link href="/" />} isActive={pathname === "/"} onClick={() => { setActiveNoteId(null); setActiveFolderId(null); setSearchOpen(false) }} className={navItemClass(density)} data-sidebar-nav-item="home" aria-current={pathname === "/" ? "page" : undefined}>
                    <House className="text-indigo-600 dark:text-indigo-500" />
                    <span>Home</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton render={<Link href="/favorites" />} isActive={pathname.startsWith("/favorites")} onClick={() => setSearchOpen(false)} className={navItemClass(density)} data-sidebar-nav-item="favorites" aria-current={pathname.startsWith("/favorites") ? "page" : undefined}>
                    <Star className="text-amber-700 dark:text-amber-600" />
                    <span>Favorites</span>
                    {favoriteNotes.length > 0 && (
                      <span className="ml-auto text-xs bg-sidebar-accent text-sidebar-accent-foreground rounded-full px-2 py-0.5">
                        {favoriteNotes.length}
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton render={<Link href="/recent" />} isActive={pathname.startsWith("/recent")} onClick={() => setSearchOpen(false)} className={navItemClass(density)} data-sidebar-nav-item="recent" aria-current={pathname.startsWith("/recent") ? "page" : undefined}>
                    <Clock className="text-emerald-600 dark:text-emerald-500" />
                    <span>Recent</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator className="my-2" />

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStartFn}
            onDragEnd={handleDragEndFn}
          >
            <div role="tree" aria-label="Notes and folders">
            <SortableContext items={folders.map(f => f._id)} strategy={verticalListSortingStrategy}>
              {folders.map(renderFolder)}
            </SortableContext>
            {notes.filter(n => !n.folderId).length > 0 && (
              <SidebarGroup className="py-0">
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SortableContext
                      items={notes.filter(n => !n.folderId).map(n => n._id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {notes.filter(n => !n.folderId).map((note, noteIndex) => (
                        <SortableNoteItem key={note._id} noteId={note._id}>
                          {renderNoteItem(note, noteIndex, null, true)}
                        </SortableNoteItem>
                      ))}
                    </SortableContext>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
            </div>

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

          {(folders.length > 0 || notes.length > 0) && (
            <SidebarSeparator className="my-2" />
          )}

          {/* Trash */}
          <SidebarGroup className="py-0">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <ContextMenu>
                    <ContextMenuTrigger render={
                      <SidebarMenuButton render={<Link href="/trash" />} isActive={pathname.startsWith("/trash")} onClick={() => setSearchOpen(false)} className={navItemClass(density)} data-sidebar-nav-item="trash" aria-current={pathname.startsWith("/trash") ? "page" : undefined}>
                        <Trash2 className="text-rose-600 dark:text-rose-500" />
                        <span>Trash</span>
                      </SidebarMenuButton>
                    } />
                    <ContextMenuContent>
                      <ContextMenuGroup>
                        <ContextMenuLabel className="text-xs text-muted-foreground">{trashCountLabel}</ContextMenuLabel>
                      </ContextMenuGroup>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        disabled={trashTotalCount === 0}
                        onClick={() => restoreItems(
                          trashItems.notes.map((n) => n._id),
                          trashItems.folders.map((f) => f._id),
                        )}
                      >
                        <RotateCcw /> Restore All
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        disabled={trashTotalCount === 0}
                        className="text-rose-600 focus:text-rose-600 dark:text-rose-500 dark:focus:text-rose-500"
                        onClick={() => setEmptyTrashDialogOpen(true)}
                      >
                        <Trash2 /> Empty Trash
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuGroup>
                        <ContextMenuLabel className="text-xs text-muted-foreground italic">Auto-purges after 7 days</ContextMenuLabel>
                      </ContextMenuGroup>
                    </ContextMenuContent>
                  </ContextMenu>
                </SidebarMenuItem>
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
              <SidebarGroup className="py-0" role="menu" aria-label="Admin">
                <SidebarGroupContent>
                  <SidebarMenu>
                    {adminItems.map((item) => (
                      <SidebarMenuItem key={item.route}>
                        <SidebarMenuButton render={<Link href={item.route} />} isActive={item.route === "/admin" ? pathname === "/admin" : pathname.startsWith(item.route)} className={navItemClass(density)} data-sidebar-nav-item={`admin-${item.route}`} role="menuitem">
                          <item.icon className={item.iconColor} />
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
          <SidebarSeparator />
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger render={<SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground" data-sidebar-nav-item="footer-menu">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    {session?.user?.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{session?.user?.name || "User"}</span>
                    <span className="truncate text-xs">{(session?.user as { role?: string })?.role || ""}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
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
                  <DropdownMenuItem onClick={() => setAccountOpen(true)}>
                    <UserIcon /> Account
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                    <Settings /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setImportExportOpen(true)}>
                    <Upload /> Import / Export
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

      <AccountSheet open={accountOpen} onClose={() => setAccountOpen(false)} />
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} density={density} onDensityChange={setDensity} />
      <ImportExportSheet open={importExportOpen} onClose={() => setImportExportOpen(false)} />
      <DeleteConfirmDialog open={deleteNoteTarget !== null} onClose={() => setDeleteNoteTarget(null)} onConfirm={handleDeleteNote} />
      <DeleteFolderDialog open={deleteFolderTarget !== null} folderName={deleteFolderTarget?.name || ""}
        notesCount={deleteFolderTarget ? notes.filter((n) => n.folderId === deleteFolderTarget._id).length : 0}
        onClose={() => setDeleteFolderTarget(null)} onConfirm={handleDeleteFolder} />
      <EmptyTrashDialog
        open={emptyTrashDialogOpen}
        noteCount={trashNoteCount}
        folderCount={trashFolderCount}
        onConfirm={() => {
          permanentDeleteItems(
            trashItems.notes.map((n) => n._id),
            trashItems.folders.map((f) => f._id),
          )
          setEmptyTrashDialogOpen(false)
        }}
        onCancel={() => setEmptyTrashDialogOpen(false)}
      />
      <BulkDeleteDialog
        open={bulkDeleteTarget !== null}
        noteCount={bulkDeleteTarget?.notes.length ?? 0}
        folderCount={bulkDeleteTarget?.folders.length ?? 0}
        onClose={() => setBulkDeleteTarget(null)}
        onConfirm={async () => {
          if (!bulkDeleteTarget) return
          const { notes: noteIds, folders: folderIds } = bulkDeleteTarget
          const count = noteIds.length + folderIds.length
          await Promise.all([
            ...noteIds.map((id) => deleteNote(id)),
            ...folderIds.map((id) => deleteFolder(id)),
          ])
          if (noteIds.includes(activeNoteId ?? "")) {
            setActiveNoteId(null)
            router.push("/")
          }
          setBulkDeleteTarget(null)
          clearSelection()
          toast.success(`${count} item${count !== 1 ? "s" : ""} moved to trash`)
        }}
      />
    </>
  )
}
