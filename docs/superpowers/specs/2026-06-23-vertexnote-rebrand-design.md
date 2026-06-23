# VertexNote Rebrand — Design Specification

## Overview

Rebrand the application from "Notes" / "Notes App" to **VertexNote**. The existing `vertexnote.png` (1024×1024 PNG) becomes the primary logo asset and appears in the sidebar header, login/signup pages, and as the browser tab favicon.

## Asset Management

`vertexnote.png` is moved from the project root to `public/vertexnote.png`. Serving it from `public/` makes it available at the URL path `/vertexnote.png` for use in both `<img>` tags and Next.js metadata.

No additional copies of the file are created.

## Changes by File

### `public/vertexnote.png`
Move `vertexnote.png` from project root → `public/vertexnote.png`. No other transformation.

### `src/app/layout.tsx`
Update the `metadata` export:
- `title`: `"Notes"` → `"VertexNote"`
- `description`: `"A simple notes application"` → `"VertexNote — your personal notes workspace"`
- Add `icons: { icon: '/vertexnote.png' }` to set the browser tab favicon.

### `src/components/NotesSidebar.tsx`
In the `<SidebarHeader>` block, replace the `<Pen className="size-5" />` icon and `<span>Notes</span>` with:
- An `<img>` tag at 24×24px pointing to `/vertexnote.png` with `alt="VertexNote"`
- `<span>VertexNote</span>`

The `"Notes"` section label inside `<SidebarContent>` (the small uppercase category header) is **not changed** — it labels the notes list section, not the brand.

### `src/app/login/page.tsx`
Add a centered logo block above the `<Card>` element:
- `<img src="/vertexnote.png" alt="VertexNote" />` at 64×64px, centered.

### `src/app/signup/page.tsx`
Same change as `login/page.tsx` — centered 64×64px logo above the `<Card>`.

### `src/app/admin/settings/page.tsx`
Change the displayed application name value from `"Notes App"` → `"VertexNote"`.

### `package.json`
Change `"name": "notes-app"` → `"name": "vertexnote"`.

## Out of Scope

- Email subject lines and templates (no brand name present, generic wording is acceptable)
- Renaming code symbols (`NotesSidebar`, `NoteContext`, `useNotes`, etc.) — these are internal identifiers, not user-facing brand
- The `"Notes"` section label and `"Workspace"` section label inside the sidebar content
- favicon.ico generation (PNG favicon is sufficient for modern browsers)
