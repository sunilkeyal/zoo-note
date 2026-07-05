# Search Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace in-page search result display on home page and sidebar with dropdown-style results using cmdk for keyboard navigation.

**Architecture:** A shared `SearchDropdown` component wraps `cmdk`'s `Command` component with custom item rendering (icon + title + content preview). Home page and sidebar each instantiate it with variant-specific styling. Favorites/Recent pages are unchanged.

**Tech Stack:** Next.js App Router, React 19, cmdk 1.1.1, shadcn/ui Command component, Tailwind CSS v4, vitest + @testing-library/react

---

### Task 1: Create SearchDropdown component

**Files:**
- Create: `src/components/SearchDropdown.tsx`

- [ ] **Step 1: Write SearchDropdown component**

```tsx
"use client"

import React from "react"
import { Command, CommandList, CommandItem, CommandEmpty } from "@/components/ui/command"
import { FileText } from "lucide-react"
import { cn, stripHtml } from "@/lib/utils"
import type { Note } from "@/types"

interface SearchDropdownProps {
  open: boolean
  query: string
  results: Note[]
  onSelect: (noteId: string) => void
  onClose: () => void
  inputRef: React.RefObject<HTMLInputElement | null>
  variant?: "home" | "sidebar"
  maxItems?: number
}

export default function SearchDropdown({
  open,
  query,
  results,
  onSelect,
  onClose,
  inputRef,
  variant = "home",
  maxItems = 20,
}: SearchDropdownProps) {
  if (!open || !query.trim()) return null

  const displayResults = results.slice(0, maxItems)

  return (
    <div
      className={cn(
        "absolute top-full left-0 right-0 mt-1 border rounded-lg bg-popover shadow-lg z-50 overflow-hidden",
        variant === "sidebar" ? "text-xs" : "text-sm"
      )}
    >
      <Command shouldFilter={false}>
        <div className={cn("px-3 py-1.5 text-muted-foreground border-b",
          variant === "sidebar" ? "text-[10px]" : "text-xs"
        )}>
          {results.length} note{results.length !== 1 ? "s" : ""} found
        </div>
        <CommandList className="max-h-60 overflow-y-auto">
          {displayResults.length === 0 ? (
            <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
              No notes match your search.
            </CommandEmpty>
          ) : (
            displayResults.map((note) => (
              <CommandItem
                key={note._id}
                value={note._id}
                onSelect={() => {
                  onSelect(note._id)
                  onClose()
                }}
                className={cn(
                  "flex items-center gap-2.5 px-3 cursor-pointer aria-selected:bg-accent",
                  variant === "sidebar" ? "py-1.5" : "py-2"
                )}
              >
                <FileText className={cn(
                  "shrink-0 text-muted-foreground",
                  variant === "sidebar" ? "h-3.5 w-3.5" : "h-4 w-4"
                )} />
                <div className="min-w-0 flex-1">
                  <div className={cn(
                    "font-medium truncate",
                    variant === "sidebar" ? "text-xs" : "text-sm"
                  )}>
                    {note.title || "Untitled"}
                  </div>
                  <div className={cn(
                    "text-muted-foreground truncate",
                    variant === "sidebar" ? "text-[10px]" : "text-xs"
                  )}>
                    {stripHtml(note.content) || "No content"}
                  </div>
                </div>
              </CommandItem>
            ))
          )}
        </CommandList>
      </Command>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SearchDropdown.tsx
git commit -m "feat: add SearchDropdown shared component"
```

---

### Task 2: Update HomePage to use dropdown

**Files:**
- Modify: `src/components/HomePage.tsx`

- [ ] **Step 1: Update HomePage.tsx**

Import SearchDropdown and add a ref for the search input. Remove the conditional rendering that switches between sections and results. Add open state for the dropdown. Render SearchDropdown below the input.

