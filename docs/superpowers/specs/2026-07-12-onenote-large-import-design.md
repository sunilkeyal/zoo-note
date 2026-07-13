# OneNote Large Import — Design Spec

## Problem

The current OneNote import has a 4MB file size limit because the entire file is POSTed to a Vercel serverless function, which has a ~4.5MB body limit on the Hobby plan. Users with larger notebooks cannot import them.

## Goal

Support importing OneNote notebooks up to **50MB** while staying on Vercel Hobby (4.5MB body limit, 60s function timeout, 1GB /tmp).

## Approach

**Presigned R2 upload + multi-stage async processing.**

The client uploads the file directly to Cloudflare R2 via a presigned URL (bypasses Vercel entirely), then the server processes the file across multiple serverless function invocations to stay within the 60s timeout.

## Architecture

```
┌─────────┐     presigned URL      ┌─────────────┐
│  Client  │ ────────────────────>  │  Cloudflare  │
│ (browser)│                        │     R2       │
└────┬─────┘                        └──────┬──────┘
     │                                     │
     │ POST /confirm                       │
     v                                     │
┌─────────────┐    GET / read              │
│   Vercel    │ ──────────────────────────┘
│  Function   │
│  (stage 1)  │  WASM convert → write HTML back to R2
└──────┬──────┘
       │ update job status
       v
┌─────────────┐
│   MongoDB   │  importJobs collection
└──────┬──────┘
       │ stage 2-N: poll-triggered batch processing
       v
┌─────────────┐
│  Vercel     │  Read HTML from R2 → compress images → write notes to DB
│  Function   │
│  (stage 2-N)│
└─────────────┘
```

## New API Endpoints

### `POST /api/notes/import/onenote/presign`

Returns a presigned R2 PUT URL for direct upload.

**Request:**
```json
{ "filename": "my-notebook.onepkg", "fileSize": 52428800 }
```

**Response:**
```json
{
  "success": true,
  "jobId": "abc123",
  "uploadUrl": "https://r2.example.com/imports/abc123/source.onepkg?X-Amz-...",
  "r2Key": "imports/abc123/source.onepkg"
}
```

**Validations:**
- fileSize ≤ 50MB
- No other active import job for this user (max 1 concurrent)
- Presigned URL expires in 15 minutes

### `POST /api/notes/import/onenote/confirm`

Client calls after upload completes. Starts Stage 1 processing.

**Request:**
```json
{ "jobId": "abc123" }
```

**Response:**
```json
{ "success": true, "status": "converting" }
```

### `GET /api/notes/import/onenote/status?jobId=xxx`

Returns job status. Also triggers the next processing batch if the job is in `processing` state (poll-triggered processing).

**Response:**
```json
{
  "status": "processing",
  "progress": {
    "totalPages": 47,
    "processedPages": 12,
    "currentStage": "Importing page 12/47..."
  }
}
```

**On completion:**
```json
{
  "status": "completed",
  "result": {
    "foldersCreated": 5,
    "notesImported": 47,
    "imagesImported": 128
  }
}
```

## Processing Pipeline

### Stage 1 — WASM Conversion (single invocation)

1. Download .one/.onepkg from R2 to `/tmp/onenote-{jobId}/`
2. Run existing WASM converter (`src/lib/onenote/convert.ts`) → produces HTML files + image files in temp dir
3. Upload all output files to R2 under `imports/{jobId}/converted/`
4. Store file manifest in job record (list of HTML files + image files with paths)
5. Update job status to `converted`
6. Clean up /tmp

### Stage 2-N — Page Processing (batched via poll trigger)

Triggered by the client's polling request to `/status`. Each poll request processes one batch before returning.

**Per batch (~10 pages):**
1. Read unprocessed pages from manifest
2. For each page:
   - Download HTML from R2
   - Run existing pipeline: `extractPageTitle`, `extractBodyContent`, `stripFontStyles`, `normalizeOneNoteTables`
   - Process local images: compress via sharp, save to R2 storage
   - Process inline base64 images: decode, compress, save to R2 storage
   - Process SVG nodes: save to R2 storage
   - Create/reuse folder in MongoDB (tagged with `jobId`)
   - Insert note in MongoDB (tagged with `jobId`)
3. Update `processedPages` counter
4. Accumulate `foldersCreated`, `notesImported`, `imagesImported` across batches (cumulative, not per-batch)
5. Return status

### Completion

- Delete `imports/{jobId}/converted/` from R2
- Delete `imports/{jobId}/source.*` from R2
- Update status to `completed`
- Job record auto-deleted after 7 days (TTL index)

