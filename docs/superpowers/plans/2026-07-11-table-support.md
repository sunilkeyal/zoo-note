# Table Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add table creation, editing, and management to the ZooNote Tiptap editor, plus table support in PDF export, markdown export, and OneNote import.

**Architecture:** Four Tiptap first-party table extensions are registered in the existing `useEditor` call. Three new React components handle UI (grid picker, floating toolbar, context menu). CSS is added to `globals.css` and `pdf.ts`. OneNote import gets a normalization pass. Markdown export gets `turndown-plugin-gfm`.

**Tech Stack:** Tiptap v3 table extensions, React 19, shadcn/ui (`Popover`, `Tooltip`, `Separator`), lucide-react, vitest + React Testing Library, `turndown-plugin-gfm`

## Global Constraints

- All Tiptap packages must match major version `^3` (project currently uses `^3.27.1`)
- All tests run with `npm test` (vitest, jsdom environment, `@testing-library/jest-dom`)
- CSS classes must use `.ProseMirror` prefix (not `.note-editor`) to match the existing globals.css pattern
- TypeScript strict mode — no `any` casts except in test mocks
- No cell merging UI — `toggleHeaderRow` is the only header operation in scope

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Modify | `package.json` | Add 4 Tiptap table pkgs + `turndown-plugin-gfm` + `@types/turndown-plugin-gfm` |
| Modify | `src/components/MainArea.tsx` | Register extensions; add components to both toolbars; wire refs |
| Create | `src/components/TableGridPicker.tsx` | 8×8 grid picker Popover for inserting a table |
| Create | `src/components/TableFloatingToolbar.tsx` | Floating action bar visible when cursor is inside a table |
| Create | `src/components/TableContextMenu.tsx` | Right-click context menu for table operations |
| Modify | `src/app/globals.css` | Table styles under `.ProseMirror` |
| Modify | `src/lib/pdf.ts` | Table CSS added to `EDITOR_STYLES` string |
| Modify | `src/lib/export.ts` | Register `turndown-plugin-gfm` tables plugin |
| Modify | `src/lib/onenote/import.ts` | Add `normalizeOneNoteTables`; call in pipeline |
| Create | `src/__tests__/table-grid-picker.test.tsx` | Unit tests for TableGridPicker |
| Create | `src/__tests__/table-floating-toolbar.test.tsx` | Unit tests for TableFloatingToolbar |
| Create | `src/__tests__/table-context-menu.test.tsx` | Unit tests for TableContextMenu |
| Modify | `src/__tests__/main-area.test.tsx` | Add table commands to mock; add `Table` icon to lucide mock |
| Modify | `src/__tests__/export.test.ts` | Test GFM table markdown conversion |
| Modify | `src/__tests__/onenote-import.test.ts` | Test `normalizeOneNoteTables` |

---

### Task 1: Install packages and register Tiptap table extensions

**Files:**
- Modify: `package.json`
- Modify: `src/components/MainArea.tsx`

**Interfaces:**
- Produces: `Table`, `TableRow`, `TableHeader`, `TableCell` extensions available in `useEditor`; all Tiptap table commands (`insertTable`, `addRowBefore`, `addRowAfter`, `deleteRow`, `addColumnBefore`, `addColumnAfter`, `deleteColumn`, `toggleHeaderRow`, `deleteTable`) available on `editor.chain().focus()`

- [ ] **Step 1: Install the packages**

```bash
cd /Users/sunil.keyal@optum.com/Projects/sunilkeyal/zoo-note
npm install @tiptap/extension-table@^3 @tiptap/extension-table-row@^3 @tiptap/extension-table-header@^3 @tiptap/extension-table-cell@^3 turndown-plugin-gfm
npm install -D @types/turndown-plugin-gfm
```

Expected: packages resolve without version conflicts (all `@tiptap/*` should land at `^3.27.x`).

- [ ] **Step 2: Run existing tests to confirm no regressions**

```bash
npm test
```

Expected: all existing tests pass.

- [ ] **Step 3: Add imports to `MainArea.tsx`**

Open `src/components/MainArea.tsx`. Add these four imports after the existing `import { CustomTaskItem }` line:

```typescript
import Table from "@tiptap/extension-table"
import TableRow from "@tiptap/extension-table-row"
import TableHeader from "@tiptap/extension-table-header"
import TableCell from "@tiptap/extension-table-cell"
```

- [ ] **Step 4: Register extensions in `useEditor`**

In `MainArea.tsx`, find the `extensions: [` array inside `useEditor`. After `ImageNode,`, add:

```typescript
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
```

The full extensions array becomes:

```typescript
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      SearchHighlight.configure({ multicolor: true }),
      FontFamily,
      FontSize,
      ParagraphSpacing,
      TaskList,
      CustomTaskItem.configure({ nested: true }),
      ImageNode,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
```

- [ ] **Step 5: Run tests to confirm no regressions**

```bash
npm test
```

Expected: all existing tests pass (the new extensions are registered but no UI change yet).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/components/MainArea.tsx
git commit -m "feat: install and register Tiptap table extensions"
```

---

### Task 2: Table CSS — editor styles and PDF export

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/lib/pdf.ts`

**Interfaces:**
- Produces: `.ProseMirror table` styled; `.selectedCell` highlighted; `EDITOR_STYLES` in pdf.ts includes table CSS

- [ ] **Step 1: Add table styles to `globals.css`**

At the end of `src/app/globals.css` (after the `.editor-toolbar-mobile` block), add:

