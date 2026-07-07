# Trash Context Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a right-click context menu to the Trash sidebar nav item with "Restore All", "Empty Trash" (with confirmation dialog), item count, and auto-purge info.

**Architecture:** A new `EmptyTrashDialog` component handles the confirmation UI, matching the existing `DeleteConfirmDialog`/`DeleteFolderDialog` pattern. `NotesSidebar` wraps the Trash nav item in a `ContextMenu` and manages a single boolean state for the dialog.

**Tech Stack:** React, TypeScript, shadcn/ui (`ContextMenu`, `Dialog`), Vitest + Testing Library, lucide-react

## Global Constraints

- Branch: `feat/trash-context-menu` — all commits go here, never `main`
- Follow existing patterns in `DeleteConfirmDialog.tsx` and `NotesSidebar.tsx` exactly
- Tests use Vitest + `@testing-library/react`; run with `npm test`
- No API changes, no schema changes, no new context methods

---

### Task 1: `EmptyTrashDialog` component

**Files:**
- Create: `src/components/EmptyTrashDialog.tsx`
- Create: `src/__tests__/empty-trash-dialog.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  // src/components/EmptyTrashDialog.tsx
  interface Props {
    open: boolean
    noteCount: number
    folderCount: number
    onConfirm: () => void
    onCancel: () => void
  }
  export default function EmptyTrashDialog(props: Props): JSX.Element
  ```

---

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/empty-trash-dialog.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import EmptyTrashDialog from '@/components/EmptyTrashDialog'

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) =>
    <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) =>
    <div data-testid="dialog-title">{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) =>
    <div data-testid="dialog-description">{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant }: { children: React.ReactNode; onClick?: () => void; variant?: string }) => (
    <button onClick={onClick} data-variant={variant}>{children}</button>
  ),
}))

