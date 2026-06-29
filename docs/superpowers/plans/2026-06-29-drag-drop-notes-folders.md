# Drag & Drop Notes and Folders — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add smooth drag-and-drop reordering for notes and folders with visual drop indicators, root-level notes section, and root-level note creation.

**Architecture:** Add `@dnd-kit` packages for DnD. Add `position` field to Folder model. Restructure sidebar to include root-level notes section. Replace native HTML5 DnD with `@dnd-kit/sortable` for smooth animations and `DragOverlay`. Add `moveFolder` to context and folder position API.

**Tech Stack:** React 19, Next.js 16, @dnd-kit/core + @dnd-kit/sortable, shadcn/ui sidebar, Tailwind CSS 4

---

### Task 1: Install @dnd-kit dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install @dnd-kit packages**

Run:
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Expected: Packages added to `dependencies` in `package.json`.

- [ ] **Step 2: Verify install**

Run: `npm ls @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
Expected: Three packages listed without errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @dnd-kit packages for drag-and-drop"
```

---

### Task 2: Add `position` field to Folder model and API

**Files:**
- Modify: `src/types/index.ts:1-9`
- Modify: `src/app/api/folders/route.ts`
- Modify: `src/app/api/folders/[id]/route.ts`

- [ ] **Step 1: Add `position` to Folder interface**

In `src/types/index.ts`, add `position: number` to the Folder interface.

```typescript
export interface Folder {
  _id: string;
  name: string;
  userId?: string;
  position: number;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
  deletedAt?: string;
}
```

- [ ] **Step 2: Update GET /api/folders to sort + return position**

In `src/app/api/folders/route.ts`:
- Change sort from `{ createdAt: -1 }` to `{ position: 1, createdAt: -1 }`
- Add `position: f.position ?? 0` to the mapped response

```typescript
    .sort({ position: 1, createdAt: -1 })
```

```typescript
  const mapped: Folder[] = folders.map((f) => ({
    _id: f._id.toString(),
    name: f.name,
    userId: f.userId || undefined,
    position: f.position ?? 0,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  }))
```

- [ ] **Step 3: Update POST /api/folders to accept `position`**

In `src/app/api/folders/route.ts`, update the POST handler:

```typescript
  const { name, position } = await request.json()

  if (!name || !name.trim()) {
    return NextResponse.json({ success: false, error: "Folder name is required" }, { status: 400 })
  }

  const now = new Date()

  // Compute next position if not provided
  let nextPosition = position
  if (nextPosition === undefined) {
    const maxPosFolder = await collection
      .find({ userId: session.user.id, isDeleted: { $ne: true } })
      .sort({ position: -1 })
      .limit(1)
      .toArray()
    nextPosition = maxPosFolder.length > 0 ? maxPosFolder[0].position + 1000 : 0
  }

  const result = await collection.insertOne({
    name: name.trim(),
    position: nextPosition,
    userId: session.user.id,
    createdAt: now,
    updatedAt: now,
  })

  const folder: Folder = {
    _id: result.insertedId.toString(),
    name: name.trim(),
    position: nextPosition,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }
```

- [ ] **Step 4: Update PUT /api/folders/[id] to accept `position`**

In `src/app/api/folders/[id]/route.ts`:
- Remove the early "name required" check
- Accept both `name` and `position` in request body
- Build update fields dynamically
- Add `position` to response

```typescript
  const { name, position } = await request.json()

  if (!name?.trim() && position === undefined) {
    return NextResponse.json({ success: false, error: "At least one field (name or position) is required" }, { status: 400 })
  }

  const updateFields: Record<string, unknown> = { updatedAt: new Date() }
  if (name?.trim()) updateFields.name = name.trim()
  if (position !== undefined) updateFields.position = position

  const result = await foldersCollection.findOneAndUpdate(
    { _id: objectId, userId: session.user.id },
    { $set: updateFields },
    { returnDocument: "after" }
  )

  if (!result) {
    return NextResponse.json({ success: false, error: "Folder not found" }, { status: 404 })
  }

  const folder: Folder = {
    _id: result._id.toString(),
    name: result.name,
    position: result.position ?? 0,
    createdAt: result.createdAt.toISOString(),
    updatedAt: result.updatedAt.toISOString(),
  }
```