```css
/* Table styles */
.ProseMirror table {
  border-collapse: collapse;
  width: 100%;
  margin: 0.75em 0;
  table-layout: fixed;
  overflow: hidden;
}
.ProseMirror table td,
.ProseMirror table th {
  border: 1px solid var(--border);
  padding: 6px 10px;
  min-width: 40px;
  vertical-align: top;
  position: relative;
  box-sizing: border-box;
}
.ProseMirror table th {
  background: var(--muted);
  font-weight: 600;
  text-align: left;
}
.ProseMirror table .selectedCell::after {
  z-index: 2;
  position: absolute;
  content: "";
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: oklch(0.205 0 0 / 0.06);
  pointer-events: none;
}
.dark .ProseMirror table .selectedCell::after {
  background: oklch(0.922 0 0 / 0.10);
}
.ProseMirror table .column-resize-handle {
  position: absolute;
  right: -2px;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--primary);
  opacity: 0;
  cursor: col-resize;
  pointer-events: all;
}
.ProseMirror table .column-resize-handle:hover,
.ProseMirror.resize-cursor table .column-resize-handle {
  opacity: 0.3;
}
.ProseMirror.resize-cursor {
  cursor: col-resize;
}
```

- [ ] **Step 2: Add table CSS to `EDITOR_STYLES` in `pdf.ts`**

Open `src/lib/pdf.ts`. Find the `EDITOR_STYLES` template literal. At the end of the string (before the closing backtick), add:

```css
  table { border-collapse: collapse; width: 100%; margin: 8px 0; }
  th, td { border: 1px solid #d1d5db; padding: 6px 10px; text-align: left; vertical-align: top; }
  th { background: #f3f4f6; font-weight: 600; }
```

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: all tests pass (CSS-only changes, no logic touched).

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css src/lib/pdf.ts
git commit -m "feat: add table CSS to editor styles and PDF export"
```

---

### Task 3: `TableGridPicker` component

**Files:**
- Create: `src/components/TableGridPicker.tsx`
- Create: `src/__tests__/table-grid-picker.test.tsx`

**Interfaces:**
- Produces: `TableGridPicker({ editor: Editor, triggerClassName?: string }): JSX.Element`
  - Renders a `Popover` trigger button (default class `h-7 w-7 flex items-center justify-center rounded-md border border-input hover:bg-accent`)
  - On click of grid cell `(row, col)` calls `editor.chain().focus().insertTable({ rows: row, cols: col, withHeaderRow: false }).run()`
  - Each grid cell has `data-testid="grid-cell-{row}-{col}"` (1-indexed)
  - Label above grid shows `"${col} × ${row}"` when hovering, `"Insert Table"` otherwise

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/table-grid-picker.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <button data-testid="table-picker-trigger" className={className}>{children}</button>
  ),
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="table-picker-content">{children}</div>
  ),
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children, render: renderProp }: { children: React.ReactNode; render?: React.ReactElement }) =>
    renderProp ? React.cloneElement(renderProp, {}, children) : <>{children}</>,
  TooltipContent: () => null,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('lucide-react', () => ({
  Table: (props: Record<string, unknown>) =>
    React.createElement('svg', { 'data-testid': 'icon-Table', ...props }),
}))

import { TableGridPicker } from '@/components/TableGridPicker'

function makeEditor(insertTableMock = vi.fn(() => ({ run: vi.fn() }))) {
  return {
    chain: vi.fn(() => ({ focus: vi.fn(() => ({ insertTable: insertTableMock })) })),
  } as unknown as import('@tiptap/react').Editor
}

describe('TableGridPicker', () => {
  it('renders 64 grid cells (8×8)', () => {
    render(<TableGridPicker editor={makeEditor()} />)
    for (let row = 1; row <= 8; row++) {
      for (let col = 1; col <= 8; col++) {
        expect(screen.getByTestId(`grid-cell-${row}-${col}`)).toBeInTheDocument()
      }
    }
  })

  it('shows "Insert Table" label by default', () => {
    render(<TableGridPicker editor={makeEditor()} />)
    expect(screen.getByText('Insert Table')).toBeInTheDocument()
  })

  it('shows size label on hover as "cols × rows"', () => {
    render(<TableGridPicker editor={makeEditor()} />)
    fireEvent.mouseEnter(screen.getByTestId('grid-cell-3-4'))
    expect(screen.getByText('4 × 3')).toBeInTheDocument()
  })

  it('resets label on mouse leave', () => {
    render(<TableGridPicker editor={makeEditor()} />)
    const grid = screen.getByTestId('grid-cell-2-2').parentElement!
    fireEvent.mouseEnter(screen.getByTestId('grid-cell-2-2'))
    fireEvent.mouseLeave(grid)
    expect(screen.getByText('Insert Table')).toBeInTheDocument()
  })

  it('calls insertTable with correct rows and cols on click', () => {
    const mockRun = vi.fn()
    const mockInsertTable = vi.fn(() => ({ run: mockRun }))
    render(<TableGridPicker editor={makeEditor(mockInsertTable)} />)
    fireEvent.click(screen.getByTestId('grid-cell-2-3'))
    expect(mockInsertTable).toHaveBeenCalledWith({ rows: 2, cols: 3, withHeaderRow: false })
    expect(mockRun).toHaveBeenCalled()
  })

  it('highlights cells up to hovered position', () => {
    render(<TableGridPicker editor={makeEditor()} />)
    fireEvent.mouseEnter(screen.getByTestId('grid-cell-2-3'))
    // cell (1,1) should be highlighted
    const cell11 = screen.getByTestId('grid-cell-1-1')
    expect(cell11.className).toContain('bg-primary')
    // cell (3,4) should NOT be highlighted
    const cell34 = screen.getByTestId('grid-cell-3-4')
    expect(cell34.className).not.toContain('bg-primary')
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- table-grid-picker
```

