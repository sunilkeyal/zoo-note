# Favorites Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add favorites system with star toggle, context menu, home section, and favorites page.

**Architecture:** Add `isFavorite`/`favoritedAt` to the Note model in MongoDB. New `PATCH /api/notes/[id]/favorite` endpoint toggles the state. NoteContext exposes `toggleFavorite` method and derived `favoriteNotes` array. UI components (sidebar, home, favorites page, context menus) consume the state.

**Tech Stack:** Next.js 16 (App Router), MongoDB, Tailwind CSS, lucide-react, @base-ui/react context menu

---

### Task 1: Add favorite fields to Note type

**Files:**
- Modify: `src/types/index.ts:12-24`

- [ ] **Step 1: Add `isFavorite` and `favoritedAt` to Note interface**

```typescript
export interface Note {
  _id: string;
  title: string;
  content: string;
  folderId?: string;
  folderName?: string;
  userId?: string;
  position: number;
  isFavorite?: boolean;
  favoritedAt?: string;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
  deletedAt?: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add isFavorite and favoritedAt fields to Note type"
```

---

### Task 2: Add MongoDB index for favorites queries

**Files:**
- Modify: `src/lib/mongodb.ts:33-36`

- [ ] **Step 1: Add compound index after existing notes indexes**

```typescript
  await cachedDb.collection("notes").createIndex(
    { userId: 1, isFavorite: 1, favoritedAt: -1 },
    { background: true }
  ).catch(() => {});
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/mongodb.ts
git commit -m "feat: add compound index for favorites queries"
```

---

### Task 3: Create PATCH /api/notes/[id]/favorite endpoint

**Files:**
- Create: `src/app/api/notes/[id]/favorite/route.ts`

- [ ] **Step 1: Create the favorite toggle API route**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { ObjectId } from "mongodb"

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  let objectId: ObjectId
  try {
    objectId = new ObjectId(id)
  } catch {
    return NextResponse.json({ success: false, error: "Invalid note ID format" }, { status: 400 })
  }

  const db = await connectToDatabase()
  const collection = db.collection("notes")

  const note = await collection.findOne(
    { _id: objectId, userId: session.user.id },
    { projection: { isFavorite: 1 } }
  )

  if (!note) {
    return NextResponse.json({ success: false, error: "Note not found" }, { status: 404 })
  }

  const isCurrentlyFavorite = !!note.isFavorite
  const update: Record<string, unknown> = {
    isFavorite: !isCurrentlyFavorite,
    updatedAt: new Date(),
  }
  if (!isCurrentlyFavorite) {
    update.favoritedAt = new Date()
  } else {
    update.favoritedAt = null
  }

  const result = await collection.findOneAndUpdate(
    { _id: objectId, userId: session.user.id },
    { $set: update },
    { returnDocument: "after" }
  )

  if (!result) {
    return NextResponse.json({ success: false, error: "Note not found" }, { status: 404 })
  }

  const updatedNote = {
    _id: result._id.toString(),
    title: result.title,
    content: result.content || "",
    folderId: result.folderId || undefined,
    position: result.position ?? 0,
    isFavorite: !!result.isFavorite,
    favoritedAt: result.favoritedAt?.toISOString?.() || result.favoritedAt || undefined,
    createdAt: result.createdAt.toISOString(),
    updatedAt: result.updatedAt.toISOString(),
  }

  return NextResponse.json({ success: true, data: updatedNote })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/notes/[id]/favorite/route.ts
git commit -m "feat: add PATCH /api/notes/[id]/favorite endpoint"
```

---

### Task 4: Add toggleFavorite to NoteContext + favoriteNotes derived array

**Files:**
- Modify: `src/contexts/NoteContext.tsx`

- [ ] **Step 1: Add `toggleFavorite` to the context interface (after `deleteNote`)**

```typescript
  toggleFavorite: (id: string) => Promise<Note | null>;
```

- [ ] **Step 2: Add `favoriteNotes` to the context interface (after `deleteNote` line)**

```typescript
  favoriteNotes: Note[];
