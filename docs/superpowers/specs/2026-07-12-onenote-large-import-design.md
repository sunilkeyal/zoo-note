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
   - Create/reuse folder in MongoDB
   - Insert note in MongoDB
3. Update `processedPages` counter
4. Return status

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

## Dependencies

- `@aws-sdk/s3-request-presigner` — for generating presigned R2 upload URLs (add to package.json)

## Files to Modify

| File | Change |
|------|--------|
| `src/app/api/notes/import/onenote/presign/route.ts` | **New** — presigned URL endpoint |
| `src/app/api/notes/import/onenote/confirm/route.ts` | **New** — trigger processing |
| `src/app/api/notes/import/onenote/status/route.ts` | **New** — status + poll-triggered processing |
| `src/app/api/notes/import/onenote/route.ts` | Refactor existing handler into reusable processing functions |
| `src/lib/onenote/import.ts` | Refactor into staged processing (conversion separate from page processing) |
| `src/lib/storage.ts` | Add `getPresignedUploadUrl()` function |
| `src/lib/mongodb.ts` | Add `importJobs` collection + indexes |
| `src/components/ImportExportSheet.tsx` | New async upload flow with progress UI |
| `package.json` | Add `@aws-sdk/s3-request-presigner` |

## Migration / Backward Compatibility

- The existing synchronous import (`POST /api/notes/import/onenote`) remains functional for files ≤ 4MB
- New async path activates for files > 4MB (or can be used for all sizes)
- No data migration needed — this is purely additive