Expected: FAIL — `Cannot find module '@/components/TableGridPicker'`

- [ ] **Step 3: Implement `TableGridPicker`**

Create `src/components/TableGridPicker.tsx`:

```tsx
"use client"
import React, { useState } from "react"
import { Editor } from "@tiptap/react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Table } from "lucide-react"

const ROWS = 8
const COLS = 8

interface TableGridPickerProps {
  editor: Editor
  triggerClassName?: string
}

export function TableGridPicker({ editor, triggerClassName }: TableGridPickerProps) {
  const [hovered, setHovered] = useState<{ row: number; col: number } | null>(null)
  const [open, setOpen] = useState(false)

  const label = hovered ? `${hovered.col} \u00d7 ${hovered.row}` : "Insert Table"

  function handleInsert(row: number, col: number) {
    editor.chain().focus().insertTable({ rows: row, cols: col, withHeaderRow: false }).run()
    setOpen(false)
    setHovered(null)
  }

  const triggerCls = triggerClassName ??
    "h-7 w-7 flex items-center justify-center rounded-md border border-input hover:bg-accent"

  return (
    <TooltipProvider>
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger render={<PopoverTrigger className={triggerCls} />}>
            <Table className="h-4 w-4" />
          </TooltipTrigger>
          <TooltipContent>Insert table</TooltipContent>
        </Tooltip>
        <PopoverContent className="w-auto p-3" align="start">
          <div className="text-sm font-medium mb-2 select-none">{label}</div>
          <div
            className="grid gap-0.5"
            style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
            onMouseLeave={() => setHovered(null)}
          >
            {Array.from({ length: ROWS }, (_, rowIdx) =>
              Array.from({ length: COLS }, (_, colIdx) => {
                const row = rowIdx + 1
                const col = colIdx + 1
                const highlighted = hovered !== null && row <= hovered.row && col <= hovered.col
                return (
                  <button
                    key={`${row}-${col}`}
                    data-testid={`grid-cell-${row}-${col}`}
                    className={`h-6 w-6 border rounded-sm transition-colors ${
                      highlighted
                        ? "bg-primary border-primary"
                        : "bg-background border-input hover:border-primary"
                    }`}
                    onMouseEnter={() => setHovered({ row, col })}
                    onClick={() => handleInsert(row, col)}
                  />
                )
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- table-grid-picker
```

Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/TableGridPicker.tsx src/__tests__/table-grid-picker.test.tsx
git commit -m "feat: add TableGridPicker component"
```

---

### Task 4: `TableFloatingToolbar` component

**Files:**
- Create: `src/components/TableFloatingToolbar.tsx`
- Create: `src/__tests__/table-floating-toolbar.test.tsx`

**Interfaces:**
- Consumes: `editor: Editor`, `editorContainerRef: React.RefObject<HTMLElement | null>`
- Produces: `TableFloatingToolbar` renders `null` when not in table; renders `data-testid="table-floating-toolbar"` div when `editor.isActive("table")` returns true after a `transaction` event

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/table-floating-toolbar.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import React from 'react'

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children, render: r }: { children: React.ReactNode; render?: React.ReactElement }) =>
    r ? React.cloneElement(r, {}, children) : <>{children}</>,
  TooltipContent: () => null,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/ui/separator', () => ({
  Separator: ({ orientation }: { orientation?: string }) => (
    <hr data-testid="separator" data-orientation={orientation} />
  ),
}))

vi.mock('lucide-react', () => ({
  Trash2: () => React.createElement('svg', { 'data-testid': 'icon-Trash2' }),
}))

import { TableFloatingToolbar } from '@/components/TableFloatingToolbar'

type Handler = () => void

function makeEditor(inTable: boolean) {
  const handlers: Record<string, Handler> = {}
  const runMock = vi.fn()
  const cmd = () => ({ run: runMock })
  const editor = {
    isActive: vi.fn((t: string) => t === 'table' && inTable),
    on: vi.fn((event: string, h: Handler) => { handlers[event] = h }),
    off: vi.fn(),
    state: { selection: { from: 0 } },
    view: { domAtPos: vi.fn(() => ({ node: document.createElement('td') })) },
    chain: vi.fn(() => ({
      focus: vi.fn(() => ({
        addRowBefore: vi.fn(cmd),
        addRowAfter: vi.fn(cmd),
        deleteRow: vi.fn(cmd),
        addColumnBefore: vi.fn(cmd),
        addColumnAfter: vi.fn(cmd),
        deleteColumn: vi.fn(cmd),
        toggleHeaderRow: vi.fn(cmd),
        deleteTable: vi.fn(cmd),
      })),
    })),
    _fire: (event: string) => handlers[event]?.(),
  }
  return editor as unknown as import('@tiptap/react').Editor & { _fire: (e: string) => void }
}

describe('TableFloatingToolbar', () => {
  it('does not render when not in table', () => {
    const editor = makeEditor(false)
    const ref = { current: document.createElement('div') }
    render(<TableFloatingToolbar editor={editor} editorContainerRef={ref} />)
    expect(screen.queryByTestId('table-floating-toolbar')).toBeNull()
  })

  it('renders after transaction event when in table', async () => {
    const editor = makeEditor(true)
    const ref = { current: document.createElement('div') }
    render(<TableFloatingToolbar editor={editor} editorContainerRef={ref} />)
    await act(async () => { editor._fire('transaction') })
    expect(screen.getByTestId('table-floating-toolbar')).toBeInTheDocument()
  })

  it('hides after transaction event when not in table', async () => {
    const editor = makeEditor(true)
    const ref = { current: document.createElement('div') }
    render(<TableFloatingToolbar editor={editor} editorContainerRef={ref} />)
    await act(async () => { editor._fire('transaction') })
    expect(screen.getByTestId('table-floating-toolbar')).toBeInTheDocument()
    // now pretend we left the table
    ;(editor.isActive as ReturnType<typeof vi.fn>).mockReturnValue(false)
    await act(async () => { editor._fire('transaction') })
    expect(screen.queryByTestId('table-floating-toolbar')).toBeNull()
  })

  it('calls addRowBefore when Add Row Above button is clicked', async () => {
    const editor = makeEditor(true)
    const ref = { current: document.createElement('div') }
    render(<TableFloatingToolbar editor={editor} editorContainerRef={ref} />)
    await act(async () => { editor._fire('transaction') })
    const btn = screen.getByTitle('Add row above')
    btn.click()
    const focusMock = (editor.chain as ReturnType<typeof vi.fn>)().focus()
    expect(focusMock.addRowBefore).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- table-floating-toolbar
```

