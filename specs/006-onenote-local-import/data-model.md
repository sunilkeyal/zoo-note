# Data Model: OneNote Import — Local Storage Support

**Branch**: `006-onenote-local-import` | **Date**: 2026-07-22

---

## Entities

### ImportJob (existing — no schema change required)

Stored in MongoDB collection `importJobs`.

| Field | Type | Notes |
|-------|------|-------|
| `_id` | `ObjectId` | Auto-generated |
| `userId` | `string` | Owner of the import |
| `filename` | `string` | Original uploaded filename |
| `fileSize` | `number` | Bytes |
| `r2Key` | `string` | **Storage key** — relative path used by both R2 and local providers (e.g. `imports/{jobId}/source.onepkg`). Field name is legacy; semantics are provider-agnostic. |
| `status` | `ImportJobStatus` | `pending \| uploading \| converting \| processing \| completed \| failed` |
| `progress` | `{ totalPages, processedPages, currentStage }` | Updated by each stage |
| `manifest` | `ImportJobManifest?` | Set after conversion; keys are storage keys (R2 or local paths) |
| `error` | `string?` | Set on failure |
| `result` | `{ foldersCreated, notesImported, imagesImported }?` | Cumulative |
| `createdAt` | `Date` | |
| `updatedAt` | `Date` | |

> **No migration needed.** The `r2Key` field stores a relative key string that is interpreted
> by the storage layer. For local deployments the value is the same format; resolution to an
> absolute path happens inside `storage.ts`.

### ImportJobManifest (existing — no change)

Embedded in `ImportJob.manifest`.

| Field | Type | Notes |
|-------|------|-------|
| `htmlFiles` | `string[]` | Storage keys for converted HTML pages |
| `imageFiles` | `string[]` | Storage keys for converted image files |
| `sections` | `string[]` | Section names extracted from the notebook |

---

## State Transitions

```
pending ──upload──▶ uploading ──confirm──▶ converting ──done──▶ processing ──batch──▶ completed
                                                ╰──error──▶ failed
                    ↑                            ↑                ↑
                    └── stale timeout ───────────┴────────────────┘
                        (any state)                            ↓ cleanupImportData()
```

**No changes to state transitions.** Local and R2 paths follow the same lifecycle.

---

## Local Temp Directory Layout

This is not a MongoDB entity — it is a filesystem structure managed by the storage layer.

```
{os.tmpdir()}/zoo-note-imports/   ← BASE_LOCAL_IMPORT_DIR
└── imports/
    └── {jobId}/
        ├── source.{ext}           ← written by /upload route (localSaveRaw)
        └── converted/
            ├── {SectionName}/
            │   ├── {page}.html
            │   └── {image}.{ext}
            └── {SectionName}.html  ← ToC file
```

**Key resolution**: storage key `imports/{jobId}/source.onepkg`
→ absolute path `{os.tmpdir()}/zoo-note-imports/imports/{jobId}/source.onepkg`

**Cleanup**: `deleteByPrefix("imports/{jobId}")` recursively removes
`{os.tmpdir()}/zoo-note-imports/imports/{jobId}/`.

---

## Validation Rules

| Rule | Enforcement Point |
|------|------------------|
| `fileSize` ≤ 50 MB | `/presign` route (R2) and `/upload` route (local) |
| File extension `.one` or `.onepkg` | `/presign` route and `/upload` route |
| One active import per user | `getActiveImportJob()` check in `/presign` route |
| Job ownership | All import routes verify `job.userId === session.user.id` |
