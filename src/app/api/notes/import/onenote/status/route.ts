import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { getImportJob, updateImportJob } from "@/lib/onenote/import-job"
import { processPagesBatch } from "@/lib/onenote/import"
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

  // Poll-triggered processing: if job is in "processing" state, process a batch
  if (job.status === "processing" && job.manifest) {
    try {
      const batchResult = await processPagesBatch(
        db,
        userId,
        job.manifest,
        job.progress.processedPages,
        BATCH_SIZE,
        job._id.toString()
      )

      const newProcessed = job.progress.processedPages + batchResult.pagesProcessed

      // Accumulate results across all batches
      const prevResult = job.result
      const cumulativeResult = {
        foldersCreated: (prevResult?.foldersCreated ?? 0) + batchResult.foldersCreated,
        notesImported: (prevResult?.notesImported ?? 0) + batchResult.notesImported,
        imagesImported: (prevResult?.imagesImported ?? 0) + batchResult.imagesImported,
      }

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
          result: cumulativeResult,
        })
      } else {
        await updateImportJob(db, jobId, {
          progress: {
            totalPages: job.progress.totalPages,
            processedPages: newProcessed,
            currentStage: `Importing page ${newProcessed}/${job.progress.totalPages}...`,
          },
          result: cumulativeResult,
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Processing failed"
      await cleanupImportData(db, job._id.toString(), job.r2Key).catch(() => {})
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
