# Import Recovery & Retry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ability to recover failed OneNote imports from R2 converted files and retry failed imports from the admin UI.

**Architecture:** Two new admin endpoints: one to retry a failed import by resetting its status and re-triggering batch processing, and one to recover orphaned R2 data by scanning the bucket for converted files and reconstructing notes. Admin imports page gets a "Retry" button for failed jobs.

**Tech Stack:** Next.js App Router, MongoDB, Cloudflare R2 (S3 API), React, shadcn/ui

---

### Task 1: Add retry endpoint for failed imports

**Files:**
- Create: `src/app/api/admin/imports/[jobId]/retry/route.ts`

- [ ] **Step 1: Create the retry endpoint**

```typescript
import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { ObjectId } from "mongodb"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const { jobId } = await params
  const db = await connectToDatabase()

  const job = await db.collection("importJobs").findOne({ _id: new ObjectId(jobId) })
  if (!job) {
    return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 })
  }

  if (job.status !== "failed") {
    return NextResponse.json(
      { success: false, error: "Only failed imports can be retried." },
      { status: 400 }
    )
  }

  if (!job.manifest) {
    return NextResponse.json(
      { success: false, error: "Job has no manifest — conversion data is missing. Use recovery instead." },
      { status: 400 }
    )
  }

  // Reset the job to processing state so the status poller will pick it up
  await db.collection("importJobs").updateOne(
    { _id: job._id },
    {
      $set: {
        status: "processing",
        error: undefined,
        batchLockedAt: null,
        updatedAt: new Date(),
      },
    }
  )

  return NextResponse.json({ success: true, jobId: job._id.toString() })
}
```

- [ ] **Step 2: Verify the endpoint compiles**

Run: `npx tsc --noEmit src/app/api/admin/imports/[jobId]/retry/route.ts`
Expected: No errors

---

### Task 2: Add recovery endpoint for orphaned R2 data

**Files:**
- Create: `src/app/api/admin/r2/recover/route.ts`
- Modify: `src/lib/onenote/import.ts` (export `processPagesBatch` — already exported)

- [ ] **Step 1: Create the recovery endpoint**

This endpoint scans R2 for converted OneNote files that have no matching import job, and creates notes from them.

