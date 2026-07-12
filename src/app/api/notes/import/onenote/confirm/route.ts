import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { getImportJob, updateImportJob } from "@/lib/onenote/import-job"
import { convertAndUploadToR2 } from "@/lib/onenote/import"
import { storageReadRaw } from "@/lib/storage"

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { jobId } = await request.json() as { jobId?: string }
  if (!jobId) {
    return NextResponse.json({ success: false, error: "jobId is required" }, { status: 400 })
  }

  const db = await connectToDatabase()
  const userId = session.user.id as string

  const job = await getImportJob(db, jobId, userId)
  if (!job) {
    return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 })
  }

  if (job.status !== "uploading") {
    return NextResponse.json(
      { success: false, error: `Job is in '${job.status}' state, expected 'uploading'` },
      { status: 400 }
    )
  }

  // Start Stage 1: WASM conversion
  await updateImportJob(db, jobId, {
    status: "converting",
    progress: { totalPages: 0, processedPages: 0, currentStage: "Converting notebook..." },
  })

  try {
    // Read the uploaded file from R2
    const fileData = await storageReadRaw(job.r2Key)
    if (!fileData) {
      throw new Error("Could not read uploaded file from storage")
    }

    const r2Prefix = job.r2Key.substring(0, job.r2Key.lastIndexOf("/"))
    const convertResult = await convertAndUploadToR2(fileData, job.filename, r2Prefix, db)

    // Update job with manifest and move to processing state
    await updateImportJob(db, jobId, {
      status: "processing",
      manifest: convertResult.manifest,
      progress: {
        totalPages: convertResult.totalPages,
        processedPages: 0,
        currentStage: `Converting complete. ${convertResult.totalPages} pages found. Starting import...`,
      },
    })

    return NextResponse.json({ success: true, status: "processing", totalPages: convertResult.totalPages })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Conversion failed"
    await updateImportJob(db, jobId, { status: "failed", error: message })
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
