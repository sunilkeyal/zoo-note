# OneNote Import Design

## Overview

Import Microsoft OneNote notebooks (`.onepkg`) and section files (`.one`) into the app as folders and notes. Uses `@joplin/onenote-converter` (Rust → WebAssembly) to parse OneNote's binary format and output HTML.

## Supported Formats

| Format | What it is | Maps to |
|--------|-----------|---------|
| `.onepkg` | Cabinet archive containing `.one` section files + `.onetoc2` table of contents | Notebook → multiple folders + notes |
| `.one` | OneNote section file (binary, MS-ONESTORE format) | Section → one folder + notes (pages) |

Detection is by file extension + magic bytes: `.onepkg` Cabinet header, `.one` GUID header `7B5C52E4-8CD8-4DA7-AEB1-5378D02996D3`.

## Version Compatibility

The underlying converter (`@joplin/onenote-converter`, based on `onenote.rs`) supports:

| OneNote Version | `.one` | `.onepkg` | Notes |
|----------------|--------|-----------|-------|
| OneNote 2016+ (Windows desktop) | ✅ | ✅ | Best compatibility |
| OneNote for Microsoft 365 (Windows) | ✅ | ✅ | Same format as 2016 |
| OneDrive / SharePoint download | ✅ | N/A | FSSHTTPB format, well-tested |
| OneNote for Windows 10 | ⚠️ Likely | ❌ | Cloud-synced only, no local `.onepkg` |
| OneNote for Mac | ⚠️ Maybe | ❌ | `.onepkg` not supported on Mac at all |
| OneNote 2007 | ❌ | ❌ | Older binary format, not supported |
| OneNote 2003 | ❌ | ❌ | Not supported |

The UI should show a small info banner: *"Best compatibility with OneNote 2016+ on Windows. Older versions and Mac exports may not work."*

## Pipeline

```
Upload (.onepkg or .one)
  ↓
Format detection
  ↓
If .onepkg → extract .one files + read .onetoc2 for section ordering
  ↓
For each .one file:
  ├── Parse with @joplin/onenote-converter → HTML per page
  ├── Extract embedded images from HTML
  ├── Upload images to GridFS → rewrite <img> src
  ├── Create folder (section name)
  └── Create notes (pages with content)
  ↓
Return import result summary
```

## Data Mapping

| OneNote concept | App concept | Notes |
|----------------|-------------|-------|
| Notebook (`.onepkg`) | Implicit root | No app-level notebook concept; folders are top-level |
| Section (`.one` file) | **Folder** | Folder named after the section filename (without extension) |
| Page | **Note** | Note title = page title, content = HTML from converter |
| Page hierarchy (subpages) | Flat notes in folder | Subpages imported as sibling notes, not nested |
| Embedded images | GridFS images | Extracted, uploaded, src rewritten |
| Text formatting | HTML | Preserved by converter |
| Tables, lists, checkboxes | HTML | Preserved by converter |
| Drawings / ink | SVG images | Extracted as SVG files by converter, uploaded to GridFS |
| Section order (`.onetoc2`) | Folder positions | Applied from `.onetoc2` if available, alphabetical otherwise |

## File Extraction

### .onepkg

The `.onepkg` format is a Microsoft Cabinet archive. Extraction approach (in priority order):

1. Try renaming to `.zip` and using `adm-zip` (already in dependencies) — often works for `.onepkg` files
2. Fall back to spawning `7-Zip` CLI if available
3. If neither works, return a clear error asking the user to extract manually

After extraction, look for:
- `.one` files → each is a section
- `.onetoc2` file → contains section ordering metadata

### .one

Single file, passed directly to the converter. No extraction needed.

## Converter Integration

`@joplin/onenote-converter` exports a `convert` function that takes a `.one` file path and returns HTML.

The converter:
- Returns one HTML string per page (with section metadata)
- Embeds images as base64 data URIs or SVG nodes
- Preserves text formatting, tables, lists, checkboxes
- Extracts ink drawings as SVG

Post-processing steps after conversion:
1. Parse HTML output
2. Extract embedded images (base64 data URIs and SVG nodes)
3. Upload images to GridFS with `sharp` for format conversion if needed
4. Rewrite image references in HTML from data URIs to `/api/images/<id>`
5. Convert SVG nodes to `<img>` tags pointing to GridFS
6. Store clean HTML as note content

## API

### `POST /api/notes/import/onenote`

Multipart form-data, field: `file`

**Request:**
- `file`: `.onepkg` or `.one` file (max 50MB)

**Response (200):**
```json
{
  "success": true,
  "foldersCreated": 3,
  "notesImported": 15,
  "imagesImported": 8,
  "errors": []
}
```

**Response (400):**
```json
{
  "error": "Unsupported file format. Accepted: .onepkg, .one"
}
```

## UI

Extend the existing `ImportExportSheet.tsx` to support OneNote files alongside the current ZIP import.

### Sheet Changes

- Add a "OneNote" section below the existing ZIP import section
- Or add a tab/segmented control: "ZIP Export" | "Import Notes" | "Import OneNote"
- File input accepts `.onepkg` and `.one` extensions
- On import: show spinner + progress state
- On success: toast with summary ("3 folders, 15 notes imported")
- On error: inline error message

## Files Changed

### New Files
- `src/lib/onenote-import.ts` — OneNote parsing, extraction, conversion pipeline
- `src/app/api/notes/import/onenote/route.ts` — API route for OneNote import

### Modified Files
- `src/components/ImportExportSheet.tsx` — add OneNote import UI
- `package.json` — add `@joplin/onenote-converter` dependency

## Error Handling

- **Unsupported format:** Return 400 with accepted formats list
- **Corrupt .onepkg:** Return 400 — "Invalid notebook file"
- **Corrupt .one:** Return 400 — skipping that section, accumulate errors
- **Partial success:** If some sections parse but others fail, return partial results with error list. No rollback.
- **Conversion failure per page:** Logged, page skipped, continues to next
- **50MB file size limit** (larger than ZIP import's 10MB since notebooks can be large)

## Testing

- Unit test for `.onepkg` extraction logic
- Unit test for `.one` file detection (magic bytes)
- Integration test for `.one` file import (verify folder + notes created)
- Integration test for `.onepkg` import (verify multiple folders + notes)
- Edge case: `.one` with no pages
- Edge case: `.one` with images/ink drawings
- Edge case: corrupt `.onepkg` (missing `.onetoc2`)
- Edge case: duplicate section names
- Edge case: special characters in page titles

## Open Questions / Future

- Support for OneNote 2007 format (older `.one` versions) — test and add if converter supports it
- Password-protected sections — currently unsupported by the converter
- OneNote page tags/labels — not currently mapped to any app concept
- Nested section groups (notebooks with section group folders) — currently flattened
- Progress reporting for large imports
- Drag-and-drop OneNote files onto the sidebar