```typescript
import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { listByPrefix, storageReadRaw } from "@/lib/storage"
import { processPagesBatch, type ConvertResult } from "@/lib/onenote/import"
import { ObjectId } from "mongodb"
import path from "path"

interface RecoveryResult {
  jobId: string
  notesImported: number
  foldersCreated: number
  imagesImported: number
  errors: string[]
  htmlFilesFound: number
  imageFilesFound: number
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const { prefix, userId } = await request.json() as { prefix?: string; userId?: string }
  if (!prefix || !userId) {
    return NextResponse.json(
      { success: false, error: "prefix and userId are required" },
      { status: 400 }
    )
  }

  // Ensure prefix ends with /
  const normalizedPrefix = prefix.endsWith("/") ? prefix : `${prefix}/`

  const allKeys = await listByPrefix(normalizedPrefix)
  if (allKeys.length === 0) {
    return NextResponse.json(
      { success: false, error: `No files found under prefix: ${normalizedPrefix}` },
      { status: 404 }
    )
  }

  // Separate HTML and image files
  const htmlFiles = allKeys.filter((k) => k.endsWith(".html") && k.includes("/converted/"))
  const imageFiles = allKeys.filter((k) => {
    const ext = path.extname(k).toLowerCase()
    return [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp"].includes(ext) && k.includes("/converted/")
  })

  if (htmlFiles.length === 0) {
    return NextResponse.json(
      { success: false, error: "No converted HTML files found. Files must be under a /converted/ directory." },
      { status: 400 }
    )
  }

  // Derive sections from HTML file paths
  const sections = new Set<string>()
  for (const key of htmlFiles) {
    const afterConverted = key.split("/converted/")[1] || ""
    const slashIdx = afterConverted.indexOf("/")
    if (slashIdx > -1) {
      sections.add(afterConverted.substring(0, slashIdx))
    }
  }

  // Build a synthetic manifest
  const manifest = {
    htmlFiles,
    imageFiles,
    sections: Array.from(sections),
  }

  const db = await connectToDatabase()

  // Create a recovery job record for tracking
  const jobId = new ObjectId()
  await db.collection("importJobs").insertOne({
    _id: jobId,
    userId,
    filename: `[Recovery] ${normalizedPrefix}`,
    fileSize: 0,
    r2Key: `${normalizedPrefix}source.recovery`,
    status: "processing",
    progress: {
      totalPages: htmlFiles.length,
      processedPages: 0,
      currentStage: "Recovering from R2...",
    },
    manifest,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  const BATCH_SIZE = 10
  let processedCount = 0
  const result: RecoveryResult = {
    jobId: jobId.toString(),
    notesImported: 0,
    foldersCreated: 0,
    imagesImported: 0,
    errors: [],
    htmlFilesFound: htmlFiles.length,
    imageFilesFound: imageFiles.length,
  }

  // Process in batches
  while (processedCount < htmlFiles.length) {
    try {
      const batch = await processPagesBatch(
        db,
        userId,
        manifest,
        processedCount,
        BATCH_SIZE,
        jobId.toString()
      )

      result.notesImported += batch.notesImported
      result.foldersCreated += batch.foldersCreated
      result.imagesImported += batch.imagesImported
      result.errors.push(...batch.errors)
      processedCount += batch.pagesProcessed

      // Update progress
      await db.collection("importJobs").updateOne(
        { _id: jobId },
        {
          $set: {
            progress: {
              totalPages: htmlFiles.length,
              processedPages: processedCount,
              currentStage: `Recovered ${processedCount}/${htmlFiles.length} pages...`,
            },
            updatedAt: new Date(),
          },
        }
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : "Batch processing failed"
      result.errors.push(message)
      break
    }
  }

  // Mark job as completed
  await db.collection("importJobs").updateOne(
    { _id: jobId },
    {
      $set: {
        status: result.errors.length > 0 && result.notesImported === 0 ? "failed" : "completed",
        progress: {
          totalPages: htmlFiles.length,
          processedPages: processedCount,
          currentStage: "Recovery complete!",
        },
        result: {
          foldersCreated: result.foldersCreated,
          notesImported: result.notesImported,
          imagesImported: result.imagesImported,
        },
        error: result.errors.length > 0 ? result.errors.join("; ") : undefined,
        updatedAt: new Date(),
      },
    }
  )

  return NextResponse.json({ success: true, data: result })
}
```

- [ ] **Step 2: Verify the endpoint compiles**

Run: `npx tsc --noEmit src/app/api/admin/r2/recover/route.ts`
Expected: No errors

---

### Task 3: Add retry and recovery buttons to admin imports page

**Files:**
- Modify: `src/app/admin/imports/page.tsx`

- [ ] **Step 1: Add retry button and recovery dialog to imports page**

Add the following to the imports page:
1. A "Retry" button in the Action column for failed jobs that have a manifest
2. A "Recover from R2" button in the page header
3. A recovery dialog that asks for an R2 prefix and userId

Key changes to `src/app/admin/imports/page.tsx`:
- Add `retryJob` state and `handleRetry` function
- Add `recoveryOpen` state, `recoveryPrefix`, `recoveryUserId`, `recoveryLoading`, `recoveryResult` states and `handleRecovery` function
- Add Recovery dialog JSX
- Modify the table Action column to show Retry for failed jobs with manifest
- Import `Wrench` and `RotateCcw` icons

- [ ] **Step 2: Verify the page compiles**

Run: `npx tsc --noEmit src/app/admin/imports/page.tsx`
Expected: No errors

---

### Task 4: Add retry button to the existing cleanup-r2 flow for completed jobs

**Files:**
- Modify: `src/app/admin/imports/page.tsx` (already modified in Task 3)

- [ ] **Step 1: Verify all changes work together**

Run: `npm run build`
Expected: Build succeeds with no errors
