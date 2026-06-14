# MUI to shadcn/ui Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace MUI with shadcn/ui, migrate Pages Router to App Router, and switch to Tailwind CSS 4.

**Architecture:** Rewrite all UI components using shadcn components with Tailwind CSS. Migrate `pages/` to `app/` directory. Replace MUI theme + `ThemeContext` with `next-themes` + CSS variables. Keep business logic (`NoteContext`, API routes) intact, converting API routes from Pages Router handlers to App Router Route Handlers.

**Tech Stack:** Next.js 16 App Router, shadcn/ui, Tailwind CSS 4, lucide-react, next-themes, TipTap 3

---

## Files to Create

| File | Purpose |
|------|---------|
| `postcss.config.js` | PostCSS config for Tailwind CSS 4 |
| `components.json` | shadcn/ui configuration |
| `lib/utils.ts` | `cn()` utility for Tailwind class merging |
| `app/layout.tsx` | Root layout with providers |
| `app/page.tsx` | Main page |
| `app/providers.tsx` | Client-side providers wrapper |
| `app/globals.css` | Tailwind CSS imports + shadcn CSS variables |
| `app/api/notes/route.ts` | GET (list) and POST (create) notes |
| `app/api/notes/[id]/route.ts` | PUT (update) and DELETE note |
| `app/api/folders/route.ts` | GET (list) and POST (create) folders |
| `app/api/folders/[id]/route.ts` | PUT (rename) and DELETE folder |
| `components/ui/` (multiple) | shadcn component files (generated via CLI) |

## Files to Modify

| File | Change |
|------|--------|
| `package.json` | Remove MUI/Emotion deps, add Tailwind/shadcn/lucide/next-themes deps |
| `next.config.js` | Remove `reactStrictMode` (default in App Router) or keep as-is |
| `components/AppHeader.tsx` | Rewrite with lucide icons + next-themes |
| `components/NotesSidebar.tsx` | Rewrite with Sheet + Command + Collapsible |
| `components/MainArea.tsx` | Rewrite toolbar with shadcn ToggleGroup + Select |
| `components/NoteEditor.tsx` | Remove `Box` from MUI, use `<div>` instead |
| `components/DeleteConfirmDialog.tsx` | Rewrite with shadcn Dialog |
| `components/DeleteFolderDialog.tsx` | Rewrite with shadcn Dialog |
| `types/index.ts` | Keep as-is (no MUI deps) |
| `lib/mongodb.ts` | Keep as-is |
| `contexts/NoteContext.tsx` | Keep as-is (API route URLs stay `/api/...`) |

## Files to Delete

`src/pages/_app.tsx`, `src/pages/_document.tsx`, `src/pages/index.tsx`, `src/pages/api/notes.ts`, `src/pages/api/notes/[id].ts`, `src/pages/api/folders.ts`, `src/pages/api/folders/[id].ts`, `src/styles/globals.css`, `src/contexts/ThemeContext.tsx`

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install new dependencies**

```bash
npm install tailwindcss @tailwindcss/postcss postcss lucide-react next-themes class-variance-authority clsx tailwind-merge
```

- [ ] **Step 2: Remove MUI dependencies**

```bash
npm uninstall @mui/material @mui/icons-material @emotion/react @emotion/styled
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: swap MUI/Emotion deps for Tailwind/shadcn/lucide/next-themes"
```

---

### Task 2: Configure Tailwind CSS 4

**Files:**
- Create: `postcss.config.js`
- Create: `app/globals.css`

- [ ] **Step 1: Create postcss.config.js**

`postcss.config.js`:
```js
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
}
```

- [ ] **Step 2: Create app/globals.css**

`src/app/globals.css`:
```css
@import "tailwindcss";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
}

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}

.ProseMirror {
  outline: none;
  min-height: 200px;
  line-height: 1.5;
  font-size: 15px;
  max-width: 1140px;
  color: inherit;
}
.ProseMirror p { margin: 0 0 0.5rem 0; }
.ProseMirror ul, .ProseMirror ol { padding-left: 1.5rem; }
.ProseMirror li { margin: 0 0 0.15rem 0; }
.ProseMirror h1 { font-size: 1.4rem; font-weight: 600; margin: 0 0 0.3rem 0; }
.ProseMirror h2 { font-size: 1.2rem; font-weight: 600; margin: 0 0 0.3rem 0; }
.ProseMirror h3 { font-size: 1.05rem; font-weight: 600; margin: 0 0 0.3rem 0; }
```

- [ ] **Step 3: Verify Tailwind works**

Run: `npm run dev`
Check that the terminal starts without PostCSS/Tailwind errors.

- [ ] **Step 4: Commit**

```bash
git add postcss.config.js src/app/globals.css
git commit -m "feat: configure Tailwind CSS 4 with PostCSS"
```