- [ ] **Step 5: Build check**

Run: `npm run build`
Expected: No TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src/app/api/folders/route.ts src/app/api/folders/\[id\]/route.ts
git commit -m "feat: add position field to folder model and API"
```

---

### Task 3: Add `moveFolder` to NoteContext and sort folders by position

**Files:**
- Modify: `src/contexts/NoteContext.tsx`

- [ ] **Step 1: Add `moveFolder` to context interface**

In `NoteContextValue`, add after `moveNote`:
```typescript
  moveFolder: (folderId: string, position: number) => Promise<Folder | null>;
```

- [ ] **Step 2: Add `sortFoldersByPosition` helper**

Add after `sortByPosition`:
```typescript
function sortFoldersByPosition(folders: Folder[]): Folder[] {
  return [...folders].sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
```

- [ ] **Step 3: Sort folders on fetch**

In `fetchFolders`, change:
```typescript
        setFolders(json.data);
```
to:
```typescript
        setFolders(sortFoldersByPosition(json.data));
```

- [ ] **Step 4: Implement `moveFolder` callback**

Add after the `moveNote` callback:
```typescript
  const moveFolder = useCallback(async (folderId: string, position: number): Promise<Folder | null> => {
    try {
      const res = await fetch(`/api/folders/${folderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position }),
      });
      const json: ApiResponse<Folder> = await res.json();
      if (json.success && json.data) {
        setFolders((prev) => sortFoldersByPosition(prev.map((f) => (f._id === folderId ? json.data! : f))));
        return json.data;
      }
      return null;
    } catch {
      return null;
    }
  }, []);
```

- [ ] **Step 5: Add `moveFolder` to context value and deps**

In `useMemo`, add `moveFolder` after `moveNote` both in the factory function and deps array.

- [ ] **Step 6: Build check**

Run: `npm run build`
Expected: No TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add src/contexts/NoteContext.tsx
git commit -m "feat: add moveFolder to context, sort folders by position"
```

---

### Task 4: Refactor NotesSidebar — DndContext, DnD handlers, sortable items

**Files:**
- Modify: `src/components/NotesSidebar.tsx`

- [ ] **Step 1: Update imports**

Replace line 3 (`import React, { useState, DragEvent } from "react"`) with:
```typescript
import React, { useState } from "react"
```

Add @dnd-kit imports after the React import:
```typescript
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
```

- [ ] **Step 2: Remove old DnD state and handlers**

Delete these state variables (lines 179-183):
```typescript
const [dragActive, setDragActive] = useState(false)
const [dropTarget, setDropTarget] = useState<{
  folderId: string | null
  noteIndex: number
} | null>(null)
```

Delete these old handler functions (lines 294-329):
- `handleDragStart` (the native HTML5 one)
- `handleDragOver` (the native one)
- `handleDrop`
- `handleNoteDragOver`
- `handleDragEnd` (the native one)

- [ ] **Step 3: Add new state and sensors**

Add after `cancelRename`:
```typescript
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [activeDragType, setActiveDragType] = useState<"note" | "folder" | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )
```

- [ ] **Step 4: Add computePosition helper**

Add a helper function inside the component (after the state declarations):
```typescript
  const computeInsertPosition = (items: { position: number }[], targetIndex: number): number => {
    const before = items[targetIndex - 1]?.position ?? null
    const after = items[targetIndex]?.position ?? null
    if (before === null && after === null) return 1000
    if (before === null) return after! / 2
    if (after === null) return before + 1000
    return (before + after) / 2
  }
```

- [ ] **Step 5: Add @dnd-kit drag handlers**

Add after `useSensors`:
```typescript
  const handleDragStartFn = (event: DragStartEvent) => {
    const id = event.active.id as string
    setActiveDragId(id)
    setActiveDragType(folders.some((f) => f._id === id) ? "folder" : "note")
  }

  const handleDragEndFn = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDragId(null)
    setActiveDragType(null)

    if (!over || active.id === over.id) return

    const activeId = active.id as string
    const overId = over.id as string

    // --- Folder reorder ---
    if (folders.some((f) => f._id === activeId)) {
      const sorted = [...folders].sort((a, b) => a.position - b.position)
      const oldIdx = sorted.findIndex((f) => f._id === activeId)
      const newIdx = sorted.findIndex((f) => f._id === overId)
      if (oldIdx === -1 || newIdx === -1) return

      const target = sorted[newIdx]
      let pos: number
      if (oldIdx < newIdx) {
        const next = sorted[newIdx + 1]
        pos = next ? (target.position + next.position) / 2 : target.position + 1000
      } else {
        const prev = sorted[newIdx - 1]
        pos = prev ? (prev.position + target.position) / 2 : target.position / 2
      }
      await moveFolder(activeId, pos)
      return
    }

    // --- Note move ---
    const noteToMove = notes.find((n) => n._id === activeId)
    if (!noteToMove) return

    // Check if dropped on a folder
    if (folders.some((f) => f._id === overId)) {
      const folderNotes = notes
        .filter((n) => n.folderId === overId)
        .sort((a, b) => a.position - b.position)
      const pos = folderNotes.length > 0 ? folderNotes[folderNotes.length - 1].position + 1000 : 0
      await moveNote(activeId, overId, pos)
      return
    }

    // Dropped on a note — determine container and insert position
    const overNote = notes.find((n) => n._id === overId)
    if (!overNote) return

    const targetFolderId = overNote.folderId ?? null
    const containerNotes = notes
      .filter((n) => targetFolderId === null ? !n.folderId : n.folderId === targetFolderId)
      .sort((a, b) => a.position - b.position)

    const overIdx = containerNotes.findIndex((n) => n._id === overId)
    if (overIdx === -1) return

    const pos = computeInsertPosition(containerNotes, overIdx)
    await moveNote(activeId, targetFolderId, pos)
  }
```

- [ ] **Step 6: Add `handleCreateRootNote` handler**

Add after `handleCreate`:
```typescript
  const handleCreateRootNote = async () => {
    const rootNotes = filtered.filter((n) => !n.folderId).sort((a, b) => a.position - b.position)
    const position = rootNotes.length > 0 ? rootNotes[rootNotes.length - 1].position + 1000 : 0
    const note = await createNote({ title: "Untitled Note", position })
    if (note) {
      setActiveNoteId(note._id)
    }
  }
```

- [ ] **Step 7: Create SortableNoteItem and SortableFolderItem components**

Add inside the component, before `renderNoteItem`:

```typescript
  const SortableNoteItem = ({ note, noteIndex, parentFolderId, dragType }: { note: Note; noteIndex: number; parentFolderId: string | null; dragType: string | null }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({ id: note._id })
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.4 : 1,
      position: "relative" as const,
    }
    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}
        className={isOver && dragType === "note" ? "border-t-2 border-blue-500" : ""}
      >
        {renderNoteItem(note, noteIndex, parentFolderId)}
      </div>
    )
  }

  const SortableFolderItem = ({ folder, children, dragType }: { folder: Folder; children: React.ReactNode; dragType: string | null }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({ id: folder._id })
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.4 : 1,
    }
    const indicatorClass = isOver
      ? dragType === "folder"
        ? "border-t-2 border-blue-500"
        : "ring-2 ring-blue-500 rounded-md"
      : ""
    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}
        className={indicatorClass}
      >
        {children}
      </div>
    )
  }
