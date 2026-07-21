# Sidebar Multi-Select Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-select to the sidebar so users can select notes/folders with CTRL+SHIFT and bulk delete or favorite them via right-click context menu.

**Architecture:** A new `useMultiSelect` hook (using `useReducer`) manages selection state. The existing `NotesSidebar` integrates selection behavior into note/folder items and conditionally renders a bulk context menu when items are selected. Bulk operations reuse existing `deleteNote`/`deleteFolder`/`toggleFavorite` from `NoteContext`. SelectionBar component exists but is not rendered in the sidebar.

**Tech Stack:** React, TypeScript, shadcn/ui ContextMenu, sonner toasts, vitest + @testing-library/react

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/hooks/use-multi-select.ts` | **Create** | Selection state management hook (useReducer) |
| `src/components/BulkDeleteDialog.tsx` | **Create** | Confirmation dialog with dynamic bulk delete text |
| `src/components/SelectionBar.tsx` | **Create** | Count + Clear bar (exists but not rendered in sidebar) |
| `src/components/NotesSidebar.tsx` | **Modify** | Integrate selection into items, bulk context menu |
| `src/app/visual/page.tsx` | **Create** | Visual demo page for testing selection behavior |
| `src/__tests__/use-multi-select.test.ts` | **Create** | Unit tests for the hook |
| `src/__tests__/notes-sidebar.test.tsx` | **Modify** | Add multi-select integration tests |

---

### Task 1: Create `useMultiSelect` hook

**Files:**
- Create: `src/hooks/use-multi-select.ts`
- Test: `src/__tests__/use-multi-select.test.ts`

**Note:** Uses `useReducer` instead of `useState` for atomic state updates (fixes React batching bug). The hook does NOT expose a `handleItemClick` method — click orchestration is handled in the component via `preSelectIdRef` and `skipNextClearRef`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/__tests__/use-multi-select.test.ts
import { renderHook, act } from "@testing-library/react"
import { useMultiSelect } from "@/hooks/use-multi-select"

describe("useMultiSelect", () => {
  const ids = ["a", "b", "c", "d", "e"]

  it("starts with empty selection", () => {
    const { result } = renderHook(() => useMultiSelect())
    expect(result.current.selectedIds.size).toBe(0)
    expect(result.current.isSelecting).toBe(false)
    expect(result.current.lastSelectedId).toBeNull()
  })

  it("toggleSelect adds and removes items", () => {
    const { result } = renderHook(() => useMultiSelect())
    act(() => result.current.toggleSelect("a"))
    expect(result.current.selectedIds.has("a")).toBe(true)
    expect(result.current.isSelecting).toBe(true)
    expect(result.current.lastSelectedId).toBe("a")

    act(() => result.current.toggleSelect("a"))
    expect(result.current.selectedIds.has("a")).toBe(false)
    expect(result.current.isSelecting).toBe(false)
    expect(result.current.lastSelectedId).toBeNull()
  })

  it("selectRange selects contiguous items", () => {
    const { result } = renderHook(() => useMultiSelect())
    act(() => result.current.toggleSelect("b"))
    act(() => result.current.selectRange("d", ids))
    expect(result.current.selectedIds.size).toBe(3)
    expect(result.current.selectedIds.has("b")).toBe(true)
    expect(result.current.selectedIds.has("c")).toBe(true)
    expect(result.current.selectedIds.has("d")).toBe(true)
  })

  it("selectRange works in reverse order", () => {
    const { result } = renderHook(() => useMultiSelect())
    act(() => result.current.toggleSelect("d"))
    act(() => result.current.selectRange("b", ids))
    expect(result.current.selectedIds.size).toBe(3)
    expect(result.current.selectedIds.has("b")).toBe(true)
    expect(result.current.selectedIds.has("c")).toBe(true)
    expect(result.current.selectedIds.has("d")).toBe(true)
  })

  it("selectRange without lastSelectedId falls back to toggleSelect", () => {
    const { result } = renderHook(() => useMultiSelect())
    act(() => result.current.selectRange("c", ids))
    expect(result.current.selectedIds.size).toBe(1)
    expect(result.current.selectedIds.has("c")).toBe(true)
  })

  it("selectAll selects all provided ids", () => {
    const { result } = renderHook(() => useMultiSelect())
    act(() => result.current.selectAll(ids))
    expect(result.current.selectedIds.size).toBe(5)
    expect(result.current.isSelecting).toBe(true)
  })

  it("clearSelection resets everything", () => {
    const { result } = renderHook(() => useMultiSelect())
    act(() => result.current.selectAll(ids))
    act(() => result.current.clearSelection())
    expect(result.current.selectedIds.size).toBe(0)
    expect(result.current.isSelecting).toBe(false)
    expect(result.current.lastSelectedId).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/use-multi-select.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the hook**

```ts
// src/hooks/use-multi-select.ts
import { useReducer, useCallback } from "react"

