"use client"

import React, { useState, useMemo } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useNotes } from "@/contexts/NoteContext"
import { cn } from "@/lib/utils"
import { FileText, Star, Search, Plus, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Note } from "@/types"

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diffMs = now - date
  const diffSeconds = Math.floor(diffMs / 1000)
  if (diffSeconds < 60) return "just now"
  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 14) return `${diffDays}d ago`
  const diffWeeks = Math.floor(diffDays / 7)
  if (diffWeeks < 8) return `${diffWeeks}w ago`
  return new Date(dateStr).toLocaleDateString()
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim()
}

interface NoteSectionProps {
  title: string
  icon: React.ReactNode
  notes: Note[]
  viewAllHref: string
  emptyMessage: string
  onNoteClick: (id: string) => void
}

function NoteSection({ title, icon, notes, viewAllHref, emptyMessage, onNoteClick }: NoteSectionProps) {
  const router = useRouter()

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        <button
          onClick={() => router.push(viewAllHref)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">{emptyMessage}</p>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div
              key={note._id}
              onClick={() => onNoteClick(note._id)}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
            >
              {icon}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{note.title || "Untitled"}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {stripHtml(note.content) || "No content"}
                </p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {formatRelativeTime(note.updatedAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default function HomePage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { notes, loading, error, setActiveNoteId, createNote, fetchNotes, expandedFolders, toggleFolder } = useNotes()
  const [searchQuery, setSearchQuery] = useState("")

  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [notes])

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return sortedNotes
    const query = searchQuery.toLowerCase()
    return sortedNotes.filter(
      (note) =>
        note.title.toLowerCase().includes(query) ||
        stripHtml(note.content).toLowerCase().includes(query)
    )
  }, [sortedNotes, searchQuery])

  const handleCreateNote = async () => {
    const note = await createNote({ title: "Untitled" })
    if (note) setActiveNoteId(note._id)
  }

  const handleNoteClick = (id: string) => {
    const note = notes.find((n) => n._id === id)
    if (note?.folderId && !expandedFolders.has(note.folderId)) {
      toggleFolder(note.folderId)
    }
    setActiveNoteId(id)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-destructive">{error}</p>
          <Button variant="outline" onClick={() => fetchNotes()}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="px-4 sm:px-6 md:px-8 lg:px-10 py-8 sm:py-12 space-y-8 w-full md:max-w-[900px] lg:max-w-[1140px]">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <Image
            src="/ZooNote.png"
            alt="ZooNote"
            width={160}
            height={160}
            className="rounded-xl mx-auto"
            priority
          />
          <h1 className="text-2xl sm:text-3xl font-bold">Welcome {session?.user?.name?.split(" ")[0] || "Back"}</h1>
          <p className="text-muted-foreground">Ready to capture your ideas?</p>
          <Button onClick={handleCreateNote} className="gap-2">
            <Plus className="h-4 w-4" />
            Create New Note
          </Button>
        </div>

        {/* Search Bar */}
        <div className="max-w-md mx-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes..."
            className="pl-9"
          />
        </div>

        {/* Sections - Mobile */}
        <div className="space-y-8 sm:hidden">
          <NoteSection
            title="Recent Notes"
            icon={<FileText className="h-5 w-5 text-primary" />}
            notes={filteredNotes.slice(0, 5)}
            viewAllHref="/recent"
            emptyMessage={searchQuery ? "No notes match your search" : "No recent notes yet. Create your first note!"}
            onNoteClick={handleNoteClick}
          />
          <NoteSection
            title="Favorites"
            icon={<Star className="h-5 w-5 text-amber-500" />}
            notes={filteredNotes}
            viewAllHref="/favorites"
            emptyMessage={searchQuery ? "No notes match your search" : "No favorite notes yet. Star notes to see them here!"}
            onNoteClick={handleNoteClick}
          />
        </div>

        {/* Sections - Desktop */}
        <div className="hidden sm:grid sm:grid-cols-2 gap-6">
          <NoteSection
            title="Recent Notes"
            icon={<FileText className="h-5 w-5 text-primary" />}
            notes={filteredNotes.slice(0, 5)}
            viewAllHref="/recent"
            emptyMessage={searchQuery ? "No notes match your search" : "No recent notes yet. Create your first note!"}
            onNoteClick={handleNoteClick}
          />
          <NoteSection
            title="Favorites"
            icon={<Star className="h-5 w-5 text-amber-500" />}
            notes={filteredNotes}
            viewAllHref="/favorites"
            emptyMessage={searchQuery ? "No notes match your search" : "No favorite notes yet. Star notes to see them here!"}
            onNoteClick={handleNoteClick}
          />
        </div>
      </div>
    </div>
  )
}
