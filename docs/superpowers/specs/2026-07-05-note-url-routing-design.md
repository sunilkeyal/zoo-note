# Note URL Routing

## Summary
Give each note its own unique URL (`/notes/[id]`) so the browser back button navigates through the user's note history instead of leaving the app. Currently all notes share the URL `/`, making browser history useless.

## New route

### `src/app/notes/layout.tsx`
- Same authenticated sidebar layout pattern as `favorites/layout.tsx`, `recent/layout.tsx`, `calendar/layout.tsx`, `trash/layout.tsx`
- `SidebarProvider > NotesSidebar + SidebarInset > AppHeader + children`

### `src/app/notes/[id]/page.tsx`
- `"use client"` — reads `params.id` via `useParams()`
- On mount: calls `setActiveNoteId(noteId)` to sync context with URL
- Does NOT clear `activeNoteId` on unmount (avoids flicker between note transitions; URL is source of truth)
- While notes are loading: renders a centered loading spinner
- If loaded and note ID not found: renders "Note not found" message
- Otherwise: renders `<MainArea />`

## Modified pages

### `src/app/page.tsx`
- Remove the `{activeNoteId ? <MainArea /> : <HomePage />}` conditional
- Always render `<HomePage />`
- Remove the `useNotes` import (no longer needed for `activeNoteId`)
- Note-selected state is now handled by the `/notes/[id]` route

## Navigation updates

All note-click handlers that set `activeNoteId` + navigate must now point to `/notes/[id]`:

| File | Line(s) | Change |
|---|---|---|
| `src/components/NotesSidebar.tsx` | ~579–582 | `router.push("/")` → `router.push(\`/notes/${noteId}\`)` |
| `src/components/NotesSidebar.tsx` | ~337–340 | `router.push(\`/${searchParam}\`)` → `router.push(\`/notes/${noteId}${searchParam}\`)` |
| `src/components/HomePage.tsx` | ~119 | After create note → add `router.push(\`/notes/${note._id}\`)` |
| `src/components/HomePage.tsx` | ~127–130 | `router.push("/?q=...")` → `router.push(\`/notes/${id}${searchQuery ? "?q=..." : ""}\`)` |
| `src/app/favorites/page.tsx` | ~87–88 | `router.push(...)` → `router.push(\`/notes/${id}${filter ? "?q=..." : ""}\`)` |
| `src/app/recent/page.tsx` | ~90–91 | Same pattern as favorites |

Search query param (`?q=...`) is preserved and passed to the note URL so the editor highlights matching text.