Expected: FAIL — `Cannot find module '@/components/TableFloatingToolbar'`

- [ ] **Step 3: Implement `TableFloatingToolbar`**

Create `src/components/TableFloatingToolbar.tsx`:

```tsx
"use client"
import React, { useEffect, useState } from "react"
import { Editor } from "@tiptap/react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { Trash2 } from "lucide-react"

interface Props {
  editor: Editor
  editorContainerRef: React.RefObject<HTMLElement | null>
}

interface Position { top: number; left: number }

function ToolbarButton({
  title,
  onClick,
  destructive,
  children,
}: {
  title: string
  onClick: () => void
  destructive?: boolean
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            title={title}
            className={`h-6 w-6 flex items-center justify-center rounded hover:bg-accent text-xs font-medium ${destructive ? "text-destructive" : ""}`}
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  )
}

export function TableFloatingToolbar({ editor, editorContainerRef }: Props) {
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 })

  useEffect(() => {
    const update = () => {
      const inTable = editor.isActive("table")
      setVisible(inTable)
      if (inTable && editorContainerRef.current) {
        try {
          const { from } = editor.state.selection
          const rawNode = editor.view.domAtPos(from).node
          const el = rawNode instanceof Element ? rawNode : rawNode.parentElement
          const tableEl = el?.closest("table")
          if (tableEl) {
            const tableRect = tableEl.getBoundingClientRect()
            const containerEl = editorContainerRef.current
            const containerRect = containerEl.getBoundingClientRect()
            setPosition({
              top: Math.max(0, tableRect.top - containerRect.top + containerEl.scrollTop - 40),
              left: tableRect.left - containerRect.left + containerEl.scrollLeft,
            })
          }
        } catch {
          // positioning error — keep last known position
        }
      }
    }

    editor.on("transaction", update)
    return () => { editor.off("transaction", update) }
  }, [editor, editorContainerRef])

  if (!visible) return null

  const cmd = (fn: () => boolean) => () => fn()

  return (
    <TooltipProvider>
      <div
        data-testid="table-floating-toolbar"
        className="absolute z-10 flex items-center gap-0.5 px-1.5 py-1 border rounded-lg bg-card shadow-md"
        style={{ top: position.top, left: position.left }}
      >
        <ToolbarButton title="Add row above" onClick={cmd(() => editor.chain().focus().addRowBefore().run())}>↑R</ToolbarButton>
        <ToolbarButton title="Add row below" onClick={cmd(() => editor.chain().focus().addRowAfter().run())}>↓R</ToolbarButton>
        <ToolbarButton title="Delete row" destructive onClick={cmd(() => editor.chain().focus().deleteRow().run())}>−R</ToolbarButton>
        <Separator orientation="vertical" className="mx-0.5 h-4" />
        <ToolbarButton title="Add column left" onClick={cmd(() => editor.chain().focus().addColumnBefore().run())}>←C</ToolbarButton>
        <ToolbarButton title="Add column right" onClick={cmd(() => editor.chain().focus().addColumnAfter().run())}>→C</ToolbarButton>
        <ToolbarButton title="Delete column" destructive onClick={cmd(() => editor.chain().focus().deleteColumn().run())}>−C</ToolbarButton>
        <Separator orientation="vertical" className="mx-0.5 h-4" />
        <ToolbarButton title="Toggle header row" onClick={cmd(() => editor.chain().focus().toggleHeaderRow().run())}>H</ToolbarButton>
        <ToolbarButton title="Delete table" destructive onClick={cmd(() => editor.chain().focus().deleteTable().run())}>
          <Trash2 className="h-3 w-3" />
        </ToolbarButton>
      </div>
    </TooltipProvider>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- table-floating-toolbar
```

Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/TableFloatingToolbar.tsx src/__tests__/table-floating-toolbar.test.tsx
git commit -m "feat: add TableFloatingToolbar component"
```

---

### Task 5: `TableContextMenu` component

**Files:**
- Create: `src/components/TableContextMenu.tsx`
- Create: `src/__tests__/table-context-menu.test.tsx`

**Interfaces:**
- Consumes: `editor: Editor`, `editorContainerRef: React.RefObject<HTMLElement | null>`
- Produces: Intercepts `contextmenu` events on the container when `editor.isActive("table")` is true; renders `data-testid="table-context-menu"` at click position; dismisses on outside click or Escape

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/table-context-menu.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

import { TableContextMenu } from '@/components/TableContextMenu'

function makeEditor(inTable: boolean) {
  const runMock = vi.fn()
  const cmd = () => ({ run: runMock })
  return {
    isActive: vi.fn(() => inTable),
    chain: vi.fn(() => ({
      focus: vi.fn(() => ({
        addRowBefore: vi.fn(cmd),
        addRowAfter: vi.fn(cmd),
        deleteRow: vi.fn(cmd),
        addColumnBefore: vi.fn(cmd),
        addColumnAfter: vi.fn(cmd),
        deleteColumn: vi.fn(cmd),
        toggleHeaderRow: vi.fn(cmd),
        deleteTable: vi.fn(cmd),
      })),
    })),
  } as unknown as import('@tiptap/react').Editor
}

describe('TableContextMenu', () => {
  let container: HTMLDivElement

  afterEach(() => {
    if (container?.parentNode) document.body.removeChild(container)
  })

  it('shows menu when contextmenu fired inside table', () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    const ref = { current: container }
    render(<TableContextMenu editor={makeEditor(true)} editorContainerRef={ref} />)

    const evt = new MouseEvent('contextmenu', { clientX: 100, clientY: 200, bubbles: true })
    const spy = vi.spyOn(evt, 'preventDefault')
    container.dispatchEvent(evt)

    expect(screen.getByTestId('table-context-menu')).toBeInTheDocument()
    expect(spy).toHaveBeenCalled()
  })

  it('does not show menu when contextmenu fired outside table', () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    const ref = { current: container }
    render(<TableContextMenu editor={makeEditor(false)} editorContainerRef={ref} />)

    const evt = new MouseEvent('contextmenu', { clientX: 100, clientY: 200, bubbles: true })
    const spy = vi.spyOn(evt, 'preventDefault')
    container.dispatchEvent(evt)

    expect(screen.queryByTestId('table-context-menu')).toBeNull()
    expect(spy).not.toHaveBeenCalled()
  })

  it('dismisses menu on outside click', () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    const ref = { current: container }
    render(<TableContextMenu editor={makeEditor(true)} editorContainerRef={ref} />)

    container.dispatchEvent(new MouseEvent('contextmenu', { clientX: 100, clientY: 200, bubbles: true }))
    expect(screen.getByTestId('table-context-menu')).toBeInTheDocument()

    fireEvent.click(document.body)
    expect(screen.queryByTestId('table-context-menu')).toBeNull()
  })

  it('dismisses menu on Escape key', () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    const ref = { current: container }
    render(<TableContextMenu editor={makeEditor(true)} editorContainerRef={ref} />)

    container.dispatchEvent(new MouseEvent('contextmenu', { clientX: 100, clientY: 200, bubbles: true }))
    expect(screen.getByTestId('table-context-menu')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByTestId('table-context-menu')).toBeNull()
  })

  it('calls deleteRow when Delete Row is clicked', () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    const editor = makeEditor(true)
    const ref = { current: container }
    render(<TableContextMenu editor={editor} editorContainerRef={ref} />)

    container.dispatchEvent(new MouseEvent('contextmenu', { clientX: 100, clientY: 200, bubbles: true }))
    fireEvent.click(screen.getByText('Delete Row'))

    const focusMock = (editor.chain as ReturnType<typeof vi.fn>)().focus()
    expect(focusMock.deleteRow).toHaveBeenCalled()
    expect(screen.queryByTestId('table-context-menu')).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- table-context-menu
```