interface SelectionState {
  selectedIds: Set<string>
  lastSelectedId: string | null
}

type SelectionAction =
  | { type: "TOGGLE"; id: string }
  | { type: "RANGE"; id: string; allIds: string[] }
  | { type: "SELECT_ALL"; allIds: string[] }
  | { type: "CLEAR" }

function selectionReducer(state: SelectionState, action: SelectionAction): SelectionState {
  switch (action.type) {
    case "TOGGLE": {
      const next = new Set(state.selectedIds)
      const isRemoving = next.has(action.id)
      if (isRemoving) {
        next.delete(action.id)
      } else {
        next.add(action.id)
      }
      return {
        selectedIds: next,
        lastSelectedId: isRemoving
          ? (state.lastSelectedId === action.id ? null : state.lastSelectedId)
          : action.id,
      }
    }
    case "RANGE": {
      if (!state.lastSelectedId) {
        const next = new Set(state.selectedIds)
        next.add(action.id)
        return { selectedIds: next, lastSelectedId: action.id }
      }
      const startIdx = action.allIds.indexOf(state.lastSelectedId)
      const endIdx = action.allIds.indexOf(action.id)
      if (startIdx === -1 || endIdx === -1) {
        const next = new Set(state.selectedIds)
        next.add(action.id)
        return { selectedIds: next, lastSelectedId: action.id }
      }
      const from = Math.min(startIdx, endIdx)
      const to = Math.max(startIdx, endIdx)
      const rangeIds = action.allIds.slice(from, to + 1)
      const next = new Set(state.selectedIds)
      rangeIds.forEach((rid) => next.add(rid))
      return { selectedIds: next, lastSelectedId: action.id }
    }
    case "SELECT_ALL": {
      return {
        selectedIds: new Set(action.allIds),
        lastSelectedId: action.allIds[action.allIds.length - 1] ?? null,
      }
    }
    case "CLEAR": {
      return { selectedIds: new Set(), lastSelectedId: null }
    }
  }
}

interface UseMultiSelectReturn {
  selectedIds: Set<string>
  lastSelectedId: string | null
  isSelecting: boolean
  toggleSelect: (id: string) => void
  selectRange: (id: string, allIds: string[]) => void
  selectAll: (allIds: string[]) => void
  clearSelection: () => void
}