```

- [ ] **Step 3: Add `toggleFavorite` implementation (after `deleteNote` function, before `createFolder`)**

```typescript
  const toggleFavorite = useCallback(async (id: string): Promise<Note | null> => {
    // Optimistic update
    setNotes((prev) =>
      prev.map((n) => {
        if (n._id !== id) return n
        const isCurrentlyFavorite = !!n.isFavorite
        return {
          ...n,
          isFavorite: !isCurrentlyFavorite,
          favoritedAt: !isCurrentlyFavorite ? new Date().toISOString() : undefined,
        }
      })
    )
    try {
      const res = await fetch(`/api/notes/${id}/favorite`, { method: 'PATCH' })
      const json: ApiResponse<Note> = await res.json()
      if (json.success && json.data) {
        setNotes((prev) => sortByPosition(prev.map((n) => (n._id === id ? json.data! : n))))
        return json.data
      }
      // Revert on failure
      setNotes((prev) =>
        prev.map((n) => {
          if (n._id !== id) return n
          const wasFavorite = !n.isFavorite
          return {
            ...n,
            isFavorite: wasFavorite,
            favoritedAt: wasFavorite ? new Date().toISOString() : undefined,
          }
        })
      )
      return null
    } catch {
      // Revert on network error
      setNotes((prev) =>
        prev.map((n) => {
          if (n._id !== id) return n
          const wasFavorite = !n.isFavorite
          return {
            ...n,
            isFavorite: wasFavorite,
            favoritedAt: wasFavorite ? new Date().toISOString() : undefined,
          }
        })
      )
      return null
    }
  }, [])
```

- [ ] **Step 4: Add `favoriteNotes` memoized value (after the `activeNote` line)**

```typescript
  const favoriteNotes = useMemo(
    () => notes
      .filter((n) => n.isFavorite)
      .sort((a, b) => {
        const aTime = a.favoritedAt ? new Date(a.favoritedAt).getTime() : 0
        const bTime = b.favoritedAt ? new Date(b.favoritedAt).getTime() : 0
        return bTime - aTime
      }),
    [notes]
  )
```

- [ ] **Step 5: Add `toggleFavorite` and `favoriteNotes` to the context value**

```typescript
  const value = useMemo<NoteContextValue>(() => ({
    notes,
    favoriteNotes,
    // ... existing
    toggleFavorite,
    // ... rest
  }), [
    notes, favoriteNotes, /* ... add toggleFavorite to deps */
  ]);