Expected: FAIL — `Cannot find module '@/components/TableContextMenu'`

- [ ] **Step 3: Implement `TableContextMenu`**

Create `src/components/TableContextMenu.tsx`:

```tsx
"use client"
import React, { useEffect, useState } from "react"
import { Editor } from "@tiptap/react"

interface Props {
  editor: Editor
  editorContainerRef: React.RefObject<HTMLElement | null>
}

interface MenuPosition { x: number; y: number }

interface Action {
  label: string
  onClick: () => void
  destructive?: boolean
}

type MenuItem = Action | null

export function TableContextMenu({ editor, editorContainerRef }: Props) {
  const [position, setPosition] = useState<MenuPosition | null>(null)

  useEffect(() => {
    const el = editorContainerRef.current
    if (!el) return

    const onContextMenu = (e: MouseEvent) => {
      if (!editor.isActive("table")) return
      e.preventDefault()
      setPosition({ x: e.clientX, y: e.clientY })
    }

    const onDismiss = () => setPosition(null)

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPosition(null)
    }

    el.addEventListener("contextmenu", onContextMenu)
    document.addEventListener("click", onDismiss)
    document.addEventListener("keydown", onKey)
    return () => {
      el.removeEventListener("contextmenu", onContextMenu)
      document.removeEventListener("click", onDismiss)
      document.removeEventListener("keydown", onKey)
    }
  }, [editor, editorContainerRef])

  if (!position) return null

  const items: MenuItem[] = [
    { label: "Add Row Above", onClick: () => editor.chain().focus().addRowBefore().run() },
    { label: "Add Row Below", onClick: () => editor.chain().focus().addRowAfter().run() },
    { label: "Delete Row", onClick: () => editor.chain().focus().deleteRow().run(), destructive: true },
    null,
    { label: "Add Column Left", onClick: () => editor.chain().focus().addColumnBefore().run() },
    { label: "Add Column Right", onClick: () => editor.chain().focus().addColumnAfter().run() },
    { label: "Delete Column", onClick: () => editor.chain().focus().deleteColumn().run(), destructive: true },
    null,
    { label: "Toggle Header Row", onClick: () => editor.chain().focus().toggleHeaderRow().run() },
    { label: "Delete Table", onClick: () => editor.chain().focus().deleteTable().run(), destructive: true },
  ]

  return (
    <div
      data-testid="table-context-menu"
      className="fixed z-50 min-w-[180px] border rounded-lg bg-popover text-popover-foreground shadow-lg py-1"
      style={{ top: position.y, left: position.x }}
    >
      {items.map((item, i) =>
        item === null ? (
          <div key={i} className="my-1 border-t border-border" />
        ) : (
          <button
            key={item.label}
            className={`w-full text-left px-3 py-1.5 text-sm hover:bg-accent ${item.destructive ? "text-destructive" : ""}`}
            onClick={() => { item.onClick(); setPosition(null) }}
          >
            {item.label}
          </button>
        )
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- table-context-menu
```

Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/TableContextMenu.tsx src/__tests__/table-context-menu.test.tsx
git commit -m "feat: add TableContextMenu component"
```

---

### Task 6: Wire components into `MainArea`

**Files:**
- Modify: `src/components/MainArea.tsx`
- Modify: `src/__tests__/main-area.test.tsx`

**Interfaces:**
- Consumes: `TableGridPicker({ editor, triggerClassName? })`, `TableFloatingToolbar({ editor, editorContainerRef })`, `TableContextMenu({ editor, editorContainerRef })`
- Produces: Desktop toolbar has a Table button after the Image button; mobile toolbar has a Table button in the main row; floating toolbar and context menu mounted in the editor scroll container (which now has `position: relative`)

- [ ] **Step 1: Update the mock in `main-area.test.tsx`**

In `src/__tests__/main-area.test.tsx`, find the mock of `lucide-react`. Add `Table` to the list:

```tsx
  Table: (props: Record<string, unknown>) => React.createElement('svg', { 'data-testid': 'icon-Table', ...props }),
