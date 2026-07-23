# API Contract Changes: OneNote Import 200 MB Limit

This feature changes only the size-validation threshold and associated messages on the
existing OneNote import endpoints. Request/response shapes are otherwise unchanged. See
[006-onenote-local-import/contracts/api.md](../../006-onenote-local-import/contracts/api.md)
for the full baseline contract.

## POST /api/notes/import/onenote/presign (R2 path)

**Request** (unchanged shape):

```json
{ "filename": "my-notebook.onepkg", "fileSize": 123456789 }
```

**Validation delta**:

- `fileSize` must be ≤ **209,715,200** (200 MB) — previously ≤ 52,428,800 (50 MB)

**Error (413/400) delta** — when `fileSize` exceeds the limit:

```json
{
  "success": false,
  "error": "File too large (max 200MB). For larger notebooks, configure STORAGE_PROVIDER=r2 or split the notebook into smaller sections."
}
```

(Status code unchanged: 400.)

## POST /api/notes/import/onenote/upload?jobId=... (local path)

**Validation delta**:

- `file` size must be ≤ **200 MB** (previously 50 MB)

**Error delta** — when the file exceeds the limit (status 400):

```json
{
  "success": false,
  "error": "File too large (max 200MB). For larger notebooks, configure STORAGE_PROVIDER=r2 or split the notebook into smaller sections."
}
```

## POST /api/notes/import/onenote (legacy synchronous path)

**Validation delta**:

- `file` size must be ≤ **200 MB** (previously 50 MB)
- Error message corrected from the current inaccurate "max 4MB" to name the 200 MB limit (status 400)

## Client contract (ImportContext + ImportExportSheet)

- Client-side pre-check rejects files > 200 MB before upload with toast description:
  `"Maximum import size is 200MB. For larger notebooks, configure R2 storage or split the notebook into smaller sections."`
- Import sheet copy reads "Max 200MB."

## Acceptance boundary

| Input size | Expected result |
|------------|-----------------|
| 209,715,200 bytes (exactly 200 MB) | Accepted |
| 209,715,201 bytes (200 MB + 1) | Rejected, 400, message names 200MB |
| 50–200 MB valid `.onepkg`/`.one` | Accepted, import proceeds via async flow |
</content>
