import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { getImportJob } from "@/lib/onenote/import-job"
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