## Data Model

### `importJobs` Collection

```typescript
{
  _id: ObjectId,
  userId: string,              // owner (from auth)
  filename: string,            // original filename
  fileSize: number,            // bytes
  r2Key: string,               // R2 path to source file
  status: "pending" | "uploading" | "converting" | "processing" | "completed" | "failed",
  progress: {
    totalPages: number,        // total pages found after conversion
    processedPages: number,    // pages completed so far
    currentStage: string,      // human-readable stage description
  },
  manifest?: {                 // populated after Stage 1 conversion
    htmlFiles: string[],       // R2 keys of converted HTML files
    imageFiles: string[],      // R2 keys of extracted image files
    sections: string[],        // section names (from subdirectories)
  },
  error?: string,              // error message if failed
  result?: {                   // populated on completion
    foldersCreated: number,
    notesImported: number,
    imagesImported: number,
  },
  createdAt: Date,
  updatedAt: Date,
}
```

**Indexes:**
- `{ userId: 1, status: 1 }` — find active jobs for a user
- `{ createdAt: 1 }` with TTL 7 days — auto-cleanup

### JobId Tagging on Created Documents

Every document created during an import (folders, notes, images) is tagged with the import job's ID:

```typescript
// Folders
{ name: "...", userId: "...", jobId: "abc123", createdAt: ..., updatedAt: ... }

// Notes
{ title: "...", content: "...", folderId: "...", userId: "...", jobId: "abc123", ... }

// Images (GridFS metadata)
{ userId: "...", originalName: "...", uploadedAt: ..., jobId: "abc123" }
```

This enables cleanup of all data created by a specific import job via a single `deleteMany({ jobId })` query per collection.

## Client-Side Changes

### ImportExportSheet.tsx

**Updated flow:**
1. File selection → validate extension + size ≤ 50MB
2. Call `/api/notes/import/onenote/presign` → get presigned URL + jobId
3. Upload to R2 via `XMLHttpRequest` (for progress events) or `fetch` with `ReadableStream`
4. Call `/api/notes/import/onenote/confirm` with jobId
5. Poll `/api/notes/import/onenote/status?jobId=xxx` every 3-5 seconds
6. Display progress: upload bar → "Converting notebook..." → "Importing page X/Y..." → success

**UX states:**
- Upload progress bar (0-100%)
- Processing spinner with stage text
- "Import in progress — you can close this window" notice
- Success: show counts (folders, notes, images) + auto-refresh notes list
- Error: show message with job ID

### Size limit constants

- Remove `MAX_UPLOAD_SIZE = 4 * 1024 * 1024` from client
- Add `MAX_IMPORT_SIZE = 50 * 1024 * 1024`

## Error Handling

| Error | Handling |
|-------|----------|
| File > 50MB | Client-side rejection before any API call |
| Presign request fails | Show error, suggest trying again |
| R2 upload fails | Retry button (presigned URL still valid) |
| WASM conversion fails | Mark job as failed, show error |
| Page processing fails (single page) | Skip page, log error, continue with remaining pages |
| All pages fail | Mark job as failed |
| Polling timeout (no update in 10 min) | Show "taking longer than expected" warning, continue polling |
| Function timeout mid-batch | Partial progress saved, next poll picks up where it left off |

## Safety Limits

- **Max file size:** 50MB
- **Max concurrent jobs per user:** 1
- **Presigned URL expiry:** 15 minutes
- **Job stale timeout:** 10 minutes without progress update → failed
- **Batch size:** ~10 pages per processing invocation (tuned to stay under 60s)
- **Job TTL:** 7 days auto-cleanup

## Import Cleanup System

### Auto-Cleanup on Failure

When an import fails (server error or stale timeout), the system automatically deletes all data created by that import:

1. `deleteMany({ jobId })` on `notes` collection
2. `deleteMany({ jobId })` on `folders` collection
3. Delete GridFS images where `metadata.jobId = jobId`
4. `deleteByPrefix(r2Prefix)` for R2 zip + extracted files

This runs in the status route's error catch block and stale timeout handler, wrapped in `.catch(() => {})` to avoid cascading failures.

### Manual Cleanup (Admin)

Failed imports can also be cleaned up manually via the admin dashboard. The cleanup endpoint only allows cleanup on jobs with `status: "failed"` — it rejects active or completed jobs.

## Admin Dashboard — Import Jobs

### API Endpoints

**`GET /api/admin/imports`** — Paginated list of all import jobs.

