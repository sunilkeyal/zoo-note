import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { getImportJob, updateImportJob, claimBatchLock, releaseBatchLock, type ImportJobStatus } from "@/lib/onenote/import-job"
import { processPagesBatch } from "@/lib/onenote/import"
import { cleanupImportData } from "@/lib/onenote/cleanup"
import { deleteByPrefix } from "@/lib/storage"

const BATCH_SIZE = 10
const STALE_TIMEOUTS: Partial<Record<ImportJobStatus, number>> = {
  pending: 5 * 60 * 1000,
  uploading: 5 * 60 * 1000,
  converting: 10 * 60 * 1000,
  processing: 10 * 60 * 1000,
}

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const jobId = request.nextUrl.searchParams.get("jobId")
  if (!jobId) {
    return NextResponse.json({ success: false, error: "jobId is required" }, { status: 400 })
  }

  const db = await connectToDatabase()
  const userId = session.user.id as string

  const job = await getImportJob(db, jobId, userId)
  if (!job) {
    return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 })
  }

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

  // Poll-triggered processing: if job is in "processing" state, process a batch.
  // Acquire an atomic per-job lock first so overlapping polls cannot process the
  // same batch concurrently — that would create duplicate notes and duplicate
  // images in storage (R2/local). Only the caller that wins the claim processes.
  if (job.status === "processing" && job.manifest) {
    const locked = await claimBatchLock(db, jobId)
    if (locked && locked.manifest) {
      try {
        const batchResult = await processPagesBatch(
          db,
          userId,
          locked.manifest,
          locked.progress.processedPages,
          BATCH_SIZE,
          locked._id.toString()
        )

        const newProcessed = locked.progress.processedPages + batchResult.pagesProcessed

        // Accumulate results across all batches
        const prevResult = locked.result
        const cumulativeResult = {
          foldersCreated: (prevResult?.foldersCreated ?? 0) + batchResult.foldersCreated,
          notesImported: (prevResult?.notesImported ?? 0) + batchResult.notesImported,
          imagesImported: (prevResult?.imagesImported ?? 0) + batchResult.imagesImported,
        }

        if (batchResult.done) {
          // Clean up temporary R2 files
          const r2Prefix = locked.r2Key.substring(0, locked.r2Key.lastIndexOf("/"))
          await deleteByPrefix(r2Prefix).catch(() => {})

          await releaseBatchLock(db, jobId, {
            status: "completed",
            progress: {
              totalPages: locked.progress.totalPages,
              processedPages: newProcessed,
              currentStage: "Import complete!",
            },
            result: cumulativeResult,
          })
        } else {
          await releaseBatchLock(db, jobId, {
            progress: {
              totalPages: locked.progress.totalPages,
              processedPages: newProcessed,
              currentStage: `Importing page ${newProcessed}/${locked.progress.totalPages}...`,
            },
            result: cumulativeResult,
          })
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Processing failed"
        await cleanupImportData(db, job._id.toString(), job.r2Key).catch(() => {})
        await releaseBatchLock(db, jobId, { status: "failed", error: message })
        return NextResponse.json({ status: "failed", error: message })
      }
    }
    // If not locked, another poll is already processing this batch — fall through
    // and return the current status without doing any work.
  }

  // Return current status
  const updatedJob = await getImportJob(db, jobId, userId)
  if (!updatedJob) {
    return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 })
  }

  return NextResponse.json({
    status: updatedJob.status,
    progress: updatedJob.progress,
    result: updatedJob.result,
    error: updatedJob.error,
  })
}
