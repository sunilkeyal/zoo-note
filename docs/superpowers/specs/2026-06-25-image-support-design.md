# Image Support for Notes

## Overview

Allow users to insert images into Tiptap editor notes. Images are compressed to ~100 KB, stored in MongoDB GridFS, and served via an API route. Supports three upload methods (toolbar button, paste, drag & drop) and basic resize in the editor.

## Architecture

```
User uploads image → POST /api/upload → sharp compress (~100 KB) → MongoDB GridFS → returns file ID
                                                                    ↓
Note HTML stores <img src="/api/images/[fileId]" width="..." height="..." />
                                                                    ↓
GET /api/images/[fileId] → stream from GridFS with correct Content-Type
```

- Note content (HTML) and image blobs (GridFS) are separate within the same MongoDB
- All API routes require authentication (same session check as existing routes)

## Storage: MongoDB GridFS

- Uses MongoDB driver's `GridFSBucket`
- Collection names: `fs.files`, `fs.chunks` (GridFS convention)
- File metadata stored: `userId`, `originalName`, `mimeType`, `uploadedAt`
- Images are stored at 1200px max dimension, compressed to ~100 KB target via sharp

## Upload Flow

All three methods call the same `uploadImage(file)` helper:

1. Read file as `FormData`
2. POST to `/api/upload`
3. Response returns `{ id, url: "/api/images/[id]" }`
4. Insert `<img src="/api/images/[id]" />` at cursor position

### Toolbar Button
- New "Image" button in `MainArea.tsx` toolbar (lucide-react `Image` icon)
- Click → hidden `<input type="file" accept="image/*">` → upload → insert

### Paste
- Listen to Tiptap `editor.on('paste')`
- If `event.clipboardData.files` contains image types → upload → insert
- Non-image paste passes through normally

### Drag & Drop
- Listen to Tiptap `editor.on('drop')`
- If `event.dataTransfer.files` contains image types → upload → insert
- Non-image drops pass through normally

## Compression

- sharp configured to resize to 1200px max width, then JPEG quality binary-search to ~100 KB
- Original filename and mime type preserved in GridFS metadata
- Compression runs server-side in the API route

## Image Resize in Editor

- Custom NodeView wrapping the image with a React component
- On selection, image gets a blue border with resize handles at all four corners (nw, ne, sw, se)
- Each handle shows the correct cursor (`nw-resize`, `ne-resize`, `sw-resize`, `se-resize`)
- Dragging any handle updates `width` and `height` proportionally based on the natural aspect ratio
- Resize state persisted to note content via HTML `width` and `height` attributes (e.g. `width="400px" height="300px"`)

## Image Drag to Reposition

- Entire image serves as the drag handle via `data-drag-handle` on the container div
- No visible drag icon — clicking anywhere on the image initiates a drag
- Uses ProseMirror's node dragging infrastructure
- After drag completes, `selectNode` callback re-selects the node so resize handles reappear

## API Routes

### POST /api/upload
- Accepts `multipart/form-data` with field `file`
- Validates: file present, is image type, authenticated session
- Compresses with sharp to ~100 KB at 1200px max width
- Stores in GridFS with metadata `{ userId, originalName, mimeType, uploadedAt }`
- Returns `{ success: true, data: { id, url: "/api/images/[id]" } }` (status 201)
- Returns `{ success: false, error }` on failure (status 400/401)

### GET /api/images/[id]
- Validates `id` as a valid GridFS ObjectId
- Fetches from GridFS, streams with correct `Content-Type` header
- Returns 404 if not found
- No auth check (images are served by ID — obscure enough for a personal tool; can add auth if needed)
- Must be excluded from Next.js auth middleware so Puppeteer can fetch images during PDF export

## PDF Export Image Support

Images in notes are stored with relative URLs (`/api/images/<id>`). During PDF export:

1. **URL rewriting:** `resolveRelativeImages()` rewrites `src="/api/images/..."` to `src="<origin>/api/images/..."` using the origin of the export request
2. **Auth bypass:** The middleware must exclude `/api/images` routes so Puppeteer's unauthenticated headless browser can fetch images
3. **Loading wait:** After setting HTML content via `page.setContent`, the code waits for all `<img>` elements to finish loading (or error) before generating the PDF
4. **Stretch prevention:** CSS `img { max-width: 100%; height: auto; }` prevents vertical stretching when explicit `width`/`height` attributes are constrained by the narrower PDF page
5. **Headless mode:** Uses `headless: true` (new headless) with `--window-position=-9999,-9999` to prevent the Chromium window from appearing on screen

## Middleware

- Next.js auth middleware excludes `api/images` from authentication checks
- This enables both the editor (authenticated browser) and PDF export (unauthenticated Puppeteer) to load images

## Orphan Cleanup

When a note is saved via `PUT /api/notes/[id]`:
- Extract all `/api/images/` references from the new content
- Compare against previously stored image IDs for that note
- Delete any GridFS files that are no longer referenced

A separate field `imageIds: string[]` is added to the Note document to track current image references.

## Dependencies to Install

- `@tiptap/extension-image` — separate npm package for Tiptap
- `sharp` — add as direct project dependency

## Files to Create/Modify

### New files:
- `src/app/api/upload/route.ts` — image upload endpoint
- `src/app/api/images/[id]/route.ts` — image serve endpoint
- `src/lib/gridfs.ts` — GridFS helper utilities
- `src/extensions/ImageNode.ts` — custom Tiptap Node extension for images
- `src/components/ImageNodeView.tsx` — React NodeView component (resize + drag handle)

### Modified files:
- `src/components/MainArea.tsx` — add image toolbar button, paste/drop handlers, register Image extension
- `src/app/api/notes/[id]/route.ts` — orphan cleanup on update
- `src/types/index.ts` — add `imageIds` to Note type if needed internally
- `package.json` — add `@tiptap/extension-image` and `sharp` as dependencies