export function useMultiSelect(): UseMultiSelectReturn {
  const [state, dispatch] = useReducer(selectionReducer, {
    selectedIds: new Set<string>(),
    lastSelectedId: null,
  })

  const toggleSelect = useCallback((id: string) => {
    dispatch({ type: "TOGGLE", id })
  }, [])

  const selectRange = useCallback((id: string, allIds: string[]) => {
    dispatch({ type: "RANGE", id, allIds })
  }, [])

  const selectAll = useCallback((allIds: string[]) => {
    dispatch({ type: "SELECT_ALL", allIds })
  }, [])

  const clearSelection = useCallback(() => {
    dispatch({ type: "CLEAR" })
  }, [])

  return {
    selectedIds: state.selectedIds,
    lastSelectedId: state.lastSelectedId,
    isSelecting: state.selectedIds.size > 0,
    toggleSelect,
    selectRange,
    selectAll,
    clearSelection,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/use-multi-select.test.ts`
Expected: All 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-multi-select.ts src/__tests__/use-multi-select.test.ts
git commit -m "feat: add useMultiSelect hook"
```

---

### Task 2: Create `BulkDeleteDialog` component

**Files:**
- Create: `src/components/BulkDeleteDialog.tsx`

- [ ] **Step 1: Create BulkDeleteDialog**

```tsx
// src/components/BulkDeleteDialog.tsx
"use client"

import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface Props {
  open: boolean
  noteCount: number
  folderCount: number
  onClose: () => void
  onConfirm: () => void
}

export default function BulkDeleteDialog({ open, noteCount, folderCount, onClose, onConfirm }: Props) {
  const parts: string[] = []
  if (noteCount > 0) parts.push(`${noteCount} note${noteCount !== 1 ? "s" : ""}`)
  if (folderCount > 0) parts.push(`${folderCount} folder${folderCount !== 1 ? "s" : ""}`)
  const summary = parts.join(" and ")

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move to Trash</DialogTitle>
          <DialogDescription>
            Are you sure you want to move {summary} to trash? They will be automatically purged after 7 days.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>Move to Trash</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/BulkDeleteDialog.tsx
git commit -m "feat: add BulkDeleteDialog component"
```

---

### Task 3: Integrate selection into NotesSidebar — note items

**Files:**
- Modify: `src/components/NotesSidebar.tsx`

- [ ] **Step 1: Import useMultiSelect and BulkDeleteDialog**

At the top of `NotesSidebar.tsx`, add imports:

```ts
import { useMultiSelect } from "@/hooks/use-multi-select"
import BulkDeleteDialog from "./BulkDeleteDialog"
import { toast } from "sonner"
```

- [ ] **Step 2: Initialize the hook and refs inside NotesSidebar**

Inside the `NotesSidebar` component, after existing state declarations:

```ts
const { selectedIds, lastSelectedId, isSelecting, toggleSelect, selectRange, selectAll, clearSelection } = useMultiSelect()
const [bulkDeleteTarget, setBulkDeleteTarget] = useState<{ notes: string[]; folders: string[] } | null>(null)
const skipNextClearRef = useRef(false)
const preSelectIdRef = useRef<string | null>(null)
```

- [ ] **Step 3: Add route change effect with skip-next-clear guard**

```ts
useEffect(() => {
  if (skipNextClearRef.current) {
    skipNextClearRef.current = false
    return
  }
  clearSelection()
}, [pathname, clearSelection])
```

- [ ] **Step 4: Add keyboard shortcuts for Escape and Ctrl+A**

```ts
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
```

**Note:** Ctrl+A sidebar order is folders first (with their in-folder notes interleaved), then root notes.

- [ ] **Step 5: Modify `renderNoteItem` to handle selection clicks**

In the `renderNoteItem` function, modify the `onClick` handler of the `<Button>`:

```tsx
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
```

**Key behavior:**
- CTRL/SHIFT held → enter selection mode
- Plain click while selecting → clears selection, navigates, remembers anchor
- First plain click remembers `preSelectIdRef`, second CTRL/SHIFT click selects the anchor

- [ ] **Step 6: Add selection highlight styling to note items**

On the `<Button>` element in `renderNoteItem`, add selected class:

```tsx
className={`${asRootItem ? `data-active:font-normal ${navItemClass(density)}` : subItemClass(density)} ${
  selectedIds.has(note._id) ? "!bg-stone-300 dark:!bg-stone-700" : ""
}`}
```

- [ ] **Step 7: Wrap note context menu with bulk logic**

In `renderNoteItem`, replace the existing `<ContextMenuContent>` with conditional rendering:

```tsx
<ContextMenuContent>
  {isSelecting ? (
    <>
      <ContextMenuGroup>
        <ContextMenuLabel className="text-xs text-muted-foreground">
          {selectedIds.size} item{selectedIds.size !== 1 ? "s" : ""} selected
        </ContextMenuLabel>
      </ContextMenuGroup>
      <ContextMenuSeparator />
      {(() => {
        const noteIds = [...selectedIds].filter((id) => notes.some((n) => n._id === id))
        const favCount = noteIds.filter((id) => notes.find((n) => n._id === id)?.isFavorite).length
        const allFav = favCount === noteIds.length
        const noneFav = favCount === 0
        const label = allFav ? "Remove from Favorites" : noneFav ? "Add to Favorites" : `Add to Favorites (${favCount} already added)`
        return (
          <ContextMenuItem onClick={(e) => {
            e.stopPropagation()
            const toToggle = allFav
              ? noteIds
              : noteIds.filter((id) => !notes.find((n) => n._id === id)?.isFavorite)
            Promise.all(toToggle.map((id) => toggleFavorite(id)))
            clearSelection()
            toast.success(`${toToggle.length} note${toToggle.length !== 1 ? "s" : ""} updated`)
          }}>
            <Star /> {label}
          </ContextMenuItem>
        )
      })()}
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
```

- [ ] **Step 8: Commit**

```bash
git add src/components/NotesSidebar.tsx
git commit -m "feat: integrate multi-select into sidebar note items"
```

---

### Task 4: Integrate selection into NotesSidebar — folder items

**Files:**
- Modify: `src/components/NotesSidebar.tsx`

- [ ] **Step 1: Add folder click handler for selection**

In `renderFolder`, add a `handleFolderSelect` function before the return statement:

```tsx
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
```

Pass this handler to the `<SidebarMenuButton>` inside the folder's `<CollapsibleTrigger>`.

- [ ] **Step 2: Add selection highlight to folder items**

On the `<SidebarMenuButton>` for the folder, add to the className:

```tsx
className={`${navItemClass(density)} ${selectedIds.has(folder._id) ? "!bg-stone-300 dark:!bg-stone-700" : ""}`}
```

- [ ] **Step 3: Replace folder context menu with conditional bulk logic**

Replace the folder's `<ContextMenuContent>` with:

```tsx
<ContextMenuContent>
  {isSelecting ? (
    <>
      <ContextMenuGroup>
        <ContextMenuLabel className="text-xs text-muted-foreground">
          {selectedIds.size} item{selectedIds.size !== 1 ? "s" : ""} selected
        </ContextMenuLabel>
      </ContextMenuGroup>
      <ContextMenuSeparator />
      {(() => {
        const noteIds = [...selectedIds].filter((id) => notes.some((n) => n._id === id))
        const favCount = noteIds.filter((id) => notes.find((n) => n._id === id)?.isFavorite).length
        const allFav = favCount === noteIds.length
        const noneFav = favCount === 0
        const label = allFav ? "Remove from Favorites" : noneFav ? "Add to Favorites" : `Add to Favorites (${favCount} already added)`
        return (
          <ContextMenuItem onClick={(e) => {
            e.stopPropagation()
            const toToggle = allFav
              ? noteIds
              : noteIds.filter((id) => !notes.find((n) => n._id === id)?.isFavorite)
            Promise.all(toToggle.map((id) => toggleFavorite(id)))
            clearSelection()
            toast.success(`${toToggle.length} note${toToggle.length !== 1 ? "s" : ""} updated`)
          }}>
            <Star /> {label}
          </ContextMenuItem>
        )
      })()}
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
```

- [ ] **Step 4: Commit**

```bash
git add src/components/NotesSidebar.tsx
git commit -m "feat: integrate multi-select into sidebar folder items"
```

---

### Task 5: Add SelectionBar, BulkDeleteDialog, toasts, and selection cleanup

**Files:**
- Modify: `src/components/NotesSidebar.tsx`

- [ ] **Step 1: Render BulkDeleteDialog in sidebar**

At the bottom of the component's JSX return (near other dialogs), add:

```tsx
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
```

- [ ] **Step 2: Clear selection when drag starts**

In the `handleDragStartFn` function, add `clearSelection()` at the start:

```ts
const handleDragStartFn = (event: DragStartEvent) => {
  clearSelection()
  const id = event.active.id as string
  setActiveDragId(id)
  setActiveDragType(folders.some((f) => f._id === id) ? "folder" : "note")
}
```

- [ ] **Step 3: Clear selection when rename starts**

In the `startRenaming` function, add `clearSelection()` at the start:

```ts
const startRenaming = (id: string, currentName: string) => {
  clearSelection()
  setRenamingId(id)
  setRenameValue(currentName)
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/NotesSidebar.tsx
git commit -m "feat: add BulkDeleteDialog, toasts, and selection cleanup"
```

---

### Task 6: Add integration tests

**Files:**
- Modify: `src/__tests__/notes-sidebar.test.tsx`

- [ ] **Step 1: Add tests for selection highlighting, bulk context menu, and bulk operations**

Tests should cover:
- CTRL+click highlights note with stone background
- Bulk context menu shows correct favorite label based on selection state
- Bulk delete opens BulkDeleteDialog with correct counts
- Folder + notes selected: folder preserved in delete target

- [ ] **Step 2: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/notes-sidebar.test.tsx
git commit -m "test: add multi-select integration tests"
```

---

### Task 7: Final verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass, 0 failures

- [ ] **Step 2: Manual verification checklist**

- [ ] CTRL+Click note → toggles selection, highlighted stone background
- [ ] CTRL+Click folder → toggles selection
- [ ] SHIFT+Click → selects range
- [ ] Plain click note → navigates, clears selection, remembers anchor
- [ ] Second CTRL/SHIFT click → selects anchor + new item
- [ ] Right-click on selected items → bulk context menu with Favorites + Trash
- [ ] Right-click on unselected item → normal single-item context menu
- [ ] Bulk favorite shows correct label: "Add to Favorites", "Remove from Favorites", or "Add to Favorites (N already added)"
- [ ] Bulk favorite mixed state only toggles unfavorited notes
- [ ] Bulk trash preserves folder when its notes are also selected
- [ ] Escape clears selection
- [ ] Ctrl+A selects all items
- [ ] Drag-and-drop cancels selection
- [ ] Route change clears selection
- [ ] Existing note/folder context menus still work when nothing selected
- [ ] Renaming clears selection