```

- [ ] **Step 8: Remove native DnD props from renderNoteItem**

In `renderNoteItem` (lines 331-383), remove these props from `SidebarMenuSubButton`:
- `draggable`
- `onDragStart`
- `onDragEnd`
- `onDragOver`

The SidebarMenuSubButton should look like:
```tsx
              <SidebarMenuSubButton
                isActive={activeNoteId === note._id}
                onClick={() => { setActiveNoteId(note._id); setActiveFolderId(null); if (pathname !== "/") router.push("/") }}
                onDoubleClick={() => startRenaming(note._id, note.title)}
              >
```

- [ ] **Step 9: Wrap renderFolder with SortableFolderItem and SortableContext**

In `renderFolder`:
- Wrap the Collapsible return with `SortableFolderItem`
- Wrap the notes list inside `CollapsibleContent` with `SortableContext`

```typescript
  const renderFolder = (folder: Folder) => {
    const folderNotes = filtered.filter((n) => n.folderId === folder._id)
    const isExpanded = expandedFolders.has(folder._id)
    const FolderIconForFolder = getFolderIcon(folder.name)

    return (
      <SortableFolderItem key={folder._id} folder={folder} dragType={activeDragType}>
        <Collapsible
          open={isExpanded}
          onOpenChange={() => { toggleFolder(folder._id); setActiveFolderId(folder._id) }}
        >
          <SidebarGroup className="py-0">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <ContextMenu>
                    <ContextMenuTrigger render={
                      <CollapsibleTrigger render={<SidebarMenuButton isActive={activeFolderId === folder._id} />}>
                        <FolderIconForFolder />
                        {renamingId === folder._id ? (
                          <Input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => finishRename(folder._id)}
                            onKeyDown={(e) => { if (e.key === "Enter") finishRename(folder._id); if (e.key === "Escape") cancelRename() }}
                            autoFocus
                            className="h-6 text-xs px-1"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className="flex-1 truncate text-left">{folder.name}</span>
                        )}
                      </CollapsibleTrigger>
                    } />
                    <ContextMenuContent>
                      <ContextMenuItem onClick={(e) => { e.stopPropagation(); handleCreateInFolder(folder._id) }}>
                        <Plus /> Create new note
                      </ContextMenuItem>
                      <ContextMenuItem onClick={(e) => { e.stopPropagation(); handleRenameFromContextMenu(folder._id, folder.name) }}>
                        <Pencil /> Rename
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem onClick={(e) => { e.stopPropagation(); setDeleteFolderTarget(folder) }}>
                        <Trash2 /> Move to trash
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                  {!renamingId && (
                    <SidebarMenuAction showOnHover={false} onClick={() => { toggleFolder(folder._id); setActiveFolderId(folder._id) }}>
                      {isExpanded ? <ChevronDown /> : <ChevronRight />}
                    </SidebarMenuAction>
                  )}
                </SidebarMenuItem>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {folderNotes.length === 0 && (
                      <SidebarMenuSubItem>
                        <span className="block px-2 py-1 text-xs text-sidebar-foreground/50">No notes</span>
                      </SidebarMenuSubItem>
                    )}
                    <SortableContext items={folderNotes.map(n => n._id)} strategy={verticalListSortingStrategy}>
                      {folderNotes.map((note, noteIndex) => (
                        <SortableNoteItem key={note._id} note={note} noteIndex={noteIndex} parentFolderId={folder._id} dragType={activeDragType} />
                      ))}
                    </SortableContext>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </Collapsible>
      </SortableFolderItem>
    )
  }
