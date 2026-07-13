# Stuck Import Recovery Design

## Problem

OneNote import jobs can get stuck in `uploading`, `converting`, or `pending` states with no recovery mechanism. A stuck job permanently blocks all future imports for the user because `getActiveImportJob()` treats any non-terminal status as an active import.

**Root cause**: The stale timeout in `status/route.ts` only checks `job.status === "processing"`. Jobs in earlier states (`pending`, `uploading`, `converting`) have no timeout. Additionally, there is no user-facing cancel mechanism and admin cleanup only works for `failed` jobs.

## Solution

Four changes to prevent and recover from stuck imports:

### 1. Stale Timeout for All Non-Terminal States

**File**: `src/app/api/notes/import/onenote/status/route.ts`

Extend the stale timeout check to cover all non-terminal states with state-appropriate timeouts:

| State | Timeout | Reasoning |
|-------|---------|-----------|
| `pending` | 5 min | Should transition to `uploading` almost immediately |
| `uploading` | 5 min | Upload + confirm should happen within minutes |
| `converting` | 10 min | WASM conversion can take time for large files |
| `processing` | 10 min | Already exists |

When a stale job is detected:
1. Call `cleanupImportData()` to delete any created notes/folders/images/R2 files
2. Set status to `failed` with a descriptive error message (e.g., "Import stuck in uploading state — no progress for 5 minutes")
3. Return the `failed` status to the client

Replace the single `STALE_TIMEOUT_MS` constant with a lookup:

```typescript
const STALE_TIMEOUTS: Record<string, number> = {
  pending: 5 * 60 * 1000,
  uploading: 5 * 60 * 1000,
  converting: 10 * 60 * 1000,
  processing: 10 * 60 * 1000,
}
```

### 2. User-Facing Cancel Button + API

#### New API Endpoint

**File**: `src/app/api/notes/import/onenote/cancel/route.ts`

`POST /api/notes/import/onenote/cancel`

- Accepts `{ jobId: string }` in the request body
- Authenticates the user via `auth()`
- Fetches the job via `getImportJob(db, jobId, userId)` — verifies ownership
- Calls `cleanupImportData()` to delete any created data
- Deletes the job document from `importJobs`
- Returns `{ success: true }`

If the job is already `completed` or `failed`, return 400 with an appropriate message.

#### UI Changes

**File**: `src/components/ImportExportSheet.tsx`

When the import job is in an active state (`uploading`, `converting`, `processing`), show a "Cancel Import" button below the progress indicator. On click:
1. Call `POST /api/notes/import/onenote/cancel` with the jobId
2. Call `resetJob()` from the import context
3. Show a toast confirming the cancellation

#### Context Changes

**File**: `src/contexts/ImportContext.tsx`

Add a `cancelImport` function to the context that:
1. Calls the cancel API endpoint
2. Stops polling
3. Clears localStorage
4. Resets state to idle

Expose `cancelImport` through the context value alongside `startImport` and `resetJob`.

### 3. Admin Force-Cleanup for Any State

**File**: `src/app/api/admin/imports/[jobId]/cleanup/route.ts`

Remove the restriction that only `failed` jobs can be cleaned up. Allow cleanup on any status except `completed`. For active states (`uploading`, `converting`, `processing`), the cleanup should:
1. Delete created data (notes, folders, images, R2 files) — same as current logic
2. Delete the job document
3. Return the deletion counts

**File**: `src/app/admin/imports/page.tsx`

Update `canCleanup()` to return `true` for any status except `completed`:

```typescript
const canCleanup = (status: string) => status !== "completed"
```

### 4. Periodic Cleanup Cron (Optional — Vercel Pro Only)

**File**: `vercel.json` (create if not exists)

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-stale-imports",
      "schedule": "0 * * * *"
    }
  ]
}
```

**File**: `src/app/api/cron/cleanup-stale-imports/route.ts`

A Vercel cron job that runs hourly:
1. Verify the request is from Vercel cron (check `Authorization` header against `CRON_SECRET` env var)
2. Find all jobs in non-terminal states (`pending`, `uploading`, `converting`, `processing`) where `updatedAt` is older than 30 minutes
3. For each stale job, clean up data and set status to `failed`
4. Return a summary of cleaned jobs

This is a safety net for cases where the user never returns to trigger the status endpoint's stale check.

## Files to Modify

| File | Change |
|------|--------|
| `src/app/api/notes/import/onenote/status/route.ts` | Extend stale timeout to all non-terminal states |
| `src/app/api/notes/import/onenote/cancel/route.ts` | **New** — cancel API endpoint |
| `src/contexts/ImportContext.tsx` | Add `cancelImport` function |
| `src/components/ImportExportSheet.tsx` | Add cancel button UI |
| `src/app/api/admin/imports/[jobId]/cleanup/route.ts` | Allow cleanup for any non-completed status |
| `src/app/admin/imports/page.tsx` | Update `canCleanup()` logic |
| `vercel.json` | **New** — cron schedule config |
| `src/app/api/cron/cleanup-stale-imports/route.ts` | **New** — periodic cleanup endpoint |

## Out of Scope

- Retry logic for failed imports (separate feature)
- Import progress webhooks or notifications
- Changes to the WASM conversion or batch processing logic
