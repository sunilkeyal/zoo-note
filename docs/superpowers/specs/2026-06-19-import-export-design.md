# Import / Export Design

## Overview

Add import/export functionality enabling users to:
- Bulk export all notes as Markdown files in a .zip archive (with folder structure and front matter metadata)
- Export individual notes as Markdown (.md) or PDF (styled to match the editor rendering)
- Import notes from Markdown (.md) files or .zip archives containing .md files (front matter drives title and folder reconstruction)

## Export Format

### Markdown Front Matter

Each exported `.md` file includes YAML front matter for round-trip compatibility:

```yaml
---
title: Meeting Notes
folder: Work
---

Note content as plain Markdown...
```

The `folder` field is omitted if the note has no folder (top-level notes).

### ZIP Structure (Bulk Export)

```
notes-export-2026-06-19.zip/
├── Work/
│   ├── Meeting Notes.md
│   └── Sprint Planning.md
├── Personal/
│   └── Grocery List.md
└── Untitled Note.md
```

Top-level notes (no folder) go at the root of the zip. Each subdirectory corresponds to a folder.

### Single Note Export

Available per-note via a popover in the sidebar. User selects:
- **Markdown (.md)** — same format as bulk export (front matter + markdown body)
- **PDF** — renders the note's HTML content styled to match the editor appearance, then converts to PDF

## Import Behavior

### Accepted Formats
- Single `.md` files
- `.zip` archives containing `.md` files (nested directories supported)

### Front Matter Parsing
- `title` → note title (falls back to filename if missing)
- `folder` → destination folder name (creates folder if it doesn't exist; falls back to no folder if missing)

### Conflict Handling
- If a note with the same title already exists in the target folder, a timestamp suffix is appended (e.g., "Meeting Notes-20260619")
- If a folder with the same name already exists, notes are imported into it (no duplicate folder created)

## API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/export` | Returns a .zip of all user notes as Markdown with front matter |
| `POST` | `/api/import` | Accepts multipart/form-data with .md or .zip files, imports notes |

### GET /api/export

- Auth: session required
- Response: `Content-Type: application/zip`, `Content-Disposition: attachment; filename="notes-export-YYYY-MM-DD.zip"`
- Generates zip on the fly using `archiver` npm package
- Each note's HTML content is converted to plain Markdown using `turndown` npm package (handles headings, lists, bold, italic, links, etc. from TipTap HTML output)

### POST /api/import

- Auth: session required
- Accepts: multipart/form-data with one or more files (`files` field)
- Processes each file:
  - `.md` → parse front matter + body, create/update note
  - `.zip` → extract in memory, recursively process all `.md` files
- Returns JSON: `{ success: true, data: { imported: number, skipped: number, errors: string[] } }`

## Front-End Changes

### New / Modified Components

#### `src/app/api/export/route.ts` (new)
- Generates zip with all user notes
- Converts HTML content to Markdown (strip tags, format lists/headings)

#### `src/app/api/import/route.ts` (new)
- Accepts multipart upload
- Parses front matter from markdown files
- Creates notes and folders as needed

#### `src/lib/export.ts` (new)
- `convertHtmlToMarkdown(html: string): string` — converts TipTap HTML output to plain Markdown
- `generateFrontMatter(note: Note): string` — generates YAML front matter
- `generateExportZip(notes: Note[], folders: Folder[]): Buffer` — builds the zip archive

#### `src/lib/import.ts` (new)
- `parseMarkdownFile(content: string): { title?: string; folder?: string; body: string }` — extracts front matter and body
- `processImportFile(file: File, userId: string): Promise<ImportResult>` — handles single .md or .zip

#### `src/app/workspace/import-export/page.tsx` (modify)
- Replace placeholder with full import/export UI:
- Export card with "Export All Notes (.zip)" button + checkbox options (include folder structure, include front matter — both default to enabled)
- Import card with drag & drop zone accepting .md and .zip, file list showing parsed file info with status, "Import Selected" button
  - Import progress/result display
  - Loading, empty, error states

#### `src/components/NotesSidebar.tsx` (modify)
- Add export button to each note's hover actions (alongside rename and delete)
- Export button shows a popover with Markdown / PDF choice

#### `src/lib/pdf.ts` (new)
- `generatePdf(html: string): Promise<Buffer>` — uses `puppeteer` to render HTML to PDF server-side
- Applies editor CSS to match the rendering style (loads the note's HTML into a headless browser page with the same CSS as the editor)

### UI States for Import/Export Page

| State | Handling |
|-------|----------|
| Loading | Skeleton cards matching card layout |
| Empty (export) | "No notes to export" message |
| Empty (import) | Drop zone with hint text |
| Import in progress | Progress bar showing file processing status |
| Import complete | Success summary with count of imported notes |
| Import error | Error banner with per-file error details |
| Export in progress | Button shows spinner, disabled |
| Export complete | Browser download triggers automatically |

## Component Architecture

### New Files
- `src/app/api/export/route.ts` — GET zip export
- `src/app/api/import/route.ts` — POST multipart import
- `src/lib/export.ts` — HTML-to-Markdown conversion, front matter generation, zip building
- `src/lib/import.ts` — Markdown parsing, front matter extraction, file processing
- `src/lib/pdf.ts` — HTML-to-PDF rendering

### Modified Files
- `src/app/workspace/import-export/page.tsx` — Full import/export UI
- `src/components/NotesSidebar.tsx` — Per-note export button with format popover
- `package.json` — Add dependencies: `archiver` (zip generation), `turndown` (HTML-to-Markdown), `puppeteer` (PDF generation), `yaml` (front matter parsing/serialization), and their respective type packages

## Future / Stretch
- Drag-and-drop reordering of import queue
- Selective export (choose specific notes/folders to export)
- Import preview before committing
