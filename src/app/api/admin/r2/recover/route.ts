import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { listByPrefix } from "@/lib/storage"
import { processPagesBatch } from "@/lib/onenote/import"
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

async function recoverFromPrefix(
  db: Awaited<ReturnType<typeof connectToDatabase>>,
  userId: string,
  r2Prefix: string,
  filename: string,
  fileSize: number,
  r2Key: string
): Promise<NextResponse> {
  const allKeys = await listByPrefix(r2Prefix)
  if (allKeys.length === 0) {
    return NextResponse.json(
      { success: false, error: `No files found under prefix: ${r2Prefix}. The R2 data may have already been cleaned up.` },
      { status: 404 }
    )
  }

  const htmlFiles = allKeys.filter((k) => k.endsWith(".html") && k.includes("/converted/"))
  const imageFiles = allKeys.filter((k) => {
    const ext = path.extname(k).toLowerCase()
    return [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp"].includes(ext) && k.includes("/converted/")
  })

  if (htmlFiles.length === 0) {
    return NextResponse.json(
      { success: false, error: "No converted HTML files found under /converted/ directory. The conversion may not have completed." },
      { status: 400 }
    )
  }

  const sections = new Set<string>()
  for (const key of htmlFiles) {
    const afterConverted = key.split("/converted/")[1] || ""
    const slashIdx = afterConverted.indexOf("/")
    if (slashIdx > -1) {
      sections.add(afterConverted.substring(0, slashIdx))
    }
  }

  const manifest = {
    htmlFiles,
    imageFiles,
    sections: Array.from(sections),
  }

  const recoveryJobId = new ObjectId()
  await db.collection("importJobs").insertOne({
    _id: recoveryJobId,
    userId,
    filename: `[Recovery] ${filename}`,
    fileSize,
    r2Key,
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
    jobId: recoveryJobId.toString(),
    notesImported: 0,
    foldersCreated: 0,
    imagesImported: 0,
    errors: [],
    htmlFilesFound: htmlFiles.length,
    imageFilesFound: imageFiles.length,
  }

  while (processedCount < htmlFiles.length) {
    try {
      const batch = await processPagesBatch(
        db,
        userId,
        manifest,
        processedCount,
        BATCH_SIZE,
        recoveryJobId.toString()
      )

      result.notesImported += batch.notesImported
      result.foldersCreated += batch.foldersCreated
      result.imagesImported += batch.imagesImported
      result.errors.push(...batch.errors)
      processedCount += batch.pagesProcessed

      await db.collection("importJobs").updateOne(
        { _id: recoveryJobId },
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

  await db.collection("importJobs").updateOne(
    { _id: recoveryJobId },
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

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json() as { jobId?: string; prefix?: string; userId?: string }
  const db = await connectToDatabase()

  // Mode 1: Recover from existing import job
  if (body.jobId) {
    let jobObjectId: ObjectId
    try {
      jobObjectId = new ObjectId(body.jobId)
    } catch {
      return NextResponse.json({ success: false, error: "Invalid jobId format" }, { status: 400 })
    }

    const job = await db.collection("importJobs").findOne({ _id: jobObjectId })
    if (!job) {
      return NextResponse.json({ success: false, error: "Import job not found" }, { status: 404 })
    }

    if (job.status === "completed") {
      return NextResponse.json(
        { success: false, error: "This import already completed successfully." },
        { status: 400 }
      )
    }

    if (!job.r2Key) {
      return NextResponse.json(
        { success: false, error: "Job has no r2Key — cannot locate files in R2." },
        { status: 400 }
      )
    }

    const r2Prefix = job.r2Key.substring(0, job.r2Key.lastIndexOf("/") + 1)
    return recoverFromPrefix(db, job.userId, r2Prefix, job.filename, job.fileSize, job.r2Key)
  }

  // Mode 2: Recover from raw R2 prefix (no job record)
  if (body.prefix && body.userId) {
    let userObjectId: ObjectId
    try {
      userObjectId = new ObjectId(body.userId)
    } catch {
      return NextResponse.json({ success: false, error: "Invalid userId format" }, { status: 400 })
    }

    const user = await db.collection("users").findOne({ _id: userObjectId })
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    const normalizedPrefix = body.prefix.endsWith("/") ? body.prefix : `${body.prefix}/`
    return recoverFromPrefix(db, body.userId, normalizedPrefix, normalizedPrefix, 0, `${normalizedPrefix}source.recovery`)
  }

  return NextResponse.json(
    { success: false, error: "Either jobId or (prefix + userId) is required" },
    { status: 400 }
  )
}
