# Recent Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "Coming soon" stub at `/recent` with a Magazine/Hero layout showing all notes sorted by last-edited date, with a hero card for the most recent note and a 2-column grid for the rest.

**Architecture:** Single self-contained client component in `src/app/recent/page.tsx`. Reads `notes` and context helpers directly from `NoteContext` — no new API endpoints or schema changes. Content previews strip HTML client-side.

**Tech Stack:** Next.js 14 App Router, React, Tailwind CSS, shadcn/ui, lucide-react, Vitest + React Testing Library

## Global Constraints

- Branch: `feature/recent-page` — do NOT commit to `main`
- Test runner: `npx vitest run` (jsdom environment, setup file `src/__tests__/setup.ts`)
- All tests live in `src/__tests__/`
- Path alias `@/` resolves to `src/`
- Do not add new dependencies
- Do not modify `NoteContext`, the layout file, or any shared component

---

### Task 1: Implement the Recent page

**Files:**
- Modify: `src/app/recent/page.tsx` (replace stub entirely)
- Create: `src/__tests__/recent-page.test.tsx`

**Interfaces:**
- Consumes: `useNotes()` from `@/contexts/NoteContext` — fields used: `notes: Note[]`, `loading: boolean`, `error: string | null`, `setActiveNoteId: (id: string | null) => void`, `expandedFolders: Set<string>`, `toggleFolder: (id: string) => void`, `fetchNotes: () => Promise<void>`
- Consumes: `Note` type from `@/types` — fields used: `_id`, `title`, `content`, `folderId`, `folderName`, `updatedAt`
- Produces: nothing consumed by other tasks

**Design — component structure**

The page is one component with three logical sections:

1. **Header** — violet clock avatar, "Recent" h1, subtitle, filter `<Input>` (hidden on mobile via `sm:block`)
2. **Hero card** — most recently edited note (`sortedNotes[0]`), violet accent border, title, 2-line stripped-content preview, bottom metadata row (folder left / timestamp right)
3. **Grid** — `sortedNotes.slice(1)`, `grid-cols-1 sm:grid-cols-2`, each card has file icon + title + stripped-content preview + same footer row

**Helper functions (defined inside the file):**

```ts
function stripHtml(html: string): string
// Strips all HTML tags. Returns plain text. Returns "" for falsy input.

function formatRelativeTime(dateStr: string): string
// "just now" < 1min, "Xm ago" < 1hr, "Xh ago" < 24hr,
// "Xd ago" < 14 days, "Xw ago" < 8 weeks, else toLocaleDateString()
```

**Filter behaviour:** `useState<string>("")` for the filter query. `sortedNotes` is all notes sorted `updatedAt` desc. `filteredNotes` is `sortedNotes` filtered by `note.title.toLowerCase().includes(query.toLowerCase())` when query is non-empty. Hero is `filteredNotes[0]`, grid is `filteredNotes.slice(1)`.

**Note click handler:**
```ts
function handleNoteClick(id: string) {
  const note = notes.find(n => n._id === id)
  if (note?.folderId && !expandedFolders.has(note.folderId)) {
    toggleFolder(note.folderId)
  }
  setActiveNoteId(id)
}
```

**Empty state** (when `filteredNotes.length === 0`):
- If `notes.length === 0`: "No notes yet. Create your first note to see it here."
- If filter is active but no matches: "No notes match your search."

**Loading / error states:** mirror the pattern in `HomePage.tsx` — show a centered `<p>` for loading, and a centered error message + "Retry" button that calls `fetchNotes()` for errors.

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/recent-page.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock next/navigation
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

// Mock NoteContext
vi.mock('@/contexts/NoteContext', () => ({ useNotes: vi.fn() }))

// Mock lucide-react icons used by the page
vi.mock('lucide-react', () => ({
  Clock:    (p: object) => <svg data-testid="icon-Clock" {...p} />,
  FileText: (p: object) => <svg data-testid="icon-FileText" {...p} />,
  Folder:   (p: object) => <svg data-testid="icon-Folder" {...p} />,
  Search:   (p: object) => <svg data-testid="icon-Search" {...p} />,
}))

import { useNotes } from '@/contexts/NoteContext'
import RecentPage from '@/app/recent/page'

const mockUseNotes = useNotes as ReturnType<typeof vi.fn>

const NOTE_A = {
  _id: '1', title: 'Alpha Note', content: '<p>Alpha content</p>',
  folderId: 'f1', folderName: 'Work',
  updatedAt: new Date(Date.now() - 60_000).toISOString(),
  position: 0, createdAt: '', isDeleted: false,
}
const NOTE_B = {
  _id: '2', title: 'Beta Note', content: '<p>Beta content</p>',
  folderId: undefined, folderName: undefined,
  updatedAt: new Date(Date.now() - 3_600_000).toISOString(),
  position: 1, createdAt: '', isDeleted: false,
}

function baseContext(overrides = {}) {
  return {
    notes: [NOTE_B, NOTE_A], // intentionally unsorted — page must sort
    loading: false,
    error: null,
    setActiveNoteId: vi.fn(),
    expandedFolders: new Set<string>(),
    toggleFolder: vi.fn(),
    fetchNotes: vi.fn(),
    ...overrides,
  }
}

beforeEach(() => mockUseNotes.mockReturnValue(baseContext()))

