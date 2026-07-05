"use client"

import React, { useEffect, Suspense } from "react"
import { useParams } from "next/navigation"
import { useNotes } from "@/contexts/NoteContext"
import MainArea from "@/components/MainArea"
import { FileSearch, Home } from "lucide-react"

export default function NotePage() {
  const params = useParams()
  const noteId = params.id as string
  const { setActiveNoteId, notes, loading } = useNotes()

  useEffect(() => {
    setActiveNoteId(noteId)
  }, [noteId, setActiveNoteId])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Loading...
      </div>
    )
  }

  const noteExists = notes.some((n) => n._id === noteId)
  if (!noteExists) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-xl border bg-card p-8 text-center">
          <div className="size-14 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
            <FileSearch className="size-7 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold mb-1">Note not found</h2>
          <p className="text-sm text-muted-foreground mb-6">
            The link you followed may be broken, or the note may have been removed.
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center gap-1.5 h-8 w-full px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors"
          >
            <Home className="size-4" />
            Go to Home
          </a>
        </div>
      </div>
    )
  }

  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-muted-foreground">Loading editor...</div>}>
      <MainArea />
    </Suspense>
  )
}