```

Add `toggleFavorite` to the dependency arrays in both the value creation and the useMemo deps array.

- [ ] **Step 6: Commit**

```bash
git add src/contexts/NoteContext.tsx
git commit -m "feat: add toggleFavorite and favoriteNotes to NoteContext"
```

---

### Task 5: Add count badge to sidebar Favorites nav item

**Files:**
- Modify: `src/components/NotesSidebar.tsx:721-726`

- [ ] **Step 1: Import `useNotes` is already imported. Add favorite count badge to Favorites nav button**

```tsx
                <SidebarMenuItem>
                  <SidebarMenuButton render={<Link href="/favorites" />} isActive={pathname.startsWith("/favorites")}>
                    <Star className={favoriteNotes.length > 0 ? "text-amber-500" : ""} />
                    <span>Favorites</span>
                    {favoriteNotes.length > 0 && (
                      <span className="ml-auto text-xs bg-sidebar-accent text-sidebar-accent-foreground rounded-full px-2 py-0.5">
                        {favoriteNotes.length}
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
```

- [ ] **Step 2: Destructure `favoriteNotes` from `useNotes()` near line 265**

```typescript
    notes, folders, expandedFolders, createNote, deleteNote, updateNote,
    activeNoteId, setActiveNoteId, createFolder, renameFolder,
    deleteFolder, moveNote, moveFolder, toggleFolder, favoriteNotes,
  } = useNotes()
```

- [ ] **Step 3: Commit**

```bash
git add src/components/NotesSidebar.tsx
git commit -m "feat: add favorite count badge to sidebar Favorites nav item"
```

---

### Task 6: Add favorite toggle to sidebar note context menu

**Files:**
- Modify: `src/components/NotesSidebar.tsx:557-568`

- [ ] **Step 1: Add `toggleFavorite` to destructured values** (already done in Task 5)

- [ ] **Step 2: Insert favorite toggle item between "Download PDF" and the separator**

```tsx
              <ContextMenuItem onClick={(e) => { e.stopPropagation(); toggleFavorite(note._id) }}>
                {note.isFavorite ? (
                  <><Star className="h-4 w-4 text-amber-500 fill-amber-500" /> Remove from Favorite</>
                ) : (
                  <><Star className="h-4 w-4" /> Add to Favorite</>
                )}
              </ContextMenuItem>
```

Full context menu after change:
```tsx
            <ContextMenuContent>
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
            </ContextMenuContent>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/NotesSidebar.tsx
git commit -m "feat: add favorite toggle to sidebar note context menu"
```

---

### Task 7: Add clickable star icon to note cards + update Home Page favorites section

**Files:**
- Modify: `src/components/HomePage.tsx`

- [ ] **Step 1: Import `Star` icon (already imported), add `toggleFavorite` and `favoriteNotes` from `useNotes()`**

```typescript
  const { notes, loading, error, setActiveNoteId, createNote, fetchNotes, expandedFolders, toggleFolder, toggleFavorite, favoriteNotes } = useNotes()
```

- [ ] **Step 2: Add clickable star to note cards in NoteSection. Update the note card div inside NoteSection to include a star button**

Update the NoteSection to accept an `onToggleFavorite` prop and show the star:

```typescript
interface NoteSectionProps {
  title: string
  icon: React.ReactNode
  notes: Note[]
  viewAllHref: string
  emptyMessage: string
  onNoteClick: (id: string) => void
  onToggleFavorite?: (id: string) => void
}
```

In the note card inside NoteSection, add the star:
```tsx
          {notes.map((note) => (
            <div
              key={note._id}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer group"
            >
              <div className="flex-1 min-w-0" onClick={() => onNoteClick(note._id)}>
                <p className="font-medium text-sm truncate">{note.title || "Untitled"}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {stripHtml(note.content) || "No content"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(note._id) }}
                  className="text-muted-foreground hover:text-amber-500 transition-colors"
                >
                  <Star
                    className={`h-4 w-4 ${note.isFavorite ? "text-amber-500 fill-amber-500" : ""}`}
                  />
                </button>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(note.isFavorite && note.favoritedAt ? note.favoritedAt : note.updatedAt)}
                </span>
              </div>
            </div>
          ))}
```

- [ ] **Step 3: Pass `favoriteNotes.slice(0, 5)` to the Favorites section and wire toggle**

```tsx
          <NoteSection
            title="Favorites"
            icon={<Star className="h-5 w-5 text-amber-500" />}
            notes={favoriteNotes.slice(0, 5)}
            viewAllHref="/favorites"
            emptyMessage={searchQuery ? "No notes match your search" : "No favorite notes yet. Star notes to see them here!"}
            onNoteClick={handleNoteClick}
            onToggleFavorite={toggleFavorite}
          />
```

Update both mobile and desktop sections (lines 186-193 and 206-213).

- [ ] **Step 4: Commit**

```bash
git add src/components/HomePage.tsx
git commit -m "feat: add clickable star icons to note cards and wire favorites section"
```

---

### Task 8: Add favorite toggle to Recent page context menus

**Files:**
- Modify: `src/app/recent/page.tsx`

- [ ] **Step 1: Import `Star` from lucide-react**

```typescript
import { Clock, FileText, Folder, Search, Pencil, File, Trash2, Star } from "lucide-react"
```

- [ ] **Step 2: Destructure `toggleFavorite` from `useNotes()`**

```typescript
  const { notes, folders, loading, error, setActiveNoteId, expandedFolders, toggleFolder, fetchNotes, updateNote, deleteNote, toggleFavorite } = useNotes()
```

- [ ] **Step 3: Add favorite toggle to hero card context menu (after Download PDF)**

```tsx
            <ContextMenuItem onClick={() => toggleFavorite(hero._id)}>
              {hero.isFavorite ? (
                <><Star className="h-4 w-4 mr-2 text-amber-500 fill-amber-500" /> Remove from Favorite</>
              ) : (
                <><Star className="h-4 w-4 mr-2" /> Add to Favorite</>
              )}
            </ContextMenuItem>
```

- [ ] **Step 4: Add favorite toggle to grid card context menu (after Download PDF, same markup as hero)**

- [ ] **Step 5: Add clickable star to hero card**

```tsx
              <div className="flex items-center justify-between">
                <p className="font-semibold text-base">{hero.title || "Untitled"}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(hero._id) }}
                  className="text-muted-foreground hover:text-amber-500 transition-colors"
                >
                  <Star className={`h-5 w-5 ${hero.isFavorite ? "text-amber-500 fill-amber-500" : ""}`} />
                </button>
              </div>
