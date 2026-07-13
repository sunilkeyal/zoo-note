# Stuck Import Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add stale timeouts for all import states, a user-facing cancel button, and admin force-cleanup to prevent and recover from stuck import jobs.

**Architecture:** Extend the existing status endpoint's stale timeout to cover all non-terminal states. Add a new cancel API endpoint that cleans up data and deletes the job. Wire the cancel action through the React context to the UI. Relax admin cleanup restrictions.

**Tech Stack:** Next.js App Router, MongoDB, Cloudflare R2, React Context, shadcn/ui

---

## File Structure

| File | Change |
|------|--------|
| `src/app/api/notes/import/onenote/status/route.ts` | Replace single `STALE_TIMEOUT_MS` with per-state timeouts |
| `src/app/api/notes/import/onenote/cancel/route.ts` | **New** — cancel endpoint |
| `src/contexts/ImportContext.tsx` | Add `cancelImport` to context |
| `src/components/ImportExportSheet.tsx` | Add cancel button during active imports |
| `src/app/api/admin/imports/[jobId]/cleanup/route.ts` | Allow cleanup for any non-completed status |
| `src/app/admin/imports/page.tsx` | Update `canCleanup()` to allow non-completed jobs |

---

### Task 1: Extend Stale Timeout to All Non-Terminal States

**Files:**
- Modify: `src/app/api/notes/import/onenote/status/route.ts:30-64`

- [ ] **Step 1: Replace STALE_TIMEOUT_MS with per-state lookup**

In `src/app/api/notes/import/onenote/status/route.ts`, replace the single constant and the stale check block.

Replace:
```typescript
const STALE_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes
```

With:
```typescript
const STALE_TIMEOUTS: Record<string, number> = {
  pending: 5 * 60 * 1000,
  uploading: 5 * 60 * 1000,
  converting: 10 * 60 * 1000,
  processing: 10 * 60 * 1000,
}
```

- [ ] **Step 2: Update the stale check block**

Replace the existing stale check (lines 52-64):
```typescript
  // Check for stale jobs
  const elapsed = Date.now() - job.updatedAt.getTime()
  if (job.status === "processing" && elapsed > STALE_TIMEOUT_MS) {
    await cleanupImportData(db, job._id.toString(), job.r2Key).catch(() => {})
    await updateImportJob(db, jobId, {
      status: "failed",
      error: "Import timed out (no progress for 10 minutes)",
    })
    return NextResponse.json({
      status: "failed",
      error: "Import timed out",
    })
  }
```

With:
```typescript
  // Check for stale jobs in any non-terminal state
  const elapsed = Date.now() - job.updatedAt.getTime()
  const staleTimeout = STALE_TIMEOUTS[job.status]
  if (staleTimeout && elapsed > staleTimeout) {
    await cleanupImportData(db, job._id.toString(), job.r2Key).catch(() => {})
    const timeoutMinutes = Math.round(staleTimeout / 60000)
    await updateImportJob(db, jobId, {
      status: "failed",
      error: `Import stuck in ${job.status} state — no progress for ${timeoutMinutes} minutes`,
    })
    return NextResponse.json({
      status: "failed",
      error: `Import timed out (stuck in ${job.status})`,
    })
  }
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/notes/import/onenote/status/route.ts
git commit -m "fix: extend stale timeout to all non-terminal import states"
```

---

### Task 2: Create Cancel API Endpoint

**Files:**
- Create: `src/app/api/notes/import/onenote/cancel/route.ts`

- [ ] **Step 1: Create the cancel endpoint**

Create `src/app/api/notes/import/onenote/cancel/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { getImportJob, updateImportJob } from "@/lib/onenote/import-job"
import { deleteByPrefix } from "@/lib/storage"
import type { Db } from "mongodb"

async function cleanupImportData(db: Db, jobId: string, r2Key: string) {
  const notesResult = await db.collection("notes").deleteMany({ jobId })
  const foldersResult = await db.collection("folders").deleteMany({ jobId })
  const imagesCollection = db.collection("images")
  const imageDocs = await imagesCollection
    .find({ "metadata.jobId": jobId }, { projection: { _id: 1 } })
    .toArray()
  if (imageDocs.length > 0) {
    const imageIds = imageDocs.map((doc) => doc._id)
    await imagesCollection.deleteMany({ _id: { $in: imageIds } })
    await db.collection("gridfs.chunks").deleteMany({ files_id: { $in: imageIds } })
  }
  const r2Prefix = r2Key.substring(0, r2Key.lastIndexOf("/"))
  await deleteByPrefix(r2Prefix).catch(() => {})
  return {
    notesDeleted: notesResult.deletedCount,
    foldersDeleted: foldersResult.deletedCount,
    imagesDeleted: imageDocs.length,
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { jobId } = (await request.json()) as { jobId?: string }
  if (!jobId) {
    return NextResponse.json({ success: false, error: "jobId is required" }, { status: 400 })
  }

  const db = await connectToDatabase()
  const userId = session.user.id as string

  const job = await getImportJob(db, jobId, userId)
  if (!job) {
    return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 })
  }

  if (job.status === "completed") {
    return NextResponse.json(
      { success: false, error: "Cannot cancel a completed import" },
      { status: 400 }
    )
  }

  // Clean up any created data
  await cleanupImportData(db, job._id.toString(), job.r2Key).catch(() => {})

  // Delete the job document
  const { ObjectId } = await import("mongodb")
  await db.collection("importJobs").deleteOne({ _id: new ObjectId(jobId) })

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/notes/import/onenote/cancel/route.ts
git commit -m "feat: add cancel import API endpoint"
```

