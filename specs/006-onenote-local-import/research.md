# Phase 0 Research: OneNote Import — Local Storage Support

**Branch**: `006-onenote-local-import` | **Date**: 2026-07-22

---

## 1. Existing Architecture Analysis

### R2 Import Flow (current)

```
[Client] → POST /presign {filename, fileSize}
              ↓ getPresignedUploadUrl() → R2 presigned PUT URL + jobId
         → PUT {presignedUrl} (file bytes directly to R2)
         → POST /confirm {jobId}
              ↓ storageReadRaw(job.r2Key) → R2
              ↓ WASM conversion to tmpDir, storageSaveRaw(key, data) → R2
              ↓ job.status = "processing", manifest stored in DB
         → poll GET /status?jobId=…
              ↓ storageReadRaw(htmlKey) per page → R2
              ↓ create notes + import images → GridFS
              ↓ deleteByPrefix(prefix) on completion → R2 cleanup
```

### Root Cause of Local Failure

| Step | Problem | Severity |
|------|---------|----------|
| `presign` route | `getPresignedUploadUrl()` throws `"Presigned URLs require R2"` | **Blocker** |
| `storageSaveRaw` (local path) | delegates to `localSave()` → writes to `public/uploads/` | Security + wrong semantics |
| `storageReadRaw` (local path) | delegates to `localRead()` → reads from `public/uploads/` | Coupled to above |
| `deleteByPrefix` (local path) | explicit no-op, so temp files never cleaned up | Resource leak |
| `convertAndUploadToR2` | uses `storageSaveRaw` internally; would "work" but go to public dir | Dependent on above |
| `processPagesBatch` | uses `storageReadRaw`; would "work" after above fix | Dependent on above |

### What Already Works Unchanged
- `convertOneNote()` WASM step: writes to `os.tmpdir()`, no cloud dependency
- `processImages()` (base64): fully in-memory
- `processSvgNodes()`: fully in-memory
- `saveImage()` / GridFS image storage: no cloud dependency
- MongoDB job tracking: no cloud dependency
- `/cancel` and `/cleanup` routes: already guarded by job ownership check

---

## 2. Architecture Decision

### Decision: Dedicated Local Temp Dir for Raw Storage

**Chosen**: Route all raw import artefacts (source file + converted HTML/images) to a
dedicated local temp directory tree: `{os.tmpdir()}/zoo-note-imports/{key}`.

**Rationale**:
- Zero change to the manifest key format (keys stay relative strings like `imports/{jobId}/…`)
- Zero change to `convertAndUploadToR2` function signature or batch-processing logic
- Keeps temp files out of `public/uploads/` (not publicly served by Next.js)
- `deleteByPrefix` maps directly to recursive `rm -rf` of the prefix subtree
- Single implementation point (`storage.ts`) impacts all affected routes uniformly

**Alternatives Rejected**:

| Alternative | Rejected Because |
|-------------|-----------------|
| Reuse `public/uploads/` for temp files | Temp HTML/image artefacts would be publicly accessible via Next.js static serving |
| Store temp files as base64 in MongoDB | GridFS-backed blobs are the right tool; MongoDB documents have a 16 MB BSON limit |
| Skip batch processing for local (run sync) | Sync approach ties up the server for full conversion duration; larger files timeout |

---

## 3. Upload Flow for Local Storage

### Problem
For R2, the client uploads the file directly to a presigned URL (client → R2, bypassing the server).
For local, the server must receive the file body — there is no presigned URL concept.

### Decision: New `/upload` endpoint + client detects `localUpload` flag

The presign endpoint returns a discriminated response:
- **R2**: `{ jobId, uploadUrl, r2Key }` — client PUTs to `uploadUrl`
- **Local**: `{ jobId, localUpload: true }` — client POSTs file to `/upload?jobId=…`

A new `POST /api/notes/import/onenote/upload` endpoint:
- Accepts multipart `file` field + `jobId` query param
- Validates job ownership
- Writes file to `localSaveRaw(job.r2Key, buffer)`
- Advances job status from `pending` → `uploading`
- Returns `{ success: true }`

Client (existing import component) branches on `data.localUpload`.

**Alternative rejected**: Merge presign + upload into one call (would require sending the full file body to `/presign`, changing its contract and breaking R2 clients).

---

## 4. Temp Directory Layout (Local)

```
{os.tmpdir()}/
└── zoo-note-imports/
    └── imports/
        └── {jobId}/
            ├── source.onepkg          ← written by /upload route
            └── converted/
                ├── Section Name/
                │   ├── page1.html
                │   └── image1.png
                └── Section Name.html  ← ToC file
```

`deleteByPrefix("imports/{jobId}")` → `rm -rf {os.tmpdir()}/zoo-note-imports/imports/{jobId}`

---

## 5. File Size Constraint

50 MB matches the existing R2 limit and is enforced in the presign route. For local, the same
limit is enforced at upload time in the new `/upload` route. No change to the max size.

---

## 6. Concurrency / Cleanup Safety

- The existing one-active-import-per-user check (`getActiveImportJob`) applies to local too — no change.
- Stale-job timeout handlers in the status route call `cleanupImportData`, which calls `deleteByPrefix`.
  Once `deleteByPrefix` works for local, stale cleanup is automatic.
- On server restart, orphaned temp dirs remain in `os.tmpdir()`. These are handled by the OS temp dir
  lifecycle (OS typically clears on reboot). A future enhancement could scan and purge on startup.

---

## 7. Security Considerations

- Temp files in `os.tmpdir()` are not served by Next.js (no public exposure).
- The `/upload` endpoint validates session and job ownership before writing.
- File names are taken from `job.r2Key` (controlled by the presign route, not user input) — no path traversal risk.
- The 50 MB limit is enforced before reading the file body.

---

## 8. Testing Strategy

- Unit tests: `localSaveRaw`, `localReadRaw`, `localDeleteByPrefix` in isolation
- Integration tests: mock `STORAGE_PROVIDER=local`, run presign → upload → confirm → status poll cycle
- Regression tests: existing R2 tests must pass unchanged
- Cleanup tests: verify temp dir is removed after `deleteByPrefix` and after stale-timeout

---

## 9. Resolved Clarifications

All spec NEEDS CLARIFICATION items were pre-resolved in the spec. No open items remain.
