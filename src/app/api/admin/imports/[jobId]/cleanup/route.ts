import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { deleteByPrefix } from "@/lib/storage"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const { jobId } = await params
  const db = await connectToDatabase()

  // Find the job
  const job = await db.collection("importJobs").findOne({ _id: new (await import("mongodb")).ObjectId(jobId) })
  if (!job) {
    return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 })
  }

  // Allow cleanup on any status except completed
  if (job.status === "completed") {
    return NextResponse.json({
      success: false,
      error: "Cannot cleanup a completed import.",
    }, { status: 409 })
  }

  // Set status to failed first to stop any active polling
  await db.collection("importJobs").updateOne(
    { _id: job._id },
    { $set: { status: "failed", error: "Cleaned up by admin", updatedAt: new Date() } }
  )

  const jobIdStr = job._id.toString()

  // Delete notes created by this import
  const notesResult = await db.collection("notes").deleteMany({ jobId: jobIdStr })

  // Delete folders created by this import
  const foldersResult = await db.collection("folders").deleteMany({ jobId: jobIdStr })

  // Delete images (GridFS) created by this import
  const imagesCollection = db.collection("images")
  const imageDocs = await imagesCollection.find(
    { "metadata.jobId": jobIdStr },
    { projection: { _id: 1 } }
  ).toArray()
  if (imageDocs.length > 0) {
    const imageIds = imageDocs.map((doc) => doc._id)
    await imagesCollection.deleteMany({ _id: { $in: imageIds } })
    await db.collection("gridfs.chunks").deleteMany({ files_id: { $in: imageIds } })
  }

  // Delete R2 files (zip + extracted)
  if (job.r2Key) {
    const r2Prefix = job.r2Key.substring(0, job.r2Key.lastIndexOf("/"))
    await deleteByPrefix(r2Prefix).catch(() => {})
  }

  // Delete the job document itself
  await db.collection("importJobs").deleteOne({ _id: job._id })

  return NextResponse.json({
    success: true,
    data: {
      notesDeleted: notesResult.deletedCount,
      foldersDeleted: foldersResult.deletedCount,
      imagesDeleted: imageDocs.length,
    },
  })
}
