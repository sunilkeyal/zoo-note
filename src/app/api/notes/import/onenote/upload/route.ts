import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { isR2, storageSaveRaw } from "@/lib/storage"
import { getImportJob } from "@/lib/onenote/import-job"

const MAX_IMPORT_SIZE = 200 * 1024 * 1024

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  // This endpoint is only for local-storage deployments.
  if (isR2()) {
    return NextResponse.json(
      { success: false, error: "Local upload not supported when STORAGE_PROVIDER=r2" },
      { status: 400 }
    )
  }

  const jobId = new URL(request.url).searchParams.get("jobId")
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
      { status: 409 }
    )
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid multipart request" }, { status: 400 })
  }

  const file = formData.get("file") as File | null
  if (!file) {
    return NextResponse.json({ success: false, error: "file field is required" }, { status: 400 })
  }

  if (file.size > MAX_IMPORT_SIZE) {
    return NextResponse.json(
      {
        success: false,
        error:
          "File too large (max 200MB). For larger notebooks, configure STORAGE_PROVIDER=r2 or split the notebook into smaller sections.",
      },
      { status: 400 }
    )
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    await storageSaveRaw(job.r2Key, buffer, "application/octet-stream")
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to write file to local storage" }, { status: 500 })
  }
}
