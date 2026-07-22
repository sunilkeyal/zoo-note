import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { getPresignedUploadUrl, isR2 } from "@/lib/storage"
import { createImportJob, getActiveImportJob, updateImportJob } from "@/lib/onenote/import-job"

const MAX_IMPORT_SIZE = 50 * 1024 * 1024

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { filename, fileSize } = body as { filename?: string; fileSize?: number }

  if (!filename || !fileSize) {
    return NextResponse.json(
      { success: false, error: "filename and fileSize are required" },
      { status: 400 }
    )
  }

  const ext = filename.toLowerCase().split(".").pop()
  if (ext !== "onepkg" && ext !== "one") {
    return NextResponse.json(
      { success: false, error: "Unsupported file format. Accepted: .onepkg, .one" },
      { status: 400 }
    )
  }

  if (fileSize > MAX_IMPORT_SIZE) {
    return NextResponse.json(
      {
        success: false,
        error:
          "File too large (max 50MB). For larger notebooks, configure STORAGE_PROVIDER=r2 or split the notebook into smaller sections.",
      },
      { status: 400 }
    )
  }

  const db = await connectToDatabase()
  const userId = session.user.id as string

  // Check for active import job
  const active = await getActiveImportJob(db, userId)
  if (active) {
    return NextResponse.json(
      { success: false, error: "An import is already in progress. Please wait for it to complete." },
      { status: 409 }
    )
  }

  const jobId = crypto.randomUUID()
  const r2Key = `imports/${jobId}/source.${ext}`

  const job = await createImportJob(db, {
    userId,
    filename,
    fileSize,
    r2Key,
  })

  await updateImportJob(db, job._id.toHexString(), { status: "uploading" })

  // Local storage: skip presigned URL — client will POST directly to /upload.
  if (!isR2()) {
    if (process.env.VERCEL) {
      console.warn(
        "[onenote-import] STORAGE_PROVIDER=local on Vercel: temp files may not persist across function invocations."
      )
    }
    return NextResponse.json({
      success: true,
      jobId: job._id.toHexString(),
      localUpload: true,
    })
  }

  try {
    const uploadUrl = await getPresignedUploadUrl(r2Key, "application/octet-stream", 900)

    return NextResponse.json({
      success: true,
      jobId: job._id.toHexString(),
      uploadUrl,
      r2Key,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate upload URL"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