```

- [ ] **Step 10: Replace sidebar content with DndContext wrapper and root notes section**

Replace the content area (from `<SidebarContent>` to the workspace section separator) with:

```tsx
        <SidebarContent>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStartFn}
            onDragEnd={handleDragEndFn}
          >
            {/* Folders section */}
            <div className="px-3 py-1 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
              Folders
            </div>
            <SortableContext items={folders.map(f => f._id)} strategy={verticalListSortingStrategy}>
              {folders.map(renderFolder)}
            </SortableContext>

            {/* Root-level notes section */}
            {filtered.filter(n => !n.folderId).length > 0 && (
              <>
                <SidebarSeparator className="my-2" />
                <div className="px-3 py-1 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                  Notes
                </div>
                <SidebarGroup className="py-0">
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuSub>
                        <SortableContext
                          items={filtered.filter(n => !n.folderId).map(n => n._id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {filtered.filter(n => !n.folderId).map((note, noteIndex) => (
                            <SortableNoteItem key={note._id} note={note} noteIndex={noteIndex} parentFolderId={null} dragType={activeDragType} />
                          ))}
                        </SortableContext>
                      </SidebarMenuSub>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </>
            )}

            {/* DragOverlay */}
            <DragOverlay>
              {activeDragId && activeDragType === "folder" ? (
                <div className="flex items-center gap-2 px-3 py-1.5 text-sm bg-sidebar-accent/80 rounded-md shadow-md backdrop-blur-sm">
                  <FolderIcon className="size-4" />
                  <span className="truncate">{folders.find(f => f._id === activeDragId)?.name}</span>
                </div>
              ) : activeDragId && activeDragType === "note" ? (
                <div className="flex items-center gap-2 px-3 py-1.5 text-sm bg-sidebar-accent/80 rounded-md shadow-md backdrop-blur-sm">
                  <StickyNote className="size-4" />
                  <span className="truncate">{notes.find(n => n._id === activeDragId)?.title}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          {/* Workspace section — visible to all authenticated users */}
          <SidebarSeparator className="my-2" />
```

You'll need to add `DragOverlay` to the imports from `@dnd-kit/core` (it's already listed in Step 1's imports).

- [ ] **Step 11: Add "New Note" button in the header toolbar**

In the header toolbar `div` (around line 477), add a new button after the "New Folder" button:

```tsx
            <Tooltip>
              <TooltipTrigger render={<Button variant="ghost" size="icon" onClick={handleCreateRootNote} />}>
                <StickyNote />
              </TooltipTrigger>
              <TooltipContent>New note</TooltipContent>
            </Tooltip>
```

- [ ] **Step 12: Remove unused imports**

Remove any now-unused imports:
- Remove `DragEvent` from the React import on line 3
- Keep all lucide-react imports (they're still used)

- [ ] **Step 13: Build check**

Run: `npm run build`
Expected: No TypeScript errors.

- [ ] **Step 14: Commit**

```bash
git add src/components/NotesSidebar.tsx
git commit -m "feat: implement drag-and-drop with @dnd-kit, root notes section, and new note button"
```

---

### Task 5: Verify root-level note rendering on initial load

A quick manual check that existing root-level notes (if any exist in the database) appear in the new "Notes" section.

- [ ] **Step 1: Manual smoke test**

1. Boot the dev server: `npm run dev`
2. Open the app and log in
3. Verify the sidebar shows:
   - "Folders" section with existing folders (sortable)
   - Root-level "Notes" section if any notes exist without a folder
   - "New note" button (StickyNote icon) next to "New folder" button
4. Drag a note within a folder — should reorder with smooth animation
5. Drag a note to a different folder — should move with correct positioning
6. Drag a note to root level — should appear in root "Notes" section
7. Drag a folder — should reorder with animation
8. Drag a note over a folder header — folder should highlight with blue ring
9. Verify drop indicator (blue line) appears when hovering between notes

- [ ] **Step 2: Build**

Run `npm run build` and confirm clean output.

### Task 6: Final verification and cleanup

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: Clean build with no errors.

- [ ] **Step 2: Lint check**

Run: `npm run lint`
Expected: No lint errors. Fix any that appear.

- [ ] **Step 3: Verify all features**

Check each requirement:
- Notes can be dragged within the same folder (reorder) — @dnd-kit SortableContext handles this
- Notes can be dragged to another folder — handleDragEndFn checks folder drops
- Notes can be dragged to root level — targetFolderId = null works in moveNote
- Blue 2px top border shows where drop will occur — useSortable `over` detection + border-t-2
- Folders can be reordered — handleDragEndFn folder branch
- Root-level notes section renders and is sortable — SortableContext in root section
- "New Note" button creates root-level note — handleCreateRootNote
- DragOverlay shows ghost preview — DragOverlay with FolderIcon/StickyNote

- [ ] **Step 4: Final commit if lint fixes were needed**

```bash
git add -A
git commit -m "chore: fix lint issues"
```
