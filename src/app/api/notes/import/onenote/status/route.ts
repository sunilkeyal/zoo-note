import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { getImportJob, updateImportJob } from "@/lib/onenote/import-job"
import { processPagesBatch } from "@/lib/onenote/import"
import { deleteByPrefix } from "@/lib/storage"

const BATCH_SIZE = 10
const STALE_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes

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

  // Check for stale jobs
  const elapsed = Date.now() - job.updatedAt.getTime()
  if (job.status === "processing" && elapsed > STALE_TIMEOUT_MS) {
    await updateImportJob(db, jobId, {
      status: "failed",
      error: "Import timed out (no progress for 10 minutes)",
    })
    return NextResponse.json({
      status: "failed",
      error: "Import timed out",
    })
  }

  // Poll-triggered processing: if job is in "processing" state, process a batch
  if (job.status === "processing" && job.manifest) {
    try {
      const batchResult = await processPagesBatch(
        db,
        userId,
        job.manifest,
        job.progress.processedPages,
        BATCH_SIZE
      )

      const newProcessed = job.progress.processedPages + batchResult.pagesProcessed

      if (batchResult.done) {
        // Clean up temporary R2 files
        const r2Prefix = job.r2Key.substring(0, job.r2Key.lastIndexOf("/"))
        await deleteByPrefix(r2Prefix).catch(() => {})

        await updateImportJob(db, jobId, {
          status: "completed",
          progress: {
            totalPages: job.progress.totalPages,
            processedPages: newProcessed,
            currentStage: "Import complete!",
          },
          result: {
            foldersCreated: batchResult.foldersCreated,
            notesImported: batchResult.notesImported,
            imagesImported: batchResult.imagesImported,
          },
        })
      } else {
        await updateImportJob(db, jobId, {
          progress: {
            totalPages: job.progress.totalPages,
            processedPages: newProcessed,
            currentStage: `Importing page ${newProcessed}/${job.progress.totalPages}...`,
          },
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Processing failed"
      await updateImportJob(db, jobId, { status: "failed", error: message })
      return NextResponse.json({ status: "failed", error: message })
    }
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
