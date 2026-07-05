# Note URL Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each note a unique URL (`/notes/[id]`) so the browser back/forward buttons navigate through note history.

**Architecture:** New `src/app/notes/[id]/page.tsx` reads the note ID from URL params and calls `setActiveNoteId(id)` from NoteContext. All note-click handlers across sidebar, home page, favorites, and recent pages push to `/notes/[id]` instead of `/`. Home page simplifies to always show HomePage (no note-selected conditional).

**Tech Stack:** Next.js App Router (dynamic routes), React 19, NoteContext

---

### Task 1: Create `/notes/[id]` page and notes layout

**Files:**
- Create: `src/app/notes/layout.tsx`
- Create: `src/app/notes/[id]/page.tsx`

- [ ] **Step 1: Create notes layout**

```tsx
"use client"

import React from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import AppHeader from "@/components/AppHeader"
import NotesSidebar from "@/components/NotesSidebar"

export default function NotesLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login")
    }
  }, [status, router])

  if (status !== "authenticated") {
    return null
  }

  return (
    <SidebarProvider>
      <NotesSidebar />
      <SidebarInset className="overflow-hidden">
        <AppHeader />
        <main className="flex-1 overflow-auto px-4 sm:px-6 md:px-8 lg:px-10 py-6 w-full md:max-w-[900px] lg:max-w-[1140px]">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
```

- [ ] **Step 2: Create note page**

```tsx
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
```

Key points:
- `setActiveNoteId(noteId)` runs on mount and on `noteId` change (URL changes between notes)
- Does NOT clear `activeNoteId` on unmount — avoids flicker during note-to-note navigation
- Loading state while notes are being fetched
- "Note not found" if the ID doesn't match any loaded note

- [ ] **Step 3: Create layout directory structure**

```bash
New-Item -ItemType Directory -Path "src/app/notes/[id]" -Force
```

- [ ] **Step 4: Commit**

```bash
git add src/app/notes/
git commit -m "feat: add /notes/[id] route for individual note URLs"
```

---

### Task 2: Simplify home page — always show HomePage

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Remove note-selected conditional**

Remove the `activeNoteId` usage — the home page no longer manages note selection. Always render `<HomePage />`.

```tsx
"use client"

import React, { Suspense } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import AppHeader from "@/components/AppHeader"
import NotesSidebar from "@/components/NotesSidebar"
import HomePage from "@/components/HomePage"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login")
    }
  }, [status, router])

  if (status !== "authenticated") {
    return null
  }

  return (
    <SidebarProvider>
      <NotesSidebar />
      <SidebarInset className="overflow-hidden">
        <AppHeader />
        <Suspense fallback={<div className="flex-1 flex items-center justify-center text-muted-foreground">Loading...</div>}>
          <HomePage />
        </Suspense>
      </SidebarInset>
    </SidebarProvider>
  )
}
```

Changes from current:
- Removed `import { useNotes } from "@/contexts/NoteContext"`
- Removed `const { activeNoteId } = useNotes()`
- Removed the `{activeNoteId ? <MainArea /> : <HomePage />}` conditional
- Always renders `<HomePage />`

- [ ] **Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "refactor: home page always shows HomePage; notes open at /notes/[id]"
```

---

### Task 3: Update NotesSidebar navigation

**Files:**
- Modify: `src/components/NotesSidebar.tsx`

- [ ] **Step 1: Update note click handler (line ~579-582)**

Change `router.push("/")` to `router.push(\`/notes/${note._id}\`)`:

```tsx
onClick={() => {
  setActiveNoteId(note._id)
  setActiveFolderId(null)
  setSearchOpen(false)
  router.push(`/notes/${note._id}`)
}}
```

- [ ] **Step 2: Update search result click handler (line ~337-340)**

Change to navigate to `/notes/${noteId}` with optional search param:

```tsx
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
```

Note: Removed the conditional that checked `pathname !== "/"` — the router.push is now always to `/notes/${noteId}` regardless of current page.

- [ ] **Step 3: Commit**

```bash
git add src/components/NotesSidebar.tsx
git commit -m "feat: sidebar note clicks navigate to /notes/[id]"
```

---

### Task 4: Update HomePage navigation

**Files:**
- Modify: `src/components/HomePage.tsx`

- [ ] **Step 1: Update create note handler (line ~119)**

After creating a note, navigate to it:

```tsx
const handleCreateNote = async () => {
  const note = await createNote({ title: "Untitled" })
  if (note) {
    setActiveNoteId(note._id)
    router.push(`/notes/${note._id}`)
  }
}
```

- [ ] **Step 2: Update note click handler (line ~127-131)**

Navigate to `/notes/${id}` with optional search query:

```tsx
const handleNoteClick = (id: string) => {
  const note = notes.find((n) => n._id === id)
  if (note?.folderId && !expandedFolders.has(note.folderId)) {
    toggleFolder(note.folderId)
  }
  setActiveNoteId(id)
  const searchParam = searchQuery.trim() ? `?q=${encodeURIComponent(searchQuery.trim())}` : ""
  router.push(`/notes/${id}${searchParam}`)
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/HomePage.tsx
git commit -m "feat: home page note clicks navigate to /notes/[id]"
```

---

### Task 5: Update Favorites page navigation

**Files:**
- Modify: `src/app/favorites/page.tsx`

- [ ] **Step 1: Update handleNoteClick (line ~87-88)**

```tsx
function handleNoteClick(id: string) {
  const note = notes.find(n => n._id === id)
  if (note?.folderId && !expandedFolders.has(note.folderId)) {
    toggleFolder(note.folderId)
  }
  setActiveNoteId(id)
  router.push(filter ? `/notes/${id}?q=${encodeURIComponent(filter)}` : `/notes/${id}`)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/favorites/page.tsx
git commit -m "feat: favorites page note clicks navigate to /notes/[id]"
```

---

### Task 6: Update Recent page navigation

**Files:**
- Modify: `src/app/recent/page.tsx`

- [ ] **Step 1: Update handleNoteClick**

Find the function (around line 85-91) and change it:

```tsx
function handleNoteClick(id: string) {
  const note = notes.find(n => n._id === id)
  if (note?.folderId && !expandedFolders.has(note.folderId)) {
    toggleFolder(note.folderId)
  }
  setActiveNoteId(id)
  router.push(filter ? `/notes/${id}?q=${encodeURIComponent(filter)}` : `/notes/${id}`)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/recent/page.tsx
git commit -m "feat: recent page note clicks navigate to /notes/[id]"
```

---

### Task 7: Verify build

- [ ] **Step 1: Run lint**

```bash
npm run lint
```

If lint fails, fix reported issues.

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: All tests pass

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: Build succeeds with no errors

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "chore: fix lint/type issues after note URL routing changes"
```