---

### Task 3: Add cancelImport to Import Context

**Files:**
- Modify: `src/contexts/ImportContext.tsx`

- [ ] **Step 1: Update the context value interface**

In `src/contexts/ImportContext.tsx`, add `cancelImport` to the interface (line 32-36):

```typescript
interface ImportContextValue {
  job: ImportJobState
  startImport: (file: File) => Promise<void>
  cancelImport: () => Promise<void>
  resetJob: () => void
}
```

- [ ] **Step 2: Implement cancelImport function**

Add the `cancelImport` callback inside `ImportProvider`, after the `resetJob` definition (after line 319):

```typescript
  const cancelImport = useCallback(async () => {
    const currentJobId = job.jobId
    if (!currentJobId) return

    stopPolling()

    try {
      const res = await fetch("/api/notes/import/onenote/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: currentJobId }),
      })
      const data = await res.json()

      if (data.success) {
        toast.success("Import cancelled")
      } else {
        toast.error("Failed to cancel import", { description: data.error })
      }
    } catch {
      toast.error("Failed to cancel import", { description: "Network error" })
    } finally {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(STORAGE_FILENAME_KEY)
      setJob({
        jobId: null,
        status: "idle",
        filename: null,
        progress: null,
        result: null,
        error: null,
      })
    }
  }, [job.jobId, stopPolling])
```

- [ ] **Step 3: Add cancelImport to the provider value**

Update the provider value (line 322):

```typescript
    <ImportContext.Provider value={{ job, startImport, cancelImport, resetJob }}>
```

- [ ] **Step 4: Commit**

```bash
git add src/contexts/ImportContext.tsx
git commit -m "feat: add cancelImport to import context"
```

---

### Task 4: Add Cancel Button to Import UI

**Files:**
- Modify: `src/components/ImportExportSheet.tsx`

- [ ] **Step 1: Read the current ImportExportSheet to find the right insertion point**

Read `src/components/ImportExportSheet.tsx` to find where the import progress is displayed and where to add the cancel button.

- [ ] **Step 2: Import useImport and add cancel button**

In `src/components/ImportExportSheet.tsx`:

1. Add the `useImport` import if not already present:
```typescript
import { useImport } from "@/contexts/ImportContext"
```

2. Inside the component, destructure `cancelImport` alongside existing imports:
```typescript
const { job, startImport, cancelImport } = useImport()
```

3. Find the section that shows import progress (the area with the progress bar and status text). After the progress display, add a cancel button. The button should only show when `job.status` is one of `"uploading"`, `"converting"`, or `"processing"`:

```tsx
{["uploading", "converting", "processing"].includes(job.status) && (
  <Button
    variant="outline"
    size="sm"
    className="mt-2 w-full"
    onClick={cancelImport}
  >
    Cancel Import
  </Button>
)}
```

Insert this right after the progress bar / stage text display, before any success/error messages.

- [ ] **Step 3: Commit**

```bash
git add src/components/ImportExportSheet.tsx
git commit -m "feat: add cancel button during active imports"
```

---

### Task 5: Allow Admin Cleanup for Any Non-Completed Status

**Files:**
- Modify: `src/app/api/admin/imports/[jobId]/cleanup/route.ts:24-29`
- Modify: `src/app/admin/imports/page.tsx:166-167`

- [ ] **Step 1: Update admin cleanup endpoint status check**

In `src/app/api/admin/imports/[jobId]/cleanup/route.ts`, replace the status check (lines 24-29):

Replace:
```typescript
  // Only allow cleanup on failed jobs
  if (job.status !== "failed") {
    return NextResponse.json({
      success: false,
      error: `Cannot cleanup a job with status "${job.status}". Only failed imports can be cleaned up.`,
    }, { status: 409 })
  }
```

With:
```typescript
  // Allow cleanup on any status except completed
  if (job.status === "completed") {
    return NextResponse.json({
      success: false,
      error: "Cannot cleanup a completed import.",
    }, { status: 409 })
  }
```

- [ ] **Step 2: Update admin UI canCleanup logic**

In `src/app/admin/imports/page.tsx`, replace the `canCleanup` function (line 166-167):

Replace:
```typescript
  const canCleanup = (status: string) =>
    status === "failed"
```

With:
```typescript
  const canCleanup = (status: string) =>
    status !== "completed"
```

- [ ] **Step 3: Update cleanup dialog description**

In the same file, update the dialog description to be more accurate. Replace:
```typescript
            <DialogDescription>
              This will permanently delete all data created by this import. This action cannot be undone.
            </DialogDescription>
```

With:
```typescript
            <DialogDescription>
              This will cancel the import and permanently delete all data created by it. This action cannot be undone.
            </DialogDescription>
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/imports/[jobId]/cleanup/route.ts src/app/admin/imports/page.tsx
git commit -m "feat: allow admin cleanup for any non-completed import status"
```

---

### Task 6: Verify and Lint

- [ ] **Step 1: Run the linter**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 2: Run TypeScript type check**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: resolve lint and type errors"
```