```

- [ ] **Step 6: Add clickable star to grid cards**

```tsx
                  <div className="flex items-start gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{note.title || "Untitled"}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {stripHtml(note.content) || "No content"}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(note._id) }}
                      className="text-muted-foreground hover:text-amber-500 transition-colors shrink-0"
                    >
                      <Star className={`h-4 w-4 ${note.isFavorite ? "text-amber-500 fill-amber-500" : ""}`} />
                    </button>
                  </div>
```

- [ ] **Step 7: Commit**

```bash
git add src/app/recent/page.tsx
git commit -m "feat: add favorite toggle to recent page context menus and star icons"
```

---

### Task 9: Implement full Favorites page

**Files:**
- Modify: `src/app/favorites/page.tsx`

- [ ] **Step 1: Replace placeholder with full favorites page (same pattern as Recent page)**

```typescript
"use client"

import React, { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Star, FileText, Folder, Search, Pencil, File, Trash2 } from "lucide-react"
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
      <span className="text-xs text-muted-foreground">
        {formatRelativeTime(note.favoritedAt || note.updatedAt)}
      </span>
    </div>
  )
}

export default function FavoritesPage() {
  const { notes, folders, loading, error, setActiveNoteId, expandedFolders, toggleFolder, fetchNotes, updateNote, deleteNote, toggleFavorite, favoriteNotes } = useNotes()
  const [filter, setFilter] = useState("")
  const router = useRouter()

  const [renameTarget, setRenameTarget] = useState<{ id: string; title: string } | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const folderMap = useMemo(
    () => new Map(folders.map(f => [f._id, f.name])),
    [folders]
  )

  const filteredNotes = useMemo(() => {
    if (!filter.trim()) return favoriteNotes
    const q = filter.toLowerCase()
    return favoriteNotes.filter(n => n.title.toLowerCase().includes(q))
  }, [favoriteNotes, filter])

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
          <div className="size-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
            <Star className="size-5 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Favorites</h1>
            <p className="text-xs text-muted-foreground">Your favorite notes</p>
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
          {favoriteNotes.length === 0
            ? "No favorites yet. Right-click any note and select 'Add to Favorite'."
            : "No favorites match your search."}
        </p>
      )}

      {/* Hero card */}
      {hero && (
        <ContextMenu>
          <ContextMenuTrigger>
            <div
              onClick={() => handleNoteClick(hero._id)}
              className="p-5 rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-base">{hero.title || "Untitled"}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(hero._id) }}
                  className="text-muted-foreground hover:text-amber-500 transition-colors"
                >
                  <Star className={`h-5 w-5 ${hero.isFavorite ? "text-amber-500 fill-amber-500" : ""}`} />
                </button>
              </div>
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
            <ContextMenuItem onClick={() => toggleFavorite(hero._id)}>
              {hero.isFavorite ? (
                <><Star className="h-4 w-4 mr-2 text-amber-500 fill-amber-500" /> Remove from Favorite</>
              ) : (
                <><Star className="h-4 w-4 mr-2" /> Add to Favorite</>
              )}
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
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(note._id) }}
                      className="text-muted-foreground hover:text-amber-500 transition-colors shrink-0"
                    >
                      <Star className={`h-4 w-4 ${note.isFavorite ? "text-amber-500 fill-amber-500" : ""}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between pl-7">
                    {note.folderId && folderMap.get(note.folderId) ? (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Folder className="h-3 w-3" />{folderMap.get(note.folderId)}
                      </span>
                    ) : <span />}
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(note.favoritedAt || note.updatedAt)}
                    </span>
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
                <ContextMenuItem onClick={() => toggleFavorite(note._id)}>
                  {note.isFavorite ? (
                    <><Star className="h-4 w-4 mr-2 text-amber-500 fill-amber-500" /> Remove from Favorite</>
                  ) : (
                    <><Star className="h-4 w-4 mr-2" /> Add to Favorite</>
                  )}
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/favorites/page.tsx
git commit -m "feat: implement full favorites page with hero card, grid, and context menus"
```