```tsx
// Add to imports:
import { useRef } from "react"
import SearchDropdown from "@/components/SearchDropdown"

// Add state after searchQuery:
const [searchOpen, setSearchOpen] = useState(false)
const searchInputRef = useRef<HTMLInputElement>(null)

// Change the search bar section (lines ~173-182) to:
<div className="max-w-md mx-auto relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <Input
    ref={searchInputRef}
    value={searchQuery}
    onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true) }}
    onFocus={() => setSearchOpen(true)}
    onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
    placeholder="Search notes..."
    className="pl-9"
  />
  <SearchDropdown
    open={searchOpen}
    query={searchQuery}
    results={filteredNotes}
    onSelect={handleNoteClick}
    onClose={() => setSearchOpen(false)}
    inputRef={searchInputRef}
    variant="home"
  />
</div>
```

Also remove the conditional render block at lines 185-221 (the `searchQuery.trim() ?` section that shows results or sections). The sections (Favorites + Recent Notes) should always render now.

- [ ] **Step 2: Commit**

```bash
git add src/components/HomePage.tsx
git commit -m "feat: replace home page search results with dropdown"
```

---

### Task 3: Update NotesSidebar to use dropdown with search icon

**Files:**
- Modify: `src/components/NotesSidebar.tsx`

- [ ] **Step 1: Add search dropdown state and input ref**

Add a separate `searchFocused` state to control dropdown visibility (separate from `searchOpen` which controls input visibility). Also add the search input ref.

```tsx
// After existing state declarations:
const [searchFocused, setSearchFocused] = useState(false)
const searchInputRef = useRef<HTMLInputElement>(null)
```

- [ ] **Step 2: Add search icon inside sidebar input and dropdown**

Replace the current search input section (lines ~724-735) with one that has a Search icon inside the text box on the left:

```tsx
{searchOpen && (
  <div className="px-1 pb-2">
    <form onSubmit={(e) => e.preventDefault()}>
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
        inputRef={searchInputRef}
        variant="sidebar"
      />
    </form>
  </div>
)}
```

- [ ] **Step 3: Update search toggle to also close dropdown**

When the search button is clicked to close search, also reset focused state:

```tsx
// Change the search button onClick:
onClick={() => { setSearchOpen(!searchOpen); setSearchFocused(false); setSearch("") }}
```

- [ ] **Step 4: Add handleSearchResultClick function**

Add this function that navigates to a note when a search result is selected:

```tsx
const handleSearchResultClick = (noteId: string) => {
  const note = notes.find((n) => n._id === noteId)
  if (note?.folderId && !expandedFolders.has(note.folderId)) {
    toggleFolder(note.folderId)
  }
  setActiveNoteId(noteId)
  setActiveFolderId(null)
  const searchParam = search ? `?q=${encodeURIComponent(search)}` : ""
  if (pathname !== "/") {
    router.push(`/${searchParam}`)
  } else {
    router.push(`${pathname}${searchParam}`)
  }
  setSearchFocused(false)
}
```

- [ ] **Step 5: Remove conditional note list filtering**