```

Also in the `chain` mock inside `vi.mock('@tiptap/react', ...)`, add these to the `focus()` return object so they exist for any future assertions:

```typescript
        insertTable: vi.fn(() => ({ run: vi.fn() })),
        addRowBefore: vi.fn(() => ({ run: vi.fn() })),
        addRowAfter: vi.fn(() => ({ run: vi.fn() })),
        deleteRow: vi.fn(() => ({ run: vi.fn() })),
        addColumnBefore: vi.fn(() => ({ run: vi.fn() })),
        addColumnAfter: vi.fn(() => ({ run: vi.fn() })),
        deleteColumn: vi.fn(() => ({ run: vi.fn() })),
        toggleHeaderRow: vi.fn(() => ({ run: vi.fn() })),
        deleteTable: vi.fn(() => ({ run: vi.fn() })),
```

Also add mocks for the three new components so MainArea tests don't render them:

```typescript
vi.mock('@/components/TableGridPicker', () => ({
  TableGridPicker: () => React.createElement('div', { 'data-testid': 'table-grid-picker' }),
}))
vi.mock('@/components/TableFloatingToolbar', () => ({
  TableFloatingToolbar: () => null,
}))
vi.mock('@/components/TableContextMenu', () => ({
  TableContextMenu: () => null,
}))
```

- [ ] **Step 2: Run existing MainArea tests to confirm mock changes compile**

```bash
npm test -- main-area
```

Expected: all existing MainArea tests PASS (mock changes are additive).

- [ ] **Step 3: Add imports to `MainArea.tsx`**

After the existing import for `ImageNode`, add:

```typescript
import { TableGridPicker } from "@/components/TableGridPicker"
import { TableFloatingToolbar } from "@/components/TableFloatingToolbar"
import { TableContextMenu } from "@/components/TableContextMenu"
```

- [ ] **Step 4: Add `Table` to the lucide-react import in `MainArea.tsx`**

Find the line:

```typescript
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  ListChecks,
  Image,
} from "lucide-react"
```

Change it to:

```typescript
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  ListChecks,
  Image,
  Table as TableIcon,
} from "lucide-react"
```

(The `Table` import from lucide-react would conflict with the Tiptap `Table` extension import, so alias it as `TableIcon`.)

- [ ] **Step 5: Add `editorContainerRef` to `MainArea` and update return JSX**

In `MainArea` function body, after the existing `fileInputRef` declaration, add:

```typescript
  const editorContainerRef = useRef<HTMLDivElement | null>(null)
```

Find the return JSX block containing:

```tsx
      <div className="flex-1 overflow-auto px-4 sm:px-6 md:px-8 lg:px-10 w-full md:max-w-[900px] lg:max-w-[1140px] py-4 pb-16 md:pb-4">
        <NoteEditor note={activeNote} editor={editor} />
      </div>
```

Replace it with:

```tsx
      <div
        ref={editorContainerRef}
        className="flex-1 overflow-auto relative px-4 sm:px-6 md:px-8 lg:px-10 w-full md:max-w-[900px] lg:max-w-[1140px] py-4 pb-16 md:pb-4"
      >
        <NoteEditor note={activeNote} editor={editor} />
        {editor && (
          <>
            <TableFloatingToolbar editor={editor} editorContainerRef={editorContainerRef} />
            <TableContextMenu editor={editor} editorContainerRef={editorContainerRef} />
          </>
        )}
      </div>
