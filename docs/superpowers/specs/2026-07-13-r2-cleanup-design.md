# R2 Import File Cleanup Design

## Problem

After successful OneNote imports, temporary R2 files under `imports/{jobId}/` persist because `deleteByPrefix()` errors are silently swallowed (`.catch(() => {})`). The job still marks as `completed` even if R2 cleanup fails. The admin cleanup endpoint blocks completed jobs (returns 409), leaving no way to clean up orphaned R2 files.

## Goals

1. Allow admins to clean R2 files for completed imports without deleting the import record
2. Provide a sweep mechanism to find and delete orphaned R2 files (files with no matching import job in MongoDB)

## Non-Goals

- Changing the silent error swallowing on `deleteByPrefix()` (separate concern)
- Automatic/orphan cleanup (user is on Vercel Hobby, no cron)
- Cleaning up the local storage provider (no `deleteByPrefix` equivalent exists)

---

## API Endpoints

### 1. `POST /api/admin/imports/[jobId]/cleanup-r2`

Clean R2 files for a completed import job.

**Auth:** Admin only.

**Flow:**
1. Find job by `ObjectId(jobId)` in `importJobs` collection
2. If `job.status !== "completed"`, return 400 — this endpoint is only for completed jobs
3. Derive R2 prefix from `job.r2Key`: `r2Key.substring(0, r2Key.lastIndexOf("/"))`
4. Call `deleteByPrefix(r2Prefix)` — let errors propagate (no `.catch(() => {})`)
5. Return `{ success: true, r2Prefix, filesDeleted: number }`

**Does NOT:** Delete the job document or any MongoDB data. The import was successful; only temporary R2 files are removed.

**Error cases:**
- 401: Unauthorized
- 403: Not admin
- 400: Job not completed
- 500: R2 deletion failed

### 2. `POST /api/admin/r2/sweep`

Sweep orphaned R2 import files — files under `imports/` that have no matching import job in MongoDB.

**Auth:** Admin only.

**Flow:**
1. List all objects under `imports/` prefix in R2 (handle pagination — `ListObjectsV2Command` with `ContinuationToken`)
2. Extract unique jobIds from keys (format: `imports/{jobId}/...`)
3. Query MongoDB `importJobs` for all found jobIds in one query: `find({ _id: { $in: objectIds } })`
4. Identify orphaned jobIds (in R2 but not in MongoDB)
5. For each orphaned jobId, call `deleteByPrefix("imports/{jobId}")`
6. Return `{ success: true, orphanedFound: number, filesDeleted: number, orphanedJobIds: string[] }`

**Does NOT:** Delete any job documents or MongoDB data. Only removes R2 files.

**Error cases:**
- 401: Unauthorized
- 403: Not admin
- 500: R2 listing or deletion failed

---

## Storage Changes

### `src/lib/storage.ts`

Add a new exported function:

```ts
export async function listByPrefix(prefix: string): Promise<string[]> {
  // Lists all object keys under the given prefix
  // Handles pagination for >1000 objects
  // Returns array of full object keys
}
```

This is needed by the sweep endpoint to list all `imports/` objects.

---

## Admin UI Changes

### `src/app/admin/imports/page.tsx`

#### 1. "Clean R2" button for completed jobs

- **Location:** Replace the `—` placeholder for completed jobs (line 284-286)
- **Button:** `<Button variant="outline" size="sm">Clean R2</Button>`
- **Behavior:**
  - Opens a confirmation `Dialog` (reuse existing dialog pattern)
  - Dialog text: "This will delete R2 files for this import. The notes, folders, and images in the database will remain intact."
  - On confirm: `POST /api/admin/imports/{jobId}/cleanup-r2`
  - On success: toast "R2 files cleaned", refresh list
  - On error: toast error message

#### 2. "Sweep Orphans" button in header

- **Location:** In the page header row, next to the status filter (line 178-191)
- **Button:** `<Button variant="outline" size="sm">Sweep Orphaned R2 Files</Button>`
- **Behavior:**
  - Opens a confirmation `Dialog`
  - Dialog text: "This will scan all R2 import files and delete any that don't have a matching import job in the database."
  - On confirm: `POST /api/admin/r2/sweep`
  - On success: toast "Swept {N} orphaned imports, deleted {M} files"
  - No list refresh needed (orphans don't appear in the job list)

---

## Data Flow

```
Admin clicks "Clean R2" on a completed job
  → POST /api/admin/imports/{jobId}/cleanup-r2
  → Find job, verify status === "completed"
  → deleteByPrefix("imports/{jobId}")
  → Return success
  → Toast + refresh list

Admin clicks "Sweep Orphans"
  → POST /api/admin/r2/sweep
  → listByPrefix("imports/") → all R2 keys
  → Group by jobId
  → MongoDB query: which jobIds still exist?
  → Delete R2 files for orphaned jobIds
  → Return report
  → Toast with counts
```

---

## Error Handling

- R2 deletion failures in `cleanup-r2` endpoint propagate to the client (no silent swallowing)
- R2 listing/deletion failures in sweep endpoint propagate to the client
- Both endpoints require admin auth
- Confirmation dialogs prevent accidental actions

## Testing

- Unit test `listByPrefix` with mocked R2 client
- Integration test for `cleanup-r2` endpoint: completed job → R2 files deleted, job remains
- Integration test for `cleanup-r2` endpoint: non-completed job → 400 error
- Integration test for sweep endpoint: mixed orphaned/valid jobs → only orphans deleted