Keep the `filtered` computation (it's still needed for the dropdown), but remove the conditional rendering that hides non-matching notes. The note list (folders + notes) should always render the full unfiltered list. Change the rendering in the DndContext section to use `notes` instead of `filtered` for the note list. For folder contents, use the original unfiltered `folderNotes`.

Change the folder rendering to use unfiltered notes:
```tsx
const folderNotes = notes.filter((n) => n.folderId === folder._id)
```

Change the root notes section to use unfiltered notes:
```tsx
{notes.filter(n => !n.folderId).length > 0 && (
```

And the SortableContext items:
```tsx
items={notes.filter(n => !n.folderId).map(n => n._id)}
```

And the mapping:
```tsx
{notes.filter(n => !n.folderId).map((note, noteIndex) => (
```

- [ ] **Step 6: Add import**

```tsx
import SearchDropdown from "@/components/SearchDropdown"
```

- [ ] **Step 7: Commit**

```bash
git add src/components/NotesSidebar.tsx
git commit -m "feat: replace sidebar search with dropdown + add search icon to input"
```

---

### Task 4: Update NotesSidebar tests

**Files:**
- Modify: `src/__tests__/notes-sidebar.test.tsx`

- [ ] **Step 1: Add mock for SearchDropdown**

Add after the other mocks:
```tsx
vi.mock('@/components/SearchDropdown', () => ({
  default: ({ open, query, results, onSelect }: {
    open: boolean; query: string; results: Note[]; onSelect: (id: string) => void
  }) => open ? (
    <div data-testid="search-dropdown">
      {results.map(r => (
        <div key={r._id} data-testid="search-result" onClick={() => onSelect(r._id)}>
          {r.title}
        </div>
      ))}
    </div>
  ) : null,
}))
```

- [ ] **Step 2: Update search test**

Change the existing "filters notes by search" test to verify dropdown behavior instead:

```tsx
it('shows search dropdown with matching results', async () => {
  const user = userEvent.setup()
  vi.mocked(useNotes).mockReturnValue(createMockContext())
  renderSidebar()

  const searchButtons = screen.getAllByText('Search')
  await user.click(searchButtons[0])

  const searchInput = screen.getByPlaceholderText('Search notes...')
  await user.type(searchInput, 'Alpha')

  const dropdown = screen.getByTestId('search-dropdown')
  expect(dropdown).toBeInTheDocument()
  // Note list should still show all notes
  expect(screen.getByText('Alpha Note')).toBeInTheDocument()
  expect(screen.getByText('Beta Note')).toBeInTheDocument()
  expect(screen.getByText('Standalone Note')).toBeInTheDocument()
})

it('does not hide non-matching notes when searching', async () => {
  const user = userEvent.setup()
  vi.mocked(useNotes).mockReturnValue(createMockContext())
  renderSidebar()

  const searchButtons = screen.getAllByText('Search')
  await user.click(searchButtons[0])

  const searchInput = screen.getByPlaceholderText('Search notes...')
  await user.type(searchInput, 'Alpha')

  // All notes should still be visible in the sidebar
  expect(screen.getByText('Alpha Note')).toBeInTheDocument()
  expect(screen.getByText('Beta Note')).toBeInTheDocument()
  expect(screen.getByText('Standalone Note')).toBeInTheDocument()
})

it('navigates to note when clicking a search result', async () => {
  const user = userEvent.setup()
  const routerPush = vi.fn()
  vi.mocked(useNotes).mockReturnValue(createMockContext())
  vi.mocked(usePathname).mockReturnValue('/')
  vi.mocked(useRouter).mockReturnValue({ push: routerPush })
  renderSidebar()

  const searchButtons = screen.getAllByText('Search')
  await user.click(searchButtons[0])

  const searchInput = screen.getByPlaceholderText('Search notes...')
  await user.type(searchInput, 'Alpha')

  const result = screen.getByText('Alpha Note')
  await user.click(result)
  expect(routerPush).toHaveBeenCalledWith('/?q=Alpha')
})
```

- [ ] **Step 3: Add new import to test file**

```tsx
import type { Note } from '@/types'
```

(Already imported at line 6? Let me check... line 6: `import type { Note, Folder } from '@/types'` — yes, already there.)

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/notes-sidebar.test.tsx
git commit -m "test: update sidebar tests for search dropdown behavior"
```

---

### Task 5: Clean up visual mockup pages

**Files:**
- Delete: `src/app/search-visual/` (if exists)
- Delete: `src/app/search-visual-sidebar/` (if exists)
- Delete: `src/app/dummy-visual/` (if exists)

- [ ] **Step 1: Remove mockup directories**

Run:
```bash
Remove-Item -Recurse -Force "src/app/search-visual" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "src/app/search-visual-sidebar" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "src/app/dummy-visual" -ErrorAction SilentlyContinue
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove visual mockup pages"
```

---

### Task 6: Verify build and tests

- [ ] **Step 1: Run tests**

```bash
npm test
```

Expected: All tests pass

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds with no errors
