# Sidebar Multi-Select Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-select to the sidebar so users can select notes/folders with click/CTRL+SHIFT and bulk delete or favorite them via right-click context menu.

**Architecture:** A new `useMultiSelect` hook manages selection state. A `SelectionBar` component shows count + clear. The existing `NotesSidebar` integrates selection behavior into note/folder items and conditionally renders a bulk context menu when items are selected. Bulk operations reuse existing `deleteNote`/`deleteFolder`/`toggleFavorite` from `NoteContext`.

**Tech Stack:** React, TypeScript, shadcn/ui ContextMenu, sonner toasts, vitest + @testing-library/react

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/hooks/use-multi-select.ts` | **Create** | Selection state management hook |
| `src/components/SelectionBar.tsx` | **Create** | Compact bar showing count + Clear button |
| `src/components/BulkDeleteDialog.tsx` | **Create** | Confirmation dialog with dynamic bulk delete text |
| `src/components/NotesSidebar.tsx` | **Modify** | Integrate selection into items, render selection bar, bulk context menu |
| `src/__tests__/use-multi-select.test.ts` | **Create** | Unit tests for the hook |
| `src/__tests__/notes-sidebar.test.tsx` | **Modify** | Add multi-select integration tests |

---

### Task 1: Create `useMultiSelect` hook

**Files:**
- Create: `src/hooks/use-multi-select.ts`
- Test: `src/__tests__/use-multi-select.test.ts`

**Note:** The spec defines a `handleItemClick` method on the hook. This plan inlines that logic directly in the component's `onClick` handlers (Tasks 3-4) for clarity, since the logic depends on React event objects not available inside the hook.

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
import { useState, useCallback } from "react"

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)

  const isSelecting = selectedIds.size > 0

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
    setLastSelectedId(id)
  }, [])

  const selectRange = useCallback((id: string, allIds: string[]) => {
    setLastSelectedId((prevLast) => {
      if (!prevLast) {
        setSelectedIds((prev) => {
          const next = new Set(prev)
          next.add(id)
          return next
        })
        return id
      }
      const startIdx = allIds.indexOf(prevLast)
      const endIdx = allIds.indexOf(id)
      if (startIdx === -1 || endIdx === -1) {
        setSelectedIds((prev) => {
          const next = new Set(prev)
          next.add(id)
          return next
        })
        return id
      }
      const from = Math.min(startIdx, endIdx)
      const to = Math.max(startIdx, endIdx)
      const rangeIds = allIds.slice(from, to + 1)
      setSelectedIds((prev) => {
        const next = new Set(prev)
        rangeIds.forEach((rid) => next.add(rid))
        return next
      })
      return id
    })
  }, [])

  const selectAll = useCallback((allIds: string[]) => {
    setSelectedIds(new Set(allIds))
    setLastSelectedId(allIds[allIds.length - 1] ?? null)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setLastSelectedId(null)
  }, [])

  return {
    selectedIds,
    lastSelectedId,
    isSelecting,
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

### Task 2: Create `SelectionBar` component

**Files:**
- Create: `src/components/SelectionBar.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/SelectionBar.tsx
"use client"

import { X } from "lucide-react"

interface SelectionBarProps {
  count: number
  onClear: () => void
}