```

- [ ] **Step 6: Add Table button to `DesktopToolbar`**

In `DesktopToolbar`, find the image `<input ref={fileInputRef} ...` line at the end of the toolbar content. Just before the closing `</div>` of the toolbar (after the image file input), add:

```tsx
        <Separator orientation="vertical" className="mx-1 h-6" />

        <TableGridPicker editor={editor} />
```

- [ ] **Step 7: Add Table button to `MobileToolbar`**

In `MobileToolbar`, find the image button block:

```tsx
      <button
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
      >
        <Image className="h-5 w-5" />
      </button>
```

After it, add:

```tsx
      <TableGridPicker
        editor={editor}
        triggerClassName="flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
      />
```

- [ ] **Step 8: Run all tests**

```bash
npm test
```

Expected: all tests pass (new components are mocked in main-area.test.tsx, individual component tests pass).

- [ ] **Step 9: Commit**

```bash
git add src/components/MainArea.tsx src/__tests__/main-area.test.tsx
git commit -m "feat: wire TableGridPicker, TableFloatingToolbar, and TableContextMenu into MainArea"
```

---

### Task 7: GFM markdown table export

**Files:**
- Modify: `src/lib/export.ts`
- Modify: `src/__tests__/export.test.ts`

**Interfaces:**
- Consumes: `turndown-plugin-gfm` `tables` plugin
- Produces: `convertHtmlToMarkdown("<table>...")` returns a GFM pipe table string instead of raw HTML

- [ ] **Step 1: Write the failing test**

In `src/__tests__/export.test.ts`, find the `describe('export', ...)` block and the `beforeEach` that sets up `mockTurndownConstructor`. Update the mock constructor to return an object that includes `use`:

Locate the `beforeEach` that has:
```typescript
    mockTurndownConstructor.mockImplementation(function() {
      return { turndown: mockTurndown }
    })
```

Change it to:
```typescript
    mockTurndownConstructor.mockImplementation(function() {
      return { turndown: mockTurndown, use: vi.fn() }
    })
```

Then add this import at the top of `export.test.ts` (after the existing vi.hoisted call), also hoisted:

```typescript
const { mockTables } = vi.hoisted(() => {
  const mockTables = vi.fn()
  return { mockTables }
})

