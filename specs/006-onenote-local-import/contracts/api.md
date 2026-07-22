# API Contracts: OneNote Import — Local Storage Support

**Branch**: `006-onenote-local-import` | **Date**: 2026-07-22

> Only the endpoints that change or are added are documented here.
> Existing endpoints (`/cancel`, `/status` GET, `/confirm`) have unchanged contracts.

---

## Modified: `POST /api/notes/import/onenote/presign`

Returns a discriminated response based on `STORAGE_PROVIDER`.

### Request (unchanged)

```http
POST /api/notes/import/onenote/presign
Content-Type: application/json
Authorization: session cookie (NextAuth)

{
  "filename": "MyNotebook.onepkg",
  "fileSize": 12345678
}
```

**Constraints** (unchanged):
- `filename` must end with `.one` or `.onepkg`
- `fileSize` must be ≤ 52,428,800 (50 MB)
- One active import per user — 409 if another import is in progress

### Response — R2 provider (unchanged)

```json
{
  "success": true,
  "jobId": "64f3a...",
  "uploadUrl": "https://…r2.cloudflarestorage.com/…?X-Amz-Signature=…",
  "r2Key": "imports/64f3a.../source.onepkg"
}
```

### Response — Local provider (new)

```json
{
  "success": true,
  "jobId": "64f3a...",
  "localUpload": true
}
```

`uploadUrl` and `r2Key` are absent. The client MUST POST the file to `/upload` when `localUpload` is `true`.

### Error Responses (unchanged)

| Status | Condition |
|--------|-----------|
| 400 | Missing/invalid `filename` or `fileSize` |
| 400 | Unsupported file extension |
| 400 | File too large |
| 401 | Not authenticated |
| 409 | Another import already in progress |
| 500 | Failed to create job or generate URL |

---

## New: `POST /api/notes/import/onenote/upload`

Receives the source file for local-storage imports.
Only reachable when `STORAGE_PROVIDER=local`; returns 400 otherwise.

### Request

```http
POST /api/notes/import/onenote/upload?jobId=64f3a...
Content-Type: multipart/form-data
Authorization: session cookie (NextAuth)

--boundary
Content-Disposition: form-data; name="file"; filename="MyNotebook.onepkg"
Content-Type: application/octet-stream

[binary file data]
--boundary--
```

**Query params**:
- `jobId` (required) — the job ID returned from `/presign`

**Form fields**:
- `file` (required) — the OneNote file, up to 50 MB

### Response

```json
{
  "success": true
}
```

On success, job status advances from `uploading` → stays `uploading` (confirm call triggers the next transition).

### Error Responses

| Status | Condition |
|--------|-----------|
| 400 | `STORAGE_PROVIDER` is not `local` — body: `{ "success": false, "error": "Local upload not supported when STORAGE_PROVIDER=r2" }` |
| 400 | Missing `jobId` query param |
| 400 | Missing `file` field |
| 400 | File too large (> 50 MB) |
| 401 | Not authenticated |
| 404 | Job not found or not owned by user |
| 409 | Job not in `uploading` state |
| 500 | Failed to write file to local storage |

---

## Storage Layer — New Internal Functions

These are not HTTP endpoints but are part of the internal API contract for `src/lib/storage.ts`.

### `localSaveRaw(key: string, data: Buffer): Promise<void>`

Writes `data` to `{BASE_LOCAL_IMPORT_DIR}/{key}`, creating parent directories as needed.

### `localReadRaw(key: string): Promise<Buffer | null>`

Reads from `{BASE_LOCAL_IMPORT_DIR}/{key}`. Returns `null` if the file does not exist.

### `localDeleteByPrefix(prefix: string): Promise<void>`

Recursively removes `{BASE_LOCAL_IMPORT_DIR}/{prefix}` if it exists. No-op if already gone.

### Updated `storageSaveRaw` dispatch

```
STORAGE_PROVIDER=r2    → r2Save(key, data, contentType)     (unchanged)
STORAGE_PROVIDER=local → localSaveRaw(key, data)             (changed: was localSave to public/uploads/)
```

### Updated `storageReadRaw` dispatch

```
STORAGE_PROVIDER=r2    → r2Read(key)        (unchanged)
STORAGE_PROVIDER=local → localReadRaw(key)  (changed: was localRead from public/uploads/)
```

### Updated `deleteByPrefix` dispatch

```
STORAGE_PROVIDER=r2    → r2DeleteByPrefix(prefix)      (unchanged)
STORAGE_PROVIDER=local → localDeleteByPrefix(prefix)   (changed: was no-op)
```