export default function SelectionBar({ count, onClear }: SelectionBarProps) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded-md mx-1 mb-1">
      <span className="font-medium">{count} selected</span>
      <button
        onClick={onClear}
        className="flex items-center gap-1 hover:bg-primary/80 px-1.5 py-0.5 rounded text-xs"
      >
        <X className="h-3 w-3" />
        Clear
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SelectionBar.tsx
git commit -m "feat: add SelectionBar component"
```

---

### Task 3: Integrate selection into NotesSidebar — note items

**Files:**
- Modify: `src/components/NotesSidebar.tsx`

- [ ] **Step 1: Import useMultiSelect and SelectionBar**

At the top of `NotesSidebar.tsx`, add imports after the existing hook imports (around line 5):

```ts
import { useMultiSelect } from "@/hooks/use-multi-select"
import SelectionBar from "./SelectionBar"
```

- [ ] **Step 2: Initialize the hook inside NotesSidebar**

Inside the `NotesSidebar` component, after the existing state declarations (around line 397), add:

```ts
const { selectedIds, lastSelectedId, isSelecting, toggleSelect, selectRange, selectAll, clearSelection } = useMultiSelect()
const [bulkDeleteTarget, setBulkDeleteTarget] = useState<{ notes: string[]; folders: string[] } | null>(null)
```

- [ ] **Step 3: Add keyboard shortcuts for Escape and Ctrl+A**

Inside the `useEffect` or add a new `useEffect` after the hook initialization:

```ts
import { useEffect } from "react"
```

Add this effect inside the component:

```ts
useEffect(() => {
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape" && isSelecting) {
      e.stopPropagation()
      clearSelection()
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "a" && isSelecting) {
      e.preventDefault()
      const allIds = [
        ...folders.map((f) => f._id),
        ...notes.filter((n) => !n.folderId).map((n) => n._id),
      ]
      selectAll(allIds)
    }
  }
  document.addEventListener("keydown", handleKeyDown)
  return () => document.removeEventListener("keydown", handleKeyDown)
}, [isSelecting, clearSelection, selectAll, folders, notes])
```

- [ ] **Step 4: Modify `renderNoteItem` to handle selection clicks**

In the `renderNoteItem` function (line 679), modify the `onClick` handler of the `<Button>` (around line 702) to handle selection:

```tsx
onClick={(e) => {
  if (e.ctrlKey || e.metaKey || e.shiftKey || isSelecting) {
    e.preventDefault()
    const allSidebarIds = [
      ...folders.map((f) => f._id),
      ...notes.filter((n) => !n.folderId).map((n) => n._id),
    ]
    if (e.shiftKey) {
      selectRange(note._id, allSidebarIds)
    } else {
      toggleSelect(note._id)
    }
    return
  }
  setActiveNoteId(note._id)
  setActiveFolderId(null)
  setSearchOpen(false)
  router.push(`/notes/${note._id}`)
}}
```

- [ ] **Step 5: Add selection highlight styling to note items**

On the `<Button>` element in `renderNoteItem` (around line 700), add the selected class:

```tsx
className={`${asRootItem ? `data-active:font-normal ${navItemClass(density)}` : subItemClass(density)} ${
  selectedIds.has(note._id) ? "bg-blue-100 dark:bg-blue-900/30 border-l-2 border-l-blue-500" : ""
}`}
```

- [ ] **Step 6: Wrap note context menu with bulk logic**

In `renderNoteItem`, replace the existing `<ContextMenuContent>` (lines 721-739) with conditional rendering:

```tsx
<ContextMenuContent>
  {isSelecting ? (
    <>
      <ContextMenuLabel className="text-xs text-muted-foreground">
        {selectedIds.size} item{selectedIds.size !== 1 ? "s" : ""} selected
      </ContextMenuLabel>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={(e) => {
        e.stopPropagation()
        const noteIds = [...selectedIds].filter((id) => notes.some((n) => n._id === id))
        Promise.all(noteIds.map((id) => toggleFavorite(id)))
        clearSelection()
      }}>
        <Star /> Add to Favorites
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        className="text-destructive focus:text-destructive"
        onClick={(e) => {
          e.stopPropagation()
          const noteIds = [...selectedIds].filter((id) => notes.some((n) => n._id === id))
          const folderIds = [...selectedIds].filter((id) => folders.some((f) => f._id === id))
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

- [ ] **Step 7: Commit**

```bash
git add src/components/NotesSidebar.tsx
git commit -m "feat: integrate multi-select into sidebar note items"
```

---

### Task 4: Integrate selection into NotesSidebar — folder items

**Files:**
- Modify: `src/components/NotesSidebar.tsx`

- [ ] **Step 1: Modify folder click handler for selection**

In `renderFolder` (line 746), the `<CollapsibleTrigger>` wraps a `<SidebarMenuButton>`. The click handling happens via `onOpenChange` on the `<Collapsible>` (line 755). Add selection handling to the folder's button.

Find the `<SidebarMenuButton>` inside the folder's `<CollapsibleTrigger>` (around line 763) and add an `onClick` handler:

```tsx
onClick={(e) => {
  if (e.ctrlKey || e.metaKey || e.shiftKey || isSelecting) {
    e.preventDefault()
    e.stopPropagation()
    const allSidebarIds = [
      ...folders.map((f) => f._id),
      ...notes.filter((n) => !n.folderId).map((n) => n._id),
    ]
    if (e.shiftKey) {
      selectRange(folder._id, allSidebarIds)
    } else {
      toggleSelect(folder._id)
    }
  }
}}
```

- [ ] **Step 2: Add selection highlight to folder items**

On the `<SidebarMenuButton>` for the folder (around line 763), add to the className:

```tsx
className={`${navItemClass(density)} ${selectedIds.has(folder._id) ? "bg-blue-100 dark:bg-blue-900/30 border-l-2 border-l-blue-500" : ""}`}
```

- [ ] **Step 3: Replace folder context menu with conditional bulk logic**

Replace the folder's `<ContextMenuContent>` (lines 782-793) with:

```tsx
<ContextMenuContent>
  {isSelecting ? (
    <>
      <ContextMenuLabel className="text-xs text-muted-foreground">
        {selectedIds.size} item{selectedIds.size !== 1 ? "s" : ""} selected
      </ContextMenuLabel>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={(e) => {
        e.stopPropagation()
        const noteIds = [...selectedIds].filter((id) => notes.some((n) => n._id === id))
        Promise.all(noteIds.map((id) => toggleFavorite(id)))
        clearSelection()
      }}>
        <Star /> Add to Favorites
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        className="text-destructive focus:text-destructive"
        onClick={(e) => {
          e.stopPropagation()
          const noteIds = [...selectedIds].filter((id) => notes.some((n) => n._id === id))
          const folderIds = [...selectedIds].filter((id) => folders.some((f) => f._id === id))
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

### Task 5: Create BulkDeleteDialog component

**Files:**
- Create: `src/components/BulkDeleteDialog.tsx`

- [ ] **Step 1: Create BulkDeleteDialog**

This component extends the pattern of `DeleteConfirmDialog` but with dynamic text for bulk operations.

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

### Task 6: Add SelectionBar and integrate bulk dialog + toasts into NotesSidebar

**Files:**
- Modify: `src/components/NotesSidebar.tsx`

- [ ] **Step 1: Import BulkDeleteDialog and toast**

At the top of `NotesSidebar.tsx`, add imports:

```ts
import BulkDeleteDialog from "./BulkDeleteDialog"
import { toast } from "sonner"
```

- [ ] **Step 2: Render SelectionBar in sidebar header**

Find the sidebar header toolbar (around line 834, the `<div className="flex items-center gap-0.5 px-1 pb-1" role="toolbar">`). Add the SelectionBar conditionally before it:

```tsx
{isSelecting && <SelectionBar count={selectedIds.size} onClear={clearSelection} />}
```

- [ ] **Step 3: Replace DeleteConfirmDialog with BulkDeleteDialog for bulk ops**

At the bottom of the component's JSX return (near the other dialogs around line 1118), replace the bulk delete dialog with:

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

- [ ] **Step 4: Add toast to bulk favorite in context menus**

In both the note and folder context menu bulk favorite handlers (Tasks 3-4), add a toast after the Promise.all. Update the handler to:

```tsx
onClick={(e) => {
  e.stopPropagation()
  const noteIds = [...selectedIds].filter((id) => notes.some((n) => n._id === id))
  Promise.all(noteIds.map((id) => toggleFavorite(id)))
  clearSelection()
  toast.success(`${noteIds.length} note${noteIds.length !== 1 ? "s" : ""} updated`)
}}
```

- [ ] **Step 5: Add useEffect to clear selection on route change**

Add this effect inside the component:

```ts
useEffect(() => {
  clearSelection()
}, [pathname, clearSelection])
```

- [ ] **Step 6: Clear selection when drag starts**

In the `handleDragStart` function (around line 588), add `clearSelection()`:

```ts
const handleDragStartFn = (event: DragStartEvent) => {
  clearSelection()
  setActiveDragId(event.active.id as string)
  setActiveDragType(event.active.data.current?.type ?? null)
}
```

- [ ] **Step 7: Clear selection when rename starts**

In the `startRenaming` function, add `clearSelection()` at the start.

- [ ] **Step 8: Commit**

```bash
git add src/components/NotesSidebar.tsx
git commit -m "feat: add SelectionBar, BulkDeleteDialog, toasts, and selection cleanup"
```

---

### Task 7: Add integration tests

**Files:**
- Modify: `src/__tests__/notes-sidebar.test.tsx`

- [ ] **Step 1: Add test for selection highlighting**

```tsx
it("highlights selected note items", () => {
  renderSidebar()
  const noteButtons = screen.getAllByText("Note 1")
  const noteButton = noteButtons[0]
  if (noteButton) {
    fireEvent.click(noteButton)
    expect(noteButton.className).toContain("bg-blue-100")
  }
})
```

- [ ] **Step 2: Add test for SelectionBar appearing**

```tsx
it("shows SelectionBar when items are selected", () => {
  renderSidebar()
  const noteButtons = screen.getAllByText("Note 1")
  const noteButton = noteButtons[0]
  if (noteButton) {
    fireEvent.click(noteButton)
    expect(screen.getByText("1 selected")).toBeInTheDocument()
  }
})
```

- [ ] **Step 3: Add test for bulk delete via context menu**

```tsx
it("shows bulk delete option when items are selected", () => {
  const deleteNote = vi.fn()
  vi.mocked(useNotes).mockReturnValue(createMockContext({ deleteNote }))
  renderSidebar()
  const noteButtons = screen.getAllByText("Note 1")
  const noteButton = noteButtons[0]
  if (noteButton) {
    fireEvent.click(noteButton)
    expect(screen.getByText(/Move to Trash/)).toBeInTheDocument()
  }
})
```

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/notes-sidebar.test.tsx
git commit -m "test: add multi-select integration tests"
```

---

### Task 8: Final verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass, 0 failures

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Run linter**

Run: `npx eslint src/hooks/use-multi-select.ts src/components/SelectionBar.tsx src/components/NotesSidebar.tsx`
Expected: No errors

- [ ] **Step 4: Manual verification checklist**

- [ ] Click a note → enters selection mode, note highlighted blue
- [ ] Click another note → toggles it
- [ ] CTRL+Click → toggles individual items
- [ ] SHIFT+Click → selects range
- [ ] Selection bar shows count + Clear button
- [ ] Clear button resets selection
- [ ] Escape resets selection
- [ ] Right-click on selected items → bulk context menu with Favorites + Trash
- [ ] Right-click on unselected item → normal single-item context menu
- [ ] Bulk trash opens confirmation, then deletes selected items
- [ ] Bulk favorite toggles favorite for selected notes
- [ ] Drag-and-drop cancels selection
- [ ] Route change clears selection
- [ ] Existing note/folder context menus still work when nothing selected

- [ ] **Step 5: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address review feedback for sidebar multi-select"
```