vi.mock('turndown-plugin-gfm', () => ({
  tables: mockTables,
}))
```

Then add a new test inside `describe('export', ...)`:

```typescript
  describe('convertHtmlToMarkdown', () => {
    it('registers the turndown-plugin-gfm tables plugin at module load', async () => {
      const { convertHtmlToMarkdown } = await import('@/lib/export')
      const instance = mockTurndownConstructor.mock.results[0]?.value
      expect(instance.use).toHaveBeenCalledWith(mockTables)
    })

    it('delegates conversion to turndown', async () => {
      mockTurndown.mockReturnValueOnce('| col1 | col2 |\n|------|------|\n| a    | b    |')
      const { convertHtmlToMarkdown } = await import('@/lib/export')
      const result = convertHtmlToMarkdown('<table><tr><td>a</td><td>b</td></tr></table>')
      expect(result).toContain('|')
      expect(mockTurndown).toHaveBeenCalled()
    })
  })
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- export
```

Expected: `registers the turndown-plugin-gfm tables plugin` FAIL (plugin not yet registered)

- [ ] **Step 3: Update `export.ts` to use the plugin**

Open `src/lib/export.ts`. After the existing `import TurndownService from "turndown"` line, add:

```typescript
import { tables } from "turndown-plugin-gfm"
```

Then find the line:

```typescript
const turndown = new TurndownService({
```

After the closing `})` of the TurndownService constructor, add:

```typescript
turndown.use(tables)
```

The section becomes:

```typescript
import TurndownService from "turndown"
import { tables } from "turndown-plugin-gfm"
// ...

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
})
turndown.use(tables)
```

- [ ] **Step 4: Run tests**

```bash
npm test -- export
```

Expected: all export tests PASS including the new ones

- [ ] **Step 5: Commit**

```bash
git add src/lib/export.ts src/__tests__/export.test.ts
git commit -m "feat: register turndown-plugin-gfm tables for markdown export"
```

---

### Task 8: OneNote table normalization

**Files:**
- Modify: `src/lib/onenote/import.ts`
- Modify: `src/__tests__/onenote-import.test.ts`

**Interfaces:**
- Produces: `normalizeOneNoteTables(html: string): string` — exported function
  - Removes `<colgroup>` and `<col>` elements
  - Strips `border`, `cellpadding`, `cellspacing`, `width`, `height` HTML attributes from `<table>` tags
  - Strips `border`, `width`, `height`, `bgcolor`, `align`, `valign`, `scope` HTML attributes from `<td>` and `<th>` tags
  - Preserves `rowspan`, `colspan`, `style`, `class` attributes unchanged

- [ ] **Step 1: Write the failing tests**

In `src/__tests__/onenote-import.test.ts`, add to the existing import line:

```typescript
import { detectOneNoteFormat, extractPageTitle, replaceLocalImageRefs, extractBodyContent, parsePageOrderFromToc, stripFontStyles, normalizeOneNoteTables } from "@/lib/onenote/import"
```

Then add a new describe block at the bottom of the file:

```typescript
describe('normalizeOneNoteTables', () => {
  it('removes colgroup and col elements', () => {
    const html = '<table><colgroup><col width="100"><col width="200"></colgroup><tr><td>a</td></tr></table>'
    const result = normalizeOneNoteTables(html)
    expect(result).not.toContain('<colgroup>')
    expect(result).not.toContain('<col')
    expect(result).toContain('<td>a</td>')
  })

  it('strips border, cellpadding, cellspacing, width, height from table tag', () => {
    const html = '<table border="1" cellpadding="5" cellspacing="0" width="100%" height="200"><tr><td>x</td></tr></table>'
    const result = normalizeOneNoteTables(html)
    expect(result).not.toMatch(/\bborder=/)
    expect(result).not.toMatch(/\bcellpadding=/)
    expect(result).not.toMatch(/\bcellspacing=/)
    expect(result).not.toMatch(/\bwidth=/)
    expect(result).not.toMatch(/\bheight=/)
    expect(result).toContain('<table')
    expect(result).toContain('<td>x</td>')
  })

  it('strips visual attributes from td and th tags', () => {
    const html = '<table><tr><td width="50" bgcolor="#fff" align="center" valign="top">cell</td><th scope="col" border="1">head</th></tr></table>'
    const result = normalizeOneNoteTables(html)
    expect(result).not.toMatch(/\bwidth=/)
    expect(result).not.toMatch(/\bbgcolor=/)
    expect(result).not.toMatch(/\balign=/)
    expect(result).not.toMatch(/\bvalign=/)
    expect(result).not.toMatch(/\bscope=/)
    expect(result).toContain('cell')
    expect(result).toContain('head')
  })

  it('preserves rowspan and colspan', () => {
    const html = '<table><tr><td rowspan="2" colspan="3">merged</td></tr></table>'
    const result = normalizeOneNoteTables(html)
    expect(result).toContain('rowspan="2"')
    expect(result).toContain('colspan="3"')
  })

  it('preserves style and class attributes', () => {
    const html = '<table class="my-table" style="margin: 0"><tr><td style="color:red" class="cell">x</td></tr></table>'
    const result = normalizeOneNoteTables(html)
    expect(result).toContain('class="my-table"')
    expect(result).toContain('style="margin: 0"')
    expect(result).toContain('style="color:red"')
  })

  it('passes through html with no tables unchanged', () => {
    const html = '<p>Hello <strong>world</strong></p>'
    expect(normalizeOneNoteTables(html)).toBe(html)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- onenote-import
```

Expected: new `normalizeOneNoteTables` tests FAIL — function not exported

- [ ] **Step 3: Implement `normalizeOneNoteTables` in `onenote/import.ts`**

Open `src/lib/onenote/import.ts`. After the `stripFontStyles` function, add:

```typescript
function stripHtmlAttributes(tag: string, attrs: string[]): string {
  let result = tag
  for (const attr of attrs) {
    result = result.replace(new RegExp(`\\s${attr}(?:="[^"]*"|='[^']*'|=[^\\s>/]*)`, "gi"), "")
  }
  return result
}

export function normalizeOneNoteTables(html: string): string {
  let result = html
  // Remove colgroup and col elements (Tiptap does not use them)
  result = result.replace(/<colgroup[^>]*>[\s\S]*?<\/colgroup>/gi, "")
  result = result.replace(/<col\b[^>]*\/?>/gi, "")
  // Strip visual HTML attributes from <table>
  result = result.replace(/<table[^>]*>/gi, (tag) =>
    stripHtmlAttributes(tag, ["border", "cellpadding", "cellspacing", "width", "height"])
  )
  // Strip visual HTML attributes from <td> and <th>
  result = result.replace(/<(?:td|th)[^>]*>/gi, (tag) =>
    stripHtmlAttributes(tag, ["border", "width", "height", "bgcolor", "align", "valign", "scope"])
  )
  return result
}
```

- [ ] **Step 4: Call `normalizeOneNoteTables` in the per-page pipeline**

In the same file, find the per-page processing block where `extractBodyContent` and `stripFontStyles` are called. It looks like:

```typescript
        html = extractBodyContent(html)
        html = stripFontStyles(html)
```

Add the normalization call after `stripFontStyles`:

```typescript
        html = extractBodyContent(html)
        html = stripFontStyles(html)
        html = normalizeOneNoteTables(html)
```

- [ ] **Step 5: Run all onenote-import tests**

```bash
npm test -- onenote-import
```

Expected: all tests PASS including the 6 new `normalizeOneNoteTables` tests

- [ ] **Step 6: Run the full test suite**

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 7: Commit**

```bash
git add src/lib/onenote/import.ts src/__tests__/onenote-import.test.ts
git commit -m "feat: normalize OneNote table HTML for Tiptap compatibility"
```

---

## Final Verification

- [ ] Run `npm test` — all tests pass
- [ ] Run `npm run build` — no TypeScript errors
- [ ] Run `npm run lint` — no lint errors
- [ ] Start dev server (`npm run dev`) and manually verify:
  1. Click the Table icon in the toolbar — grid picker appears
  2. Hover over cells — size label updates
  3. Click a cell — table inserts with correct dimensions
  4. Click inside table — floating toolbar appears above the table
  5. Add a row, add a column, delete a row, toggle header row
  6. Right-click inside table — context menu appears with all actions
  7. Right-click outside table — browser default context menu appears
  8. Export a note with a table to ZIP — re-import it, table is preserved
  9. Markdown export of a note with a table produces a GFM pipe table