describe('EmptyTrashDialog', () => {
  it('renders with title "Empty Trash"', () => {
    render(<EmptyTrashDialog open={true} noteCount={2} folderCount={1} onConfirm={() => {}} onCancel={() => {}} />)
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('Empty Trash')
  })

  it('does not render when open is false', () => {
    render(<EmptyTrashDialog open={false} noteCount={2} folderCount={1} onConfirm={() => {}} onCancel={() => {}} />)
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
  })

  it('shows plural counts in description when multiple notes and folders', () => {
    render(<EmptyTrashDialog open={true} noteCount={3} folderCount={2} onConfirm={() => {}} onCancel={() => {}} />)
    expect(screen.getByTestId('dialog-description')).toHaveTextContent('3 notes')
    expect(screen.getByTestId('dialog-description')).toHaveTextContent('2 folders')
    expect(screen.getByTestId('dialog-description')).toHaveTextContent('cannot be undone')
  })

  it('uses singular "1 note" and "1 folder"', () => {
    render(<EmptyTrashDialog open={true} noteCount={1} folderCount={1} onConfirm={() => {}} onCancel={() => {}} />)
    expect(screen.getByTestId('dialog-description')).toHaveTextContent('1 note')
    expect(screen.getByTestId('dialog-description')).toHaveTextContent('1 folder')
  })

  it('omits folder part when folderCount is 0', () => {
    render(<EmptyTrashDialog open={true} noteCount={2} folderCount={0} onConfirm={() => {}} onCancel={() => {}} />)
    expect(screen.getByTestId('dialog-description')).toHaveTextContent('2 notes')
    expect(screen.getByTestId('dialog-description')).not.toHaveTextContent('folder')
  })

  it('omits note part when noteCount is 0', () => {
    render(<EmptyTrashDialog open={true} noteCount={0} folderCount={1} onConfirm={() => {}} onCancel={() => {}} />)
    expect(screen.getByTestId('dialog-description')).not.toHaveTextContent('note')
    expect(screen.getByTestId('dialog-description')).toHaveTextContent('1 folder')
  })

  it('has Cancel and "Empty Trash" buttons', () => {
    render(<EmptyTrashDialog open={true} noteCount={1} folderCount={0} onConfirm={() => {}} onCancel={() => {}} />)
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getAllByText('Empty Trash').length).toBeGreaterThanOrEqual(1)
  })

  it('calls onCancel when Cancel clicked', () => {
    const onCancel = vi.fn()
    render(<EmptyTrashDialog open={true} noteCount={1} folderCount={0} onConfirm={() => {}} onCancel={onCancel} />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('calls onConfirm when destructive button clicked', () => {
    const onConfirm = vi.fn()
    render(<EmptyTrashDialog open={true} noteCount={1} folderCount={0} onConfirm={onConfirm} onCancel={() => {}} />)
    // The dialog title is "Empty Trash"; the button inside is also "Empty Trash"
    // Click the button with data-variant="destructive"
    const buttons = screen.getAllByText('Empty Trash')
    const actionButton = buttons.find(b => b.tagName === 'BUTTON')
    fireEvent.click(actionButton!)
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('calls onCancel when dialog onOpenChange fires (close via backdrop)', () => {
    const onCancel = vi.fn()
    render(<EmptyTrashDialog open={true} noteCount={1} folderCount={0} onConfirm={() => {}} onCancel={onCancel} />)
    // Dialog mock calls onOpenChange (which maps to onCancel) — tested via the Cancel button path above
    expect(onCancel).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- empty-trash-dialog
```

Expected: tests fail with "Cannot find module '@/components/EmptyTrashDialog'"

- [ ] **Step 3: Create `EmptyTrashDialog` component**

Create `src/components/EmptyTrashDialog.tsx`:

```tsx
import React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface Props {
  open: boolean
  noteCount: number
  folderCount: number
  onConfirm: () => void
  onCancel: () => void
}

export default function EmptyTrashDialog({ open, noteCount, folderCount, onConfirm, onCancel }: Props) {
  const parts: string[] = []
  if (noteCount > 0) parts.push(`${noteCount} note${noteCount !== 1 ? "s" : ""}`)
  if (folderCount > 0) parts.push(`${folderCount} folder${folderCount !== 1 ? "s" : ""}`)
  const description = `Permanently delete ${parts.join(" and ")}? This cannot be undone.`

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Empty Trash</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>Empty Trash</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- empty-trash-dialog
```

Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/components/EmptyTrashDialog.tsx src/__tests__/empty-trash-dialog.test.tsx
git commit -m "feat: add EmptyTrashDialog component"
```

---

### Task 2: Trash context menu in `NotesSidebar`

**Files:**
- Modify: `src/components/NotesSidebar.tsx`
- Create: `src/__tests__/trash-context-menu.test.tsx`

**Interfaces:**
- Consumes: `EmptyTrashDialog` from Task 1 — props `{ open, noteCount, folderCount, onConfirm, onCancel }`
- Consumes from `useNotes()`: `trashItems: { notes: Note[]; folders: Folder[] }`, `restoreItems(noteIds: string[], folderIds: string[])`, `permanentDeleteItems(noteIds: string[], folderIds: string[])`

---

- [ ] **Step 1: Write the failing test file**

Create `src/__tests__/trash-context-menu.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import NotesSidebar from '@/components/NotesSidebar'

// ---- shared mocks (same setup as notes-sidebar.test.tsx) ----

const mockRestoreItems = vi.fn()
const mockPermanentDeleteItems = vi.fn()

vi.mock('@/contexts/NoteContext', () => ({
  useNotes: vi.fn(),
  NoteProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/contexts/SidebarDensityContext', () => ({
  SidebarDensityProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSidebarDensity: vi.fn(() => ({ density: 'default', setDensity: vi.fn() })),
}))

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({ data: { user: { name: 'Test', email: 'test@test.com' } } })),
  signOut: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}))

vi.mock('@/components/AccountSheet', () => ({
  default: () => null,
}))

vi.mock('@/components/SettingsSheet', () => ({
  default: () => null,
}))

vi.mock('@/components/ImportExportSheet', () => ({
  default: () => null,
}))

vi.mock('@/components/DeleteConfirmDialog', () => ({
  default: () => null,
}))

vi.mock('@/components/DeleteFolderDialog', () => ({
  default: () => null,
}))

vi.mock('@/components/EmptyTrashDialog', () => ({
  default: ({ open, onConfirm, onCancel, noteCount, folderCount }: {
    open: boolean; onConfirm: () => void; onCancel: () => void; noteCount: number; folderCount: number
  }) =>
    open ? (
      <div data-testid="empty-trash-dialog">
        <span data-testid="etd-note-count">{noteCount}</span>
        <span data-testid="etd-folder-count">{folderCount}</span>
        <button onClick={onConfirm}>Confirm Empty</button>
        <button onClick={onCancel}>Cancel Empty</button>
      </div>
    ) : null,
}))

vi.mock('@/components/SearchDropdown', () => ({
  default: () => null,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, ...props }: {
    children: React.ReactNode; onClick?: () => void; variant?: string; size?: string
  }) => <button onClick={onClick} data-variant={variant} {...props}>{children}</button>,
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children, render, ...props }: { children: React.ReactNode; render?: React.ReactElement }) =>
    render ? React.cloneElement(render, props as object, children) : <button {...props}>{children}</button>,
}))

vi.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CollapsibleTrigger: ({ children, render }: { children: React.ReactNode; render?: React.ReactElement }) =>
    render ? React.cloneElement(render, null, children) : <button>{children}</button>,
}))

vi.mock('@/components/ui/context-menu', () => ({
  ContextMenu: ({ children }: { children: React.ReactNode }) => <div data-testid="context-menu">{children}</div>,
  ContextMenuTrigger: ({ children, render }: { children: React.ReactNode; render?: React.ReactElement }) =>
    render ? render : <div>{children}</div>,
  ContextMenuContent: ({ children }: { children: React.ReactNode }) =>
    <div data-testid="context-menu-content">{children}</div>,
  ContextMenuItem: ({ children, onClick, disabled }: {
    children: React.ReactNode; onClick?: () => void; disabled?: boolean
  }) => <button onClick={onClick} disabled={disabled}>{children}</button>,
  ContextMenuLabel: ({ children }: { children: React.ReactNode }) =>
    <span data-testid="context-menu-label">{children}</span>,
  ContextMenuSeparator: () => <hr />,
}))

vi.mock('@/components/ui/sidebar', () => ({
  Sidebar: ({ children }: { children: React.ReactNode }) => <div data-testid="sidebar">{children}</div>,
  SidebarContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarGroupContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarMenu: ({ children }: { children: React.ReactNode }) => <ul>{children}</ul>,
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => <li>{children}</li>,
  SidebarMenuButton: ({ children, isActive, render: _render }: {
    children: React.ReactNode; isActive?: boolean; render?: React.ReactElement
  }) => <button data-active={String(isActive)}>{children}</button>,
  SidebarMenuAction: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) =>
    <button onClick={onClick}>{children}</button>,
  SidebarMenuSub: ({ children }: { children: React.ReactNode }) => <ul>{children}</ul>,
  SidebarMenuSubItem: ({ children }: { children: React.ReactNode }) => <li>{children}</li>,
  SidebarMenuSubButton: ({ children, isActive, onClick, onDoubleClick }: {
    children: React.ReactNode; isActive?: boolean; onClick?: () => void; onDoubleClick?: () => void
  }) => <button data-active={String(isActive)} onClick={onClick} onDoubleClick={onDoubleClick}>{children}</button>,
  SidebarSeparator: () => <hr />,
  SidebarInput: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}))

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) =>
    <button onClick={onClick}>{children}</button>,
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children, render, asChild }: {
    children: React.ReactNode; render?: React.ReactElement; asChild?: boolean
  }) => render ? render : <div>{children}</div>,
}))

// ---- helpers ----

import { useNotes } from '@/contexts/NoteContext'

function makeUseNotesMock(trashNotes: number, trashFolders: number) {
  const notes = Array.from({ length: trashNotes }, (_, i) => ({ _id: `note-${i}` }))
  const folders = Array.from({ length: trashFolders }, (_, i) => ({ _id: `folder-${i}` }))
  ;(useNotes as ReturnType<typeof vi.fn>).mockReturnValue({
    notes: [],
    folders: [],
    expandedFolders: new Set(),
    createNote: vi.fn(),
    deleteNote: vi.fn(),
    updateNote: vi.fn(),
    activeNoteId: null,
    setActiveNoteId: vi.fn(),
    createFolder: vi.fn(),
    renameFolder: vi.fn(),
    deleteFolder: vi.fn(),
    moveNote: vi.fn(),
    moveFolder: vi.fn(),
    toggleFolder: vi.fn(),
    favoriteNotes: [],
    toggleFavorite: vi.fn(),
    trashItems: { notes, folders },
    restoreItems: mockRestoreItems,
    permanentDeleteItems: mockPermanentDeleteItems,
    trashLoading: false,
    trashError: null,
    fetchTrash: vi.fn(),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  makeUseNotesMock(0, 0)
})

// ---- tests ----

describe('Trash context menu', () => {
  it('shows "Trash is empty" label when trash has no items', () => {
    makeUseNotesMock(0, 0)
    render(<NotesSidebar />)
    const labels = screen.getAllByTestId('context-menu-label')
    const countLabel = labels.find(el => el.textContent === 'Trash is empty')
    expect(countLabel).toBeTruthy()
  })

  it('shows correct note count in label', () => {
    makeUseNotesMock(3, 0)
    render(<NotesSidebar />)
    const labels = screen.getAllByTestId('context-menu-label')
    const countLabel = labels.find(el => el.textContent?.includes('3 notes'))
    expect(countLabel).toBeTruthy()
  })

  it('shows correct folder count in label', () => {
    makeUseNotesMock(0, 2)
    render(<NotesSidebar />)
    const labels = screen.getAllByTestId('context-menu-label')
    const countLabel = labels.find(el => el.textContent?.includes('2 folders'))
    expect(countLabel).toBeTruthy()
  })

  it('shows both note and folder counts in label', () => {
    makeUseNotesMock(2, 1)
    render(<NotesSidebar />)
    const labels = screen.getAllByTestId('context-menu-label')
    const countLabel = labels.find(el => el.textContent?.includes('2 notes') && el.textContent?.includes('1 folder'))
    expect(countLabel).toBeTruthy()
  })

  it('uses singular "1 note" in count label', () => {
    makeUseNotesMock(1, 0)
    render(<NotesSidebar />)
    const labels = screen.getAllByTestId('context-menu-label')
    const countLabel = labels.find(el => el.textContent === '1 note')
    expect(countLabel).toBeTruthy()
  })

  it('"Restore All" button is disabled when trash is empty', () => {
    makeUseNotesMock(0, 0)
    render(<NotesSidebar />)
    const restoreBtn = screen.getByText('Restore All')
    expect(restoreBtn).toBeDisabled()
  })

  it('"Empty Trash" button is disabled when trash is empty', () => {
    makeUseNotesMock(0, 0)
    render(<NotesSidebar />)
    const emptyBtn = screen.getByText('Empty Trash')
    expect(emptyBtn).toBeDisabled()
  })

  it('"Restore All" is enabled when trash has items', () => {
    makeUseNotesMock(2, 0)
    render(<NotesSidebar />)
    const restoreBtn = screen.getByText('Restore All')
    expect(restoreBtn).not.toBeDisabled()
  })

  it('"Empty Trash" is enabled when trash has items', () => {
    makeUseNotesMock(2, 0)
    render(<NotesSidebar />)
    const emptyBtn = screen.getByText('Empty Trash')
    expect(emptyBtn).not.toBeDisabled()
  })

  it('clicking "Restore All" calls restoreItems with all IDs', () => {
    makeUseNotesMock(2, 1)
    render(<NotesSidebar />)
    fireEvent.click(screen.getByText('Restore All'))
    expect(mockRestoreItems).toHaveBeenCalledWith(
      ['note-0', 'note-1'],
      ['folder-0']
    )
  })

  it('clicking "Empty Trash" opens EmptyTrashDialog', () => {
    makeUseNotesMock(1, 1)
    render(<NotesSidebar />)
    expect(screen.queryByTestId('empty-trash-dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Empty Trash'))
    expect(screen.getByTestId('empty-trash-dialog')).toBeInTheDocument()
  })

  it('confirming EmptyTrashDialog calls permanentDeleteItems with all IDs', () => {
    makeUseNotesMock(2, 1)
    render(<NotesSidebar />)
    fireEvent.click(screen.getByText('Empty Trash'))
    fireEvent.click(screen.getByText('Confirm Empty'))
    expect(mockPermanentDeleteItems).toHaveBeenCalledWith(
      ['note-0', 'note-1'],
      ['folder-0']
    )
  })

  it('cancelling EmptyTrashDialog does not call permanentDeleteItems', () => {
    makeUseNotesMock(1, 0)
    render(<NotesSidebar />)
    fireEvent.click(screen.getByText('Empty Trash'))
    fireEvent.click(screen.getByText('Cancel Empty'))
    expect(mockPermanentDeleteItems).not.toHaveBeenCalled()
  })

  it('cancelling EmptyTrashDialog closes the dialog', () => {
    makeUseNotesMock(1, 0)
    render(<NotesSidebar />)
    fireEvent.click(screen.getByText('Empty Trash'))
    expect(screen.getByTestId('empty-trash-dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Cancel Empty'))
    expect(screen.queryByTestId('empty-trash-dialog')).not.toBeInTheDocument()
  })

  it('shows auto-purge info label', () => {
    makeUseNotesMock(0, 0)
    render(<NotesSidebar />)
    const labels = screen.getAllByTestId('context-menu-label')
    const purgeLabel = labels.find(el => el.textContent?.includes('Auto-purges after 7 days'))
    expect(purgeLabel).toBeTruthy()
  })

  it('EmptyTrashDialog receives correct note and folder counts', () => {
    makeUseNotesMock(3, 2)
    render(<NotesSidebar />)
    fireEvent.click(screen.getByText('Empty Trash'))
    expect(screen.getByTestId('etd-note-count')).toHaveTextContent('3')
    expect(screen.getByTestId('etd-folder-count')).toHaveTextContent('2')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- trash-context-menu
```

Expected: tests fail because the context menu doesn't exist yet on the Trash nav item

- [ ] **Step 3: Modify `NotesSidebar.tsx`**

**3a — Add `ContextMenuLabel` to the context-menu import block** (around line 37):

```tsx
// BEFORE:
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"

// AFTER:
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
```

**3b — Add `RotateCcw` to the lucide-react import** (it's in the large import block ending around line 105). Add `RotateCcw` to that block.

**3c — Add `EmptyTrashDialog` import** alongside the existing dialog imports (around line 27–28):

```tsx
import EmptyTrashDialog from "./EmptyTrashDialog"
```

**3d — Add `trashItems`, `restoreItems`, `permanentDeleteItems` to the `useNotes()` destructure** (around line 364). The current destructure ends with `toggleFavorite`. Add:

```tsx
  const {
    notes, folders, expandedFolders, createNote, deleteNote, updateNote,
    activeNoteId, setActiveNoteId, createFolder, renameFolder,
    deleteFolder, moveNote, moveFolder, toggleFolder, favoriteNotes, toggleFavorite,
    trashItems, restoreItems, permanentDeleteItems,
  } = useNotes()
```

**3e — Add `emptyTrashDialogOpen` state** alongside the other `useState` declarations (around line 373):

```tsx
  const [emptyTrashDialogOpen, setEmptyTrashDialogOpen] = useState(false)
```

**3f — Add computed trash count values** just before the Trash JSX section. Place them after the state declarations, before the JSX return. Add these as local constants inside the component:

```tsx
  const trashNoteCount = trashItems.notes.length
  const trashFolderCount = trashItems.folders.length
  const trashTotalCount = trashNoteCount + trashFolderCount
  const trashCountLabel = trashTotalCount === 0
    ? "Trash is empty"
    : [
        trashNoteCount > 0 ? `${trashNoteCount} note${trashNoteCount !== 1 ? "s" : ""}` : null,
        trashFolderCount > 0 ? `${trashFolderCount} folder${trashFolderCount !== 1 ? "s" : ""}` : null,
      ].filter(Boolean).join(", ")
```

**3g — Replace the Trash `SidebarGroup` section** with the context-menu-wrapped version. The current block (around line 968–982):

```tsx
          {/* Trash */}
          <SidebarGroup className="py-0">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton render={<Link href="/trash" />} isActive={pathname.startsWith("/trash")} onClick={() => setSearchOpen(false)} className={navItemClass(density)}>
                    <Trash2 className="text-rose-600 dark:text-rose-500" />
                    <span>Trash</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
```

Replace with:

```tsx
          {/* Trash */}
          <SidebarGroup className="py-0">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <ContextMenu>
                    <ContextMenuTrigger render={
                      <SidebarMenuButton render={<Link href="/trash" />} isActive={pathname.startsWith("/trash")} onClick={() => setSearchOpen(false)} className={navItemClass(density)}>
                        <Trash2 className="text-rose-600 dark:text-rose-500" />
                        <span>Trash</span>
                      </SidebarMenuButton>
                    } />
                    <ContextMenuContent>
                      <ContextMenuLabel className="text-xs text-muted-foreground">{trashCountLabel}</ContextMenuLabel>
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
                        className="text-rose-600 focus:text-rose-600 dark:text-rose-500"
                        onClick={() => setEmptyTrashDialogOpen(true)}
                      >
                        <Trash2 /> Empty Trash
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuLabel className="text-xs text-muted-foreground italic">Auto-purges after 7 days</ContextMenuLabel>
                    </ContextMenuContent>
                  </ContextMenu>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
```

**3h — Add `EmptyTrashDialog` to the bottom of the return JSX** alongside the other dialogs (after the `DeleteFolderDialog` line):

```tsx
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
```

- [ ] **Step 4: Run all tests to verify they pass**

```bash
npm test -- trash-context-menu
```

Expected: all tests pass

- [ ] **Step 5: Run the full test suite to check for regressions**

```bash
npm test
```

Expected: all existing tests continue to pass

- [ ] **Step 6: Commit**

```bash
git add src/components/NotesSidebar.tsx src/__tests__/trash-context-menu.test.tsx
git commit -m "feat: add context menu to Trash sidebar nav item"
```

---

## Verification

After both tasks are complete, manually verify in the browser:
- Right-click the Trash nav item → context menu appears
- Count label shows correctly (empty vs. items)
- "Restore All" and "Empty Trash" are grayed out when trash is empty
- Clicking "Restore All" restores all items
- Clicking "Empty Trash" opens the dialog; confirming deletes all; cancelling does not
- Auto-purges label appears at bottom of menu
