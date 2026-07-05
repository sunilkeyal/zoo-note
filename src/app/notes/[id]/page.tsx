"use client"

import React, { useEffect, Suspense } from "react"
import { useParams } from "next/navigation"
import { useNotes } from "@/contexts/NoteContext"
import MainArea from "@/components/MainArea"

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
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Note not found
      </div>
    )
  }

  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-muted-foreground">Loading editor...</div>}>
      <MainArea />
    </Suspense>
  )
}