---

### Task 3: Create cn() Utility

**Files:**
- Create: `lib/utils.ts`

- [ ] **Step 1: Create lib/utils.ts**

`src/lib/utils.ts`:
```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/utils.ts
git commit -m "feat: add cn utility for Tailwind class merging"
```

---

### Task 4: Set Up App Router Layout + Providers

**Files:**
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/providers.tsx`

- [ ] **Step 1: Create app/providers.tsx**

`src/app/providers.tsx`:
```tsx
"use client"

import { ThemeProvider } from "next-themes"
import { NoteProvider } from "@/contexts/NoteContext"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <NoteProvider>
        {children}
      </NoteProvider>
    </ThemeProvider>
  )
}
```

- [ ] **Step 2: Create app/layout.tsx**

`src/app/layout.tsx`:
```tsx
import type { Metadata } from "next"
import "./globals.css"
import Providers from "./providers"

export const metadata: Metadata = {
  title: "Notes",
  description: "A simple notes application",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="dark light" />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Create app/page.tsx** (initial placeholder)

`src/app/page.tsx`:
```tsx
"use client"

export default function Home() {
  return (
    <div className="flex items-center justify-center min-h-svh">
      <p className="text-muted-foreground">Loading...</p>
    </div>
  )
}
```

- [ ] **Step 4: Remove ThemeContext.tsx**

Delete `src/contexts/ThemeContext.tsx`.

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx src/app/page.tsx src/app/providers.tsx
git rm src/contexts/ThemeContext.tsx
git commit -m "feat: set up App Router layout with next-themes"
```

---

### Task 5: Initialize shadcn/ui and Add Components

**Files:**
- Create: `components.json`
- Create: `components/ui/` (multiple files via CLI)

- [ ] **Step 1: Run shadcn init**

```bash
npx shadcn@latest init
```

Answer prompts:
- Style: `base-nova` (default)
- CSS variables: `yes` (default)
- Base color: `neutral` (default)
- CSS import path: `src/app/globals.css`
- Utils path: `src/lib/utils.ts`
- React Server Components: `yes`

- [ ] **Step 2: Add required shadcn components**

```bash
npx shadcn@latest add button dialog sheet input select toggle separator dropdown-menu badge collapsible command card switch tooltip
```

- [ ] **Step 3: Verify components.json was created**

Check `components.json` exists and references `src/app/globals.css` and `src/lib/utils.ts`.

- [ ] **Step 4: Commit**

```bash
git add components.json src/components/ui/
git commit -m "feat: initialize shadcn/ui and add required components"
```

---

### Task 6: Rewrite NoteEditor (Remove MUI Box)

**Files:**
- Modify: `components/NoteEditor.tsx`

- [ ] **Step 1: Rewrite NoteEditor.tsx**

`src/components/NoteEditor.tsx`:
```tsx
import React from "react"
import { Editor, EditorContent } from "@tiptap/react"
import { Note } from "@/types"

interface Props {
  note: Note
  editor: Editor | null
}

export default function NoteEditor({ note, editor }: Props) {
  if (!editor) return null

  return (
    <div className="flex-1">
      <EditorContent editor={editor} />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/NoteEditor.tsx
git commit -m "refactor: remove MUI Box from NoteEditor"
```

---

### Task 7: Rewrite DeleteConfirmDialog

**Files:**
- Modify: `components/DeleteConfirmDialog.tsx`

- [ ] **Step 1: Rewrite DeleteConfirmDialog.tsx**

`src/components/DeleteConfirmDialog.tsx`:
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
  onClose: () => void
  onConfirm: () => void
}

export default function DeleteConfirmDialog({ open, onClose, onConfirm }: Props) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Note</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this note? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/DeleteConfirmDialog.tsx
git commit -m "refactor: replace MUI Dialog with shadcn Dialog in DeleteConfirmDialog"
```

---

### Task 8: Rewrite DeleteFolderDialog

**Files:**
- Modify: `components/DeleteFolderDialog.tsx`

- [ ] **Step 1: Rewrite DeleteFolderDialog.tsx**

`src/components/DeleteFolderDialog.tsx`:
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
  folderName: string
  notesCount: number
  onClose: () => void
  onConfirm: () => void
}

export default function DeleteFolderDialog({
  open,
  folderName,
  notesCount,
  onClose,
  onConfirm,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete folder?</DialogTitle>
          <DialogDescription>
            This will permanently delete the folder <strong>&quot;{folderName}&quot;</strong>
            {notesCount > 0 && (
              <> and all <strong>{notesCount}</strong> notes inside it</>
            )}.
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/DeleteFolderDialog.tsx
git commit -m "refactor: replace MUI Dialog with shadcn Dialog in DeleteFolderDialog"
```

---

### Task 9: Rewrite AppHeader

**Files:**
- Modify: `components/AppHeader.tsx`

- [ ] **Step 1: Rewrite AppHeader.tsx**

`src/components/AppHeader.tsx`:
```tsx
"use client"

import React from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Pen, Moon, Sun, Menu } from "lucide-react"

interface AppHeaderProps {
  onToggleSidebar?: () => void
  showMenuButton?: boolean
}

export default function AppHeader({ onToggleSidebar, showMenuButton }: AppHeaderProps) {
  const { theme, setTheme } = useTheme()
  const isDark = theme === "dark"

  return (
    <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-10 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          {showMenuButton && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleSidebar}>
              <Menu className="h-4 w-4" />
            </Button>
          )}
          <Pen className="h-4 w-4" />
          <span className="text-sm font-semibold">Notes</span>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setTheme(isDark ? "light" : "dark")}
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isDark ? "Switch to light mode" : "Switch to dark mode"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AppHeader.tsx
git commit -m "refactor: replace MUI AppBar with shadcn-based header"
```

---

### Task 10: Rewrite NotesSidebar with Sheet + Command + Collapsible

**Files:**
- Modify: `components/NotesSidebar.tsx`

This is the largest component. The sidebar needs:
- Sheet container (slides in on mobile, permanent on desktop)
- Search input at top
- Action buttons (new note, new folder, expand/collapse all)
- Folder tree using Collapsible
- Note list using Command (cmdk)
- Context menu using DropdownMenu
- Drag-and-drop support (kept)

- [ ] **Step 1: Rewrite NotesSidebar.tsx**

`src/components/NotesSidebar.tsx`:
```tsx
"use client"

import React, { useState, DragEvent } from "react"
import { useNotes } from "@/contexts/NoteContext"
import DeleteConfirmDialog from "./DeleteConfirmDialog"
import DeleteFolderDialog from "./DeleteFolderDialog"
import { Folder, Note } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus,
  Folder as FolderIcon,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Search,
  ChevronsUpDown,
  ChevronsDownUp,
  Trash2,
  Pencil,
  GripVertical,
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function NotesSidebar() {
  const {
    notes, folders, expandedFolders, createNote, deleteNote, updateNote,
    activeNoteId, setActiveNoteId, createFolder, renameFolder,
    deleteFolder, moveNote, toggleFolder,
  } = useNotes()

  const [search, setSearch] = useState("")
  const [deleteNoteTarget, setDeleteNoteTarget] = useState<string | null>(null)
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<Folder | null>(null)
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null)

  // Inline rename
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")

  // Drag-and-drop
  const [dragActive, setDragActive] = useState(false)
  const [dropTarget, setDropTarget] = useState<{
    folderId: string | null
    noteIndex: number
  } | null>(null)

  const filtered = search
    ? notes.filter((n) => n.title.toLowerCase().includes(search.toLowerCase()))
    : notes

  const quickNotes = filtered.filter((n) => !n.folderId)

  const handleCreate = async () => {
    let targetFolderId = activeFolderId ?? undefined
    let position: number | undefined

    if (activeNoteId) {
      const selectedNote = notes.find((n) => n._id === activeNoteId)
      if (selectedNote) {
        targetFolderId = selectedNote.folderId
        const siblings = notes
          .filter((n) => n.folderId === selectedNote.folderId)
          .sort((a, b) => a.position - b.position)
        const idx = siblings.findIndex((n) => n._id === activeNoteId)
        const nextNote = siblings[idx + 1]
        position = nextNote
          ? (selectedNote.position + nextNote.position) / 2
          : selectedNote.position + 1000
      }
    }

    const note = await createNote({ title: "Untitled Note", folderId: targetFolderId, position })
    if (note) setActiveNoteId(note._id)
  }

  const handleCreateFolder = async () => {
    const folder = await createFolder("New Folder")
    if (folder) {
      setRenamingId(folder._id)
      setRenameValue(folder.name)
      toggleFolder(folder._id)
    }
  }

  const handleDeleteNote = async () => {
    if (!deleteNoteTarget) return
    await deleteNote(deleteNoteTarget)
    if (activeNoteId === deleteNoteTarget) setActiveNoteId(null)
    setDeleteNoteTarget(null)
  }

  const handleDeleteFolder = async () => {
    if (!deleteFolderTarget) return
    await deleteFolder(deleteFolderTarget._id)
    setDeleteFolderTarget(null)
  }

  const startRenaming = (id: string, currentName: string) => {
    setRenamingId(id)
    setRenameValue(currentName)
  }

  const finishRename = async (id: string) => {
    if (!renamingId || !renameValue.trim()) {
      cancelRename()
      return
    }
    if (folders.some((f) => f._id === id)) {
      await renameFolder(id, renameValue.trim())
    } else {
      await updateNote(id, { title: renameValue.trim() })
    }
    cancelRename()
  }

  const cancelRename = () => {
    setRenamingId(null)
    setRenameValue("")
  }

  // Drag and drop
  const handleDragStart = (e: DragEvent, noteId: string) => {
    e.dataTransfer.setData("text/plain", noteId)
    e.dataTransfer.effectAllowed = "move"
    setDragActive(true)
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = async (e: DragEvent, targetFolderId: string | null) => {
    e.preventDefault()
    const noteId = e.dataTransfer.getData("text/plain")
    if (noteId && dropTarget && dropTarget.folderId === targetFolderId) {
      const targetNotes = notes
        .filter((n) => targetFolderId === null ? !n.folderId : n.folderId === targetFolderId)
        .sort((a, b) => a.position - b.position)
      const { noteIndex } = dropTarget
      let position: number
      if (targetNotes.length === 0) {
        position = 0
      } else if (noteIndex <= 0) {
        position = targetNotes[0].position - 1000
      } else if (noteIndex >= targetNotes.length) {
        position = targetNotes[targetNotes.length - 1].position + 1000
      } else {
        position = (targetNotes[noteIndex - 1].position + targetNotes[noteIndex].position) / 2
      }
      await moveNote(noteId, targetFolderId, position)
    } else if (noteId) {
      await moveNote(noteId, targetFolderId)
    }
    setDropTarget(null)
    setDragActive(false)
  }

  const handleNoteDragOver = (e: DragEvent, noteIndex: number, parentFolderId: string | null) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const relativeY = e.clientY - rect.top
    const index = relativeY < rect.height / 2 ? noteIndex : noteIndex + 1
    setDropTarget({ folderId: parentFolderId, noteIndex: index })
  }

  const handleDragEnd = () => {
    setDropTarget(null)
    setDragActive(false)
  }

  const renderNoteItem = (note: Note, noteIndex: number, parentFolderId: string | null) => (
    <div
      key={note._id}
      draggable
      onDragStart={(e) => handleDragStart(e, note._id)}
      onDragEnd={handleDragEnd}
      className="relative"
    >
      {dropTarget?.folderId === parentFolderId && dropTarget.noteIndex === noteIndex && (
        <div className="absolute top-0 left-9 right-3 h-0.5 bg-primary rounded z-10" />
      )}
      <div
        className={cn(
          "flex items-center gap-1 rounded-lg px-2 py-1 cursor-pointer text-sm ml-7 mr-1",
          activeNoteId === note._id
            ? "bg-accent text-accent-foreground"
            : "hover:bg-accent/50"
        )}
        onClick={() => setActiveNoteId(note._id)}
        onContextMenu={(e) => e.preventDefault()}
        onDoubleClick={() => startRenaming(note._id, note.title)}
        onDragOver={(e) => handleNoteDragOver(e, noteIndex, parentFolderId)}
      >
        {renamingId === note._id ? (
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={() => finishRename(note._id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") finishRename(note._id)
              if (e.key === "Escape") cancelRename()
            }}
            autoFocus
            className="h-6 text-xs px-1"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <>
            <span className="flex-1 truncate text-sm">{note.title}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => startRenaming(note._id, note.title)}>
                  <Pencil className="h-3 w-3 mr-2" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setDeleteNoteTarget(note._id)}>
                  <Trash2 className="h-3 w-3 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </div>
  )

  const renderFolder = (folder: Folder) => {
    const folderNotes = filtered.filter((n) => n.folderId === folder._id)
    const isExpanded = expandedFolders.has(folder._id)

    return (
      <Collapsible
        key={folder._id}
        open={isExpanded}
        onOpenChange={() => { toggleFolder(folder._id); setActiveFolderId(folder._id) }}
      >
        <div
          onDragOver={(e) => { handleDragOver(e); setDropTarget((prev) => prev?.folderId === folder._id ? prev : null) }}
          onDrop={(e) => handleDrop(e, folder._id)}
        >
          <CollapsibleTrigger className="flex w-full items-center gap-1 rounded-lg px-2 py-1 hover:bg-accent/50">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <FolderIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            {renamingId === folder._id ? (
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => finishRename(folder._id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") finishRename(folder._id)
                  if (e.key === "Escape") cancelRename()
                }}
                autoFocus
                className="h-6 text-xs px-1"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="flex-1 truncate text-sm font-semibold">{folder.name}</span>
            )}
            <Badge variant="secondary" className="h-4 text-[10px] px-1">{folderNotes.length}</Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-5 w-5">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => startRenaming(folder._id, folder.name)}>
                  <Pencil className="h-3 w-3 mr-2" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setDeleteFolderTarget(folder)}>
                  <Trash2 className="h-3 w-3 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CollapsibleTrigger>
          <CollapsibleContent>
            {folderNotes.length === 0 && dragActive && (
              <div className="h-0 relative mx-3">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary rounded" />
              </div>
            )}
            {folderNotes.map((note, noteIndex) => renderNoteItem(note, noteIndex, folder._id))}
            {dropTarget?.folderId === folder._id && dropTarget.noteIndex === folderNotes.length && folderNotes.length > 0 && (
              <div className="h-0 relative">
                <div className="absolute top-0 left-9 right-3 h-0.5 bg-primary rounded z-10" />
              </div>
            )}
          </CollapsibleContent>
        </div>
      </Collapsible>
    )
  }

  return (
    <>
      <aside className="w-[280px] h-full flex flex-col border-r bg-background">
        {/* Header actions */}
        <div className="flex items-center justify-end gap-0.5 px-2 py-1 border-b">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => folders.forEach((f) => { if (!expandedFolders.has(f._id)) toggleFolder(f._id) })}
          >
            <ChevronsDownUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => folders.forEach((f) => { if (expandedFolders.has(f._id)) toggleFolder(f._id) })}
          >
            <ChevronsUpDown className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCreate}>
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCreateFolder}>
            <FolderIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-7 text-sm"
            />
          </div>
        </div>

        {/* Folder list */}
        <div className="flex-1 overflow-auto px-2">
          {folders.map(renderFolder)}

          {/* Quick Notes section */}
          <div
            onDragOver={(e) => { handleDragOver(e); setDropTarget((prev) => prev?.folderId === null ? prev : null) }}
            onDrop={(e) => handleDrop(e, null)}
          >
            <div
              className="flex items-center gap-1 rounded-lg px-2 py-1 cursor-pointer hover:bg-accent/50"
              onClick={() => setActiveFolderId(null)}
            >
              <FolderIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate text-sm font-semibold">Quick Notes</span>
              <Badge variant="secondary" className="h-4 text-[10px] px-1">{quickNotes.length}</Badge>
            </div>
            {quickNotes.length === 0 && dragActive && (
              <div className="h-0 relative mx-3">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary rounded" />
              </div>
            )}
            {quickNotes.map((note, noteIndex) => renderNoteItem(note, noteIndex, null))}
            {dropTarget?.folderId === null && dropTarget.noteIndex === quickNotes.length && quickNotes.length > 0 && (
              <div className="h-0 relative">
                <div className="absolute top-0 left-9 right-3 h-0.5 bg-primary rounded z-10" />
              </div>
            )}
          </div>
        </div>
      </aside>

      <DeleteConfirmDialog
        open={deleteNoteTarget !== null}
        onClose={() => setDeleteNoteTarget(null)}
        onConfirm={handleDeleteNote}
      />
      <DeleteFolderDialog
        open={deleteFolderTarget !== null}
        folderName={deleteFolderTarget?.name || ""}
        notesCount={deleteFolderTarget ? notes.filter((n) => n.folderId === deleteFolderTarget._id).length : 0}
        onClose={() => setDeleteFolderTarget(null)}
        onConfirm={handleDeleteFolder}
      />
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/NotesSidebar.tsx
git commit -m "refactor: replace MUI Drawer/List with shadcn Sheet/Collapsible/Command"
```

---

### Task 11: Rewrite MainArea (Editor + Toolbar)

**Files:**
- Modify: `components/MainArea.tsx`

- [ ] **Step 1: Rewrite MainArea.tsx**

`src/components/MainArea.tsx`:
```tsx
"use client"