describe('RecentPage', () => {
  it('renders the page heading', () => {
    render(<RecentPage />)
    expect(screen.getByRole('heading', { name: /recent/i })).toBeInTheDocument()
  })

  it('shows the most recently edited note as the hero card', () => {
    render(<RecentPage />)
    // NOTE_A has a more recent updatedAt — it should be the hero
    const headings = screen.getAllByText('Alpha Note')
    expect(headings.length).toBeGreaterThan(0)
  })

  it('shows remaining notes in the grid', () => {
    render(<RecentPage />)
    expect(screen.getByText('Beta Note')).toBeInTheDocument()
  })

  it('strips HTML from content previews', () => {
    render(<RecentPage />)
    expect(screen.getByText('Alpha content')).toBeInTheDocument()
  })

  it('calls setActiveNoteId when a note card is clicked', () => {
    const setActiveNoteId = vi.fn()
    mockUseNotes.mockReturnValue(baseContext({ setActiveNoteId }))
    render(<RecentPage />)
    fireEvent.click(screen.getAllByText('Alpha Note')[0])
    expect(setActiveNoteId).toHaveBeenCalledWith('1')
  })

  it('expands the folder when clicking a note whose folder is collapsed', () => {
    const toggleFolder = vi.fn()
    mockUseNotes.mockReturnValue(baseContext({ toggleFolder, expandedFolders: new Set() }))
    render(<RecentPage />)
    fireEvent.click(screen.getAllByText('Alpha Note')[0])
    expect(toggleFolder).toHaveBeenCalledWith('f1')
  })

  it('shows the empty state when there are no notes', () => {
    mockUseNotes.mockReturnValue(baseContext({ notes: [] }))
    render(<RecentPage />)
    expect(screen.getByText(/no notes yet/i)).toBeInTheDocument()
  })

  it('filters notes by title when filter input is used', () => {
    render(<RecentPage />)
    const input = screen.getByPlaceholderText(/filter notes/i)
    fireEvent.change(input, { target: { value: 'alpha' } })
    expect(screen.getByText('Alpha Note')).toBeInTheDocument()
    expect(screen.queryByText('Beta Note')).not.toBeInTheDocument()
  })

  it('shows no-match message when filter finds nothing', () => {
    render(<RecentPage />)
    const input = screen.getByPlaceholderText(/filter notes/i)
    fireEvent.change(input, { target: { value: 'zzznomatch' } })
    expect(screen.getByText(/no notes match/i)).toBeInTheDocument()
  })

  it('shows a loading state', () => {
    mockUseNotes.mockReturnValue(baseContext({ loading: true, notes: [] }))
    render(<RecentPage />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows an error state with a retry button', () => {
    const fetchNotes = vi.fn()
    mockUseNotes.mockReturnValue(baseContext({ error: 'Failed to load', notes: [], fetchNotes }))
    render(<RecentPage />)
    expect(screen.getByText('Failed to load')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(fetchNotes).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/__tests__/recent-page.test.tsx
```

Expected: multiple FAIL — `RecentPage` still returns the "Coming soon" stub.

- [ ] **Step 3: Implement `src/app/recent/page.tsx`**

Replace the entire file with:

```tsx
"use client"

import React, { useState, useMemo } from "react"
import { Clock, FileText, Folder, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
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

function NoteFooter({ note }: { note: Note }) {
  return (
    <div className="flex items-center justify-between mt-3 pt-3 border-t">
      {note.folderName ? (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Folder className="h-3 w-3" />{note.folderName}
        </span>
      ) : <span />}
      <span className="text-xs text-muted-foreground">{formatRelativeTime(note.updatedAt)}</span>
    </div>
  )
}

export default function RecentPage() {
  const { notes, loading, error, setActiveNoteId, expandedFolders, toggleFolder, fetchNotes } = useNotes()
  const [filter, setFilter] = useState("")

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
        <div
          onClick={() => handleNoteClick(hero._id)}
          className="p-5 rounded-xl border-2 border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-900/10 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors cursor-pointer"
        >
          <p className="font-semibold text-base">{hero.title || "Untitled"}</p>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {stripHtml(hero.content) || "No content"}
          </p>
          <NoteFooter note={hero} />
        </div>
      )}

      {/* Grid */}
      {rest.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {rest.map(note => (
            <div
              key={note._id}
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
                {note.folderName ? (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Folder className="h-3 w-3" />{note.folderName}
                  </span>
                ) : <span />}
                <span className="text-xs text-muted-foreground">{formatRelativeTime(note.updatedAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run src/__tests__/recent-page.test.tsx
```

Expected: all tests PASS.

- [ ] **Step 5: Run the full test suite to check for regressions**

```bash
npx vitest run
```

Expected: all pre-existing tests still pass.

- [ ] **Step 6: Smoke-test in the browser**

Visit `http://localhost:3000` → click "View all" in the Recent Notes section → verify:
- Lands on `/recent`
- Most recently edited note appears as the large hero card
- Remaining notes fill the 2-column grid
- Folder names appear in the footer of each card
- Typing in the filter input narrows the list
- Clicking any card opens it in the editor
- Mobile viewport (resize to <640px): grid collapses to 1 column, filter input hides

- [ ] **Step 7: Commit**

```bash
git add src/app/recent/page.tsx src/__tests__/recent-page.test.tsx
git commit -m "feat: implement Recent page with Magazine/Hero layout"
```

- [ ] **Step 8: Push the feature branch**

```bash
git push origin feature/recent-page
```
