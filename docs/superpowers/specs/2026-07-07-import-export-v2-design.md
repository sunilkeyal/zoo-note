# Import / Export Design (v2)

## Overview

User-level import/export for notes, folders, and images. Export produces a ZIP with a `notes.json` manifest + raw image files. Import reverses the process, creating fresh notes/folders/images with no deduplication.

Replaces the earlier v1 design (Markdown-based). This version keeps content as raw HTML with no conversion loss.

## Data Model

Interfaces as exported/imported via `notes.json`:

```ts
interface ExportManifest {
  version: 1
  exportedAt: string        // ISO timestamp
  folders: ExportFolder[]
  notes: ExportNote[]
}

interface ExportFolder {
  name: string
  position: number
}

interface ExportNote {
  title: string
  content: string           // raw HTML (as stored in MongoDB)
  folderName: string | null // null = top-level, no folder
  position: number
}
```

## Export Format

```
my-notes-export-2026-07-07.zip
├── notes.json
└── images/
    ├── 67a1b2c3d4e5f6a7b8c9d0e1.png
    ├── 67a2b3c4d5e6f7a8b9c0d1e2.jpg
    └── ...
```

- Image filenames use the raw GridFS ObjectId (hex) with original extension
- Image deduplication: if 2 notes reference the same GridFS ID, it appears once in the ZIP
- Image HTML references are rewritten on export: `src="/api/images/<id>"` → `src="images/<id>.ext"`

## Export Flow

**API:** `GET /api/notes/export`

1. Fetch all active notes for user (sorted by `position`)
2. Fetch all active folders for user (sorted by `position`)
3. Scan note HTML content for all `<img src="/api/images/<id>">` references
4. Collect unique GridFS IDs
5. Create ZIP with `archiver`:
   - `notes.json` — JSON-serialized manifest
   - `images/<id>.ext` — streamed from GridFS for each unique ID
6. Rewrite all HTML `src="/api/images/<id>"` → `src="images/<id>.ext"`
7. Stream ZIP as response (`Content-Type: application/zip`)

## Import Flow

**API:** `POST /api/notes/import` (multipart/form-data, field: `file`)

1. Receive ZIP, extract with `adm-zip` in memory
2. Read `notes.json` from ZIP root
3. Collect all image files from `images/` directory
4. Upload each image to GridFS (fresh ObjectId), track mapping: `oldId → newId`
5. Rewrite all HTML `src="images/<oldId>.ext"` → `src="/api/images/<newId>"`
6. Create folders (via `POST /api/folders`) preserving original names and positions
7. Create folder name → new folder ID mapping
8. Create notes (via `POST /api/notes`) with:
   - Original title
   - Rewritten HTML content
   - Mapped folderId (null if top-level)
   - Original position
   - Timestamps set to current time
9. Return `{ success, notesImported, foldersCreated, imagesImported }`

## UI

A new **Import/Export Sheet** component, opened from a new "Import/Export" item in the user dropdown menu (next to Account, Settings).

### Sheet Layout

```
┌─────────────────────────────────┐
│  ╳  Import / Export             │
├─────────────────────────────────┤
│                                 │
│  ┌─ Export ──────────────────┐  │
│  │  Download a ZIP of all    │  │
│  │  your notes, folders, and │  │
│  │  images.                  │  │
│  │                           │  │
│  │  [  Export All Notes  ]   │  │
│  └───────────────────────────┘  │
│                                 │
│  ─── or ───                    │
│                                 │
│  ┌─ Import ──────────────────┐  │
│  │  Select a previously      │  │
│  │  exported ZIP file.       │  │
│  │                           │  │
│  │  [  Import Notes  ]       │  │
│  └───────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

- Export button: starts download immediately on click. Shows spinner during generation.
- Import button: opens a hidden `<input type="file" accept=".zip">`. On file selection, posts to the API.
- On import success: show brief summary toast ("3 folders, 12 notes, 5 images imported").
- On error: show error message inline.

### States

| State | Behavior |
|-------|----------|
| Export idle | Button shows "Export All Notes" |
| Export loading | Button disabled, shows spinner + "Exporting…" |
| Export complete | Browser download triggers automatically |
| Import idle | Button shows "Import Notes" |
| Import selecting | File picker opened |
| Import loading | Button disabled, shows "Importing…" |
| Import complete | Toast with summary |
| Import error | Error message displayed inline |
| Empty export | Button still clickable, exports empty manifest |

## Files Changed

### New Files
- `src/app/api/notes/export/route.ts` — GET handler for ZIP export
- `src/app/api/notes/import/route.ts` — POST handler for ZIP import
- `src/components/ImportExportSheet.tsx` — Import/Export UI sheet
- `src/lib/import.ts` — ZIP parsing, image re-upload, note/folder creation

### Modified Files
- `src/lib/export.ts` — add new `generateExportZip` function (raw HTML + images; keeps existing `convertHtmlToMarkdown` and `generateFrontMatter` for per-note export)
- `src/lib/utils.ts` — add helper to extract image IDs from HTML
- `src/components/NotesSidebar.tsx` — add "Import/Export" to user dropdown menu

## Error Handling

- **Partial import success:** If some notes fail but others succeed, return a summary with a count of failures. No rollback.
- **Corrupt ZIP:** Return 400 with descriptive error.
- **Missing notes.json:** Return 400 — "Invalid export file".
- **Unsupported file type:** Return 400 — "Only .zip files accepted".
- **10MB file size limit** on import.

## Testing

- Unit test for image ID extraction from HTML
- Unit test for HTML rewriting (export: `/api/images/<id>` → `images/<id>.ext`; import: reverse)
- Integration test for export route (verify ZIP contains expected files)
- Integration test for import route (upload ZIP, verify notes/folders/images created)
- Edge case: export with 0 notes (empty manifest)
- Edge case: import with duplicate filenames (should still create both)
- Edge case: import with no images
- Edge case: note with special characters in title

## Open Questions / Future

- Import progress feedback for large imports (currently single button, no progress bar)
- Selective export (choose specific folders) — defer
- Export filename includes user-friendly date format
- Password-protected export ZIP — defer