- Query params: `page`, `limit`, `status` (filter), `sortField`, `sortDir`
- Resolves `userId` to user email/displayName from the `users` collection
- Returns: `{ jobs, total, page, limit }`
- Admin auth enforced server-side

**`POST /api/admin/imports/[jobId]/cleanup`** — Clean up all data for a specific failed import.

- Validates job exists and `status === "failed"`
- Deletes: notes by jobId, folders by jobId, GridFS images by jobId, R2 files by r2Prefix, importJobs document
- Returns: `{ notesDeleted, foldersDeleted, imagesDeleted }`
- Admin auth enforced server-side

### Admin Page (`/admin/imports`)

Table view following existing admin page patterns:

- **Columns:** Filename, User (email), Status (colored badge), Result (notes/folders/images), Error, Created (sortable), Action
- **Sortable headers:** Filename, Status, Created — click to toggle asc/desc with arrow indicator
- **Status filter:** All / Failed / Completed / Processing
- **Pagination:** Trash-style with rows-per-page selector (10/20/50/100), numbered page buttons with ellipsis
- **Cleanup button:** Shown only on failed jobs, opens confirmation dialog showing what will be deleted
- **Admin sidebar nav item:** "Import Jobs" with Upload icon, added to `adminItems` array

## Global Import Context

### `ImportContext` (`src/contexts/ImportContext.tsx`)

Provides global import state management across page navigations and refreshes:

- **State:** `job` (jobId, status, filename, progress, result, error)
- **Methods:** `startImport(file)`, `resetJob()`
- **localStorage persistence:** Job ID saved to `zoo-note-import-job` on upload, cleared on completion/failure/reset. On page reload, the context fetches current status and resumes polling.
- **Polling:** 3-second interval via `setInterval`, stopped on terminal states (completed/failed)
- **Auto-refresh:** Calls `fetchNotes()` and `fetchFolders()` from NoteContext on import completion so the sidebar updates without browser refresh

### Sonner Toast Notifications

`sonner` library provides global toast notifications for import lifecycle:

- Upload progress percentage
- "Converting notebook..."
- Processing stage text
- "Import complete!" with counts
- "Import failed" with error message

`<Toaster />` is added to `src/app/providers.tsx` inside the `SessionProvider`.

## Dependencies

- `@aws-sdk/s3-request-presigner` — for generating presigned R2 upload URLs
- `sonner` — toast notifications for import status

## Files to Modify/Create

| File | Change |
|------|--------|
| `src/app/api/notes/import/onenote/presign/route.ts` | **New** — presigned URL endpoint |
| `src/app/api/notes/import/onenote/confirm/route.ts` | **New** — trigger processing |
| `src/app/api/notes/import/onenote/status/route.ts` | **New** — status + poll-triggered processing + auto-cleanup on failure |
| `src/app/api/notes/import/onenote/route.ts` | Raise limit to 50MB for backward compat |
| `src/lib/onenote/import.ts` | Staged processing: `convertAndUploadToR2`, `processPagesBatch`, `processLocalImagesFromR2` with jobId tagging |
| `src/lib/onenote/import-job.ts` | **New** — job CRUD operations |
| `src/lib/storage.ts` | Add `getPresignedUploadUrl`, `deleteByPrefix`, `storageSaveRaw`, `storageReadRaw` |
| `src/lib/gridfs.ts` | Add `jobId` to image metadata type |
| `src/lib/mongodb.ts` | Add `importJobs` collection indexes |
| `src/contexts/ImportContext.tsx` | **New** — global import state with localStorage persistence |
| `src/app/providers.tsx` | Add `<Toaster />` and `<ImportProvider>` |
| `src/components/ImportExportSheet.tsx` | Use `useImport()` context, move compatibility warning above button |
| `src/app/api/admin/imports/route.ts` | **New** — admin imports list endpoint |
| `src/app/api/admin/imports/[jobId]/cleanup/route.ts` | **New** — admin cleanup endpoint |
| `src/app/admin/imports/page.tsx` | **New** — admin imports page |
| `src/components/NotesSidebar.tsx` | Add Import Jobs nav item to admin sidebar |
| `src/__tests__/onenote-large-import.test.ts` | Unit tests for format detection |
| `package.json` | Add `@aws-sdk/s3-request-presigner`, `sonner` |

## Migration / Backward Compatibility

- The existing synchronous import (`POST /api/notes/import/onenote`) remains functional for files ≤ 50MB
- New async path is used by the UI for all file sizes
- No data migration needed — this is purely additive
- Existing imports (pre-jobId) remain in the database without a `jobId` field; cleanup only affects imports created after the jobId tagging feature