import React, { useCallback, useRef, useState, useEffect } from "react"
import { useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import { TextStyle } from "@tiptap/extension-text-style"
import FontFamily from "@tiptap/extension-font-family"
import { FontSize } from "@/extensions/FontSize"
import { useNotes } from "@/contexts/NoteContext"
import NoteEditor from "./NoteEditor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Separator } from "@/components/ui/separator"
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
} from "lucide-react"

const FONTS = ["Arial", "Georgia", "Courier New", "Times New Roman", "Verdana"]
const FONT_SIZES = ["13", "14", "15", "16", "17", "18", "20", "24"]
const HEADINGS = [
  { label: "Paragraph", value: "paragraph" },
  { label: "Heading 1", value: "h1" },
  { label: "Heading 2", value: "h2" },
  { label: "Heading 3", value: "h3" },
]

export default function MainArea() {
  const { activeNote, activeNoteId, updateNote } = useNotes()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pendingUpdate = useRef<{ id: string; content: string } | null>(null)
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const activeNoteIdRef = useRef(activeNoteId)
  activeNoteIdRef.current = activeNoteId
  const [title, setTitle] = useState("")
  const [, setSelectionVersion] = useState(0)

  const handleUpdate = useCallback((id: string, content: string) => {
    pendingUpdate.current = { id, content }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (pendingUpdate.current) {
        updateNote(pendingUpdate.current.id, { content: pendingUpdate.current.content })
        pendingUpdate.current = null
      }
    }, 1000)
  }, [updateNote])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextStyle,
      FontFamily,
      FontSize,
    ],
    content: activeNote?.content || "<p></p>",
    editorProps: {
      attributes: { class: "note-editor" },
    },
    onUpdate: ({ editor: ed }) => {
      const id = activeNoteIdRef.current
      if (id) handleUpdate(id, ed.getHTML())
    },
    onSelectionUpdate: () => {
      setSelectionVersion((v) => v + 1)
    },
  })

  useEffect(() => {
    if (editor && activeNote && activeNote.content !== editor.getHTML()) {
      editor.commands.setContent(activeNote.content || "<p></p>")
    }
  }, [activeNote?._id])

  useEffect(() => {
    if (activeNote) setTitle(activeNote.title)
  }, [activeNote?._id])

  const handleTitleChange = useCallback((id: string, value: string) => {
    setTitle(value)
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current)
    titleDebounceRef.current = setTimeout(() => {
      updateNote(id, { title: value })
    }, 600)
  }, [updateNote])

  if (!activeNote) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Select a note or create a new one</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Toolbar */}
      {editor && (
        <div className="px-10 pt-2 max-w-[1140px] w-full">
          <div className="flex items-center gap-1 px-3 py-1 border rounded-lg bg-card">
            <ToggleGroup type="multiple" size="sm">
              <ToggleGroupItem
                value="bold"
                pressed={editor.isActive("bold")}
                onPressedChange={() => editor.chain().focus().toggleBold().run()}
                className="h-8 w-8"
              >
                <Bold className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="italic"
                pressed={editor.isActive("italic")}
                onPressedChange={() => editor.chain().focus().toggleItalic().run()}
                className="h-8 w-8"
              >
                <Italic className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="underline"
                pressed={editor.isActive("underline")}
                onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
                className="h-8 w-8"
              >
                <UnderlineIcon className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>

            <Separator orientation="vertical" className="mx-1 h-6" />

            <ToggleGroup type="multiple" size="sm">
              <ToggleGroupItem
                value="bulletList"
                pressed={editor.isActive("bulletList")}
                onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
                className="h-8 w-8"
              >
                <List className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="orderedList"
                pressed={editor.isActive("orderedList")}
                onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
                className="h-8 w-8"
              >
                <ListOrdered className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>

            <Separator orientation="vertical" className="mx-1 h-6" />

            <Select
              value={
                editor.isActive("heading", { level: 1 }) ? "h1" :
                editor.isActive("heading", { level: 2 }) ? "h2" :
                editor.isActive("heading", { level: 3 }) ? "h3" : "paragraph"
              }
              onValueChange={(val) => {
                const chain = editor.chain().focus().setParagraph()
                if (val === "h1") chain.unsetFontFamily().unsetFontSize().toggleHeading({ level: 1 })
                else if (val === "h2") chain.unsetFontFamily().unsetFontSize().toggleHeading({ level: 2 })
                else if (val === "h3") chain.unsetFontFamily().unsetFontSize().toggleHeading({ level: 3 })
                chain.run()
              }}
            >
              <SelectTrigger className="h-7 w-[110px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HEADINGS.map((h) => (
                  <SelectItem key={h.value} value={h.value} className="text-xs">{h.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={(() => {
                const explicit = editor.getAttributes("textStyle").fontSize?.replace("px", "")
                if (explicit) return explicit
                if (editor.isActive("heading", { level: 1 })) return "24"
                if (editor.isActive("heading", { level: 2 })) return "20"
                if (editor.isActive("heading", { level: 3 })) return "17"
                return "15"
              })()}
              onValueChange={(val) => editor.chain().focus().setFontSize(val + "px").run()}
            >
              <SelectTrigger className="h-7 w-[70px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_SIZES.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={editor.getAttributes("textStyle").fontFamily || "Arial"}
              onValueChange={(val) => editor.chain().focus().setFontFamily(val).run()}
            >
              <SelectTrigger className="h-7 w-[110px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONTS.map((f) => (
                  <SelectItem key={f} value={f} className="text-xs" style={{ fontFamily: f }}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Title */}
      <div className="px-10 pt-3 pb-0 max-w-[1140px] w-full">
        <Input
          value={title}
          onChange={(e) => handleTitleChange(activeNote._id, e.target.value)}
          className="text-2xl font-bold border-0 shadow-none px-0 h-auto focus-visible:ring-0"
          placeholder="Untitled"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Last updated: {new Date(activeNote.updatedAt).toLocaleString()}
        </p>
        <Separator className="mt-2" />
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto px-10 max-w-[1140px] w-full py-4">
        <NoteEditor note={activeNote} editor={editor} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/MainArea.tsx
git commit -m "refactor: replace MUI editor toolbar with shadcn ToggleGroup/Select"
```

---

### Task 12: Migrate API Routes to App Router

**Files:**
- Create: `app/api/notes/route.ts`
- Create: `app/api/notes/[id]/route.ts`
- Create: `app/api/folders/route.ts`
- Create: `app/api/folders/[id]/route.ts`

Convert Pages Router API handlers (`NextApiRequest`/`NextApiResponse`) to App Router Route Handlers (`NextRequest`).

- [ ] **Step 1: Create app/api/notes/route.ts**

`src/app/api/notes/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { Note, NoteInput } from "@/types"

export async function GET() {
  const db = await connectToDatabase()
  const collection = db.collection("notes")

  const notes = await collection
    .find({})
    .project({ title: 1, content: 1, folderId: 1, position: 1, createdAt: 1, updatedAt: 1 })
    .sort({ position: 1, updatedAt: -1 })
    .toArray()

  const mapped: Note[] = notes.map((n) => ({
    _id: n._id.toString(),
    title: n.title,
    content: n.content || "",
    folderId: n.folderId || undefined,
    position: n.position ?? 0,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  }))

  return NextResponse.json({ success: true, data: mapped })
}

export async function POST(request: NextRequest) {
  const db = await connectToDatabase()
  const collection = db.collection("notes")

  const body: NoteInput = await request.json()
  const { title, folderId, position } = body

  if (!title || !title.trim()) {
    return NextResponse.json({ success: false, error: "Title is required" }, { status: 400 })
  }

  const now = new Date()
  const doc: Record<string, unknown> = {
    title: title.trim(),
    content: "",
    position: position ?? 0,
    createdAt: now,
    updatedAt: now,
  }
  if (folderId) doc.folderId = folderId

  const result = await collection.insertOne(doc)

  const note: Note = {
    _id: result.insertedId.toString(),
    title: title.trim(),
    content: "",
    folderId: folderId || undefined,
    position: position ?? 0,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }

  return NextResponse.json({ success: true, data: note }, { status: 201 })
}
```

- [ ] **Step 2: Create app/api/notes/[id]/route.ts**

`src/app/api/notes/[id]/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { NoteUpdate } from "@/types"
import { ObjectId } from "mongodb"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let objectId: ObjectId
  try {
    objectId = new ObjectId(id)
  } catch {
    return NextResponse.json({ success: false, error: "Invalid note ID format" }, { status: 400 })
  }

  const db = await connectToDatabase()
  const collection = db.collection("notes")
  const body: NoteUpdate = await request.json()
  const { title, content, folderId, position } = body

  const update: Record<string, unknown> = { updatedAt: new Date() }
  if (title !== undefined) update.title = title.trim()
  if (content !== undefined) update.content = content
  if (folderId !== undefined) update.folderId = folderId || null
  if (position !== undefined) update.position = position

  const result = await collection.findOneAndUpdate(
    { _id: objectId },
    { $set: update },
    { returnDocument: "after" }
  )

  if (!result) {
    return NextResponse.json({ success: false, error: "Note not found" }, { status: 404 })
  }

  const note = {
    _id: result._id.toString(),
    title: result.title,
    content: result.content || "",
    folderId: result.folderId || undefined,
    position: result.position ?? 0,
    createdAt: result.createdAt.toISOString(),
    updatedAt: result.updatedAt.toISOString(),
  }

  return NextResponse.json({ success: true, data: note })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let objectId: ObjectId
  try {
    objectId = new ObjectId(id)
  } catch {
    return NextResponse.json({ success: false, error: "Invalid note ID format" }, { status: 400 })
  }

  const db = await connectToDatabase()
  const collection = db.collection("notes")
  const result = await collection.deleteOne({ _id: objectId })

  if (result.deletedCount === 0) {
    return NextResponse.json({ success: false, error: "Note not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Create app/api/folders/route.ts**

`src/app/api/folders/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { Folder } from "@/types"

export async function GET() {
  const db = await connectToDatabase()
  const collection = db.collection("folders")

  const folders = await collection
    .find({})
    .sort({ createdAt: -1 })
    .toArray()

  const mapped: Folder[] = folders.map((f) => ({
    _id: f._id.toString(),
    name: f.name,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  }))

  return NextResponse.json({ success: true, data: mapped })
}

export async function POST(request: NextRequest) {
  const db = await connectToDatabase()
  const collection = db.collection("folders")
  const { name } = await request.json()

  if (!name || !name.trim()) {
    return NextResponse.json({ success: false, error: "Folder name is required" }, { status: 400 })
  }

  const now = new Date()
  const result = await collection.insertOne({
    name: name.trim(),
    createdAt: now,
    updatedAt: now,
  })

  const folder: Folder = {
    _id: result.insertedId.toString(),
    name: name.trim(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }

  return NextResponse.json({ success: true, data: folder }, { status: 201 })
}
```

- [ ] **Step 4: Create app/api/folders/[id]/route.ts**

`src/app/api/folders/[id]/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { Folder } from "@/types"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let objectId: ObjectId
  try {
    objectId = new ObjectId(id)
  } catch {
    return NextResponse.json({ success: false, error: "Invalid folder ID format" }, { status: 400 })
  }

  const db = await connectToDatabase()
  const foldersCollection = db.collection("folders")
  const { name } = await request.json()

  if (!name || !name.trim()) {
    return NextResponse.json({ success: false, error: "Folder name is required" }, { status: 400 })
  }

  const result = await foldersCollection.findOneAndUpdate(
    { _id: objectId },
    { $set: { name: name.trim(), updatedAt: new Date() } },
    { returnDocument: "after" }
  )

  if (!result) {
    return NextResponse.json({ success: false, error: "Folder not found" }, { status: 404 })
  }

  const folder: Folder = {
    _id: result._id.toString(),
    name: result.name,
    createdAt: result.createdAt.toISOString(),
    updatedAt: result.updatedAt.toISOString(),
  }

  return NextResponse.json({ success: true, data: folder })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let objectId: ObjectId
  try {
    objectId = new ObjectId(id)
  } catch {
    return NextResponse.json({ success: false, error: "Invalid folder ID format" }, { status: 400 })
  }

  const db = await connectToDatabase()
  const foldersCollection = db.collection("folders")
  const notesCollection = db.collection("notes")

  const deleteResult = await foldersCollection.deleteOne({ _id: objectId })

  if (deleteResult.deletedCount === 0) {
    return NextResponse.json({ success: false, error: "Folder not found" }, { status: 404 })
  }

  const notesDelete = await notesCollection.deleteMany({ folderId: id })

  return NextResponse.json({
    success: true,
    data: {
      deletedFolder: id,
      deletedNotesCount: notesDelete.deletedCount,
    },
  })
}
```

- [ ] **Step 5: Remove old Pages Router API files**

```bash
git rm src/pages/api/notes.ts src/pages/api/notes/[id].ts src/pages/api/folders.ts src/pages/api/folders/[id].ts
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/
git rm src/pages/api/notes.ts src/pages/api/notes/\[id\].ts src/pages/api/folders.ts src/pages/api/folders/\[id\].ts
git commit -m "feat: migrate API routes to App Router Route Handlers"
```

---

### Task 13: Rewrite Main Page (app/page.tsx) with Layout

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Rewrite app/page.tsx**

`src/app/page.tsx`:
```tsx
"use client"

import React from "react"
import AppHeader from "@/components/AppHeader"
import NotesSidebar from "@/components/NotesSidebar"
import MainArea from "@/components/MainArea"

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = React.useState(true)

  return (
    <div className="flex flex-col h-svh">
      <AppHeader
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        showMenuButton={true}
      />
      <div className="flex flex-1 overflow-hidden relative">
        <div
          className={`${
            sidebarOpen ? "block" : "hidden"
          } md:block w-full md:w-[280px] flex-shrink-0`}
        >
          <NotesSidebar />
        </div>
        <div
          className={`flex-1 overflow-hidden ${
            sidebarOpen ? "hidden md:block" : "block"
          }`}
          onClick={() => {
            if (window.innerWidth < 768 && sidebarOpen) setSidebarOpen(false)
          }}
        >
          <MainArea />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Remove old Pages Router files**

```bash
git rm src/pages/index.tsx src/pages/_app.tsx src/pages/_document.tsx src/styles/globals.css
```

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git rm src/pages/index.tsx src/pages/_app.tsx src/pages/_document.tsx src/styles/globals.css
git commit -m "feat: migrate main page to App Router with shadcn layout"
```

---

### Task 14: Clean Up and Verify Build

**Files:**
- Modify: `next.config.js` (if needed)

- [ ] **Step 1: Remove any remaining obsolete directories**

```bash
rmdir src\pages /s /q 2>nul || true
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```
Expected: Build succeeds with no errors.

- [ ] **Step 3: Verify lint passes**

```bash
npm run lint
```
Expected: Lint passes with no errors.

- [ ] **Step 4: Final commit**

```bash
git add -A
git status
git commit -m "chore: clean up remaining MUI references and obsolete files"
```
