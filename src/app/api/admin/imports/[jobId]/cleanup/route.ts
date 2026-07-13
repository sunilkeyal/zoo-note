import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { cleanupImportData } from "@/lib/onenote/cleanup"

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

  // Clean up all created data using shared utility
  const result = await cleanupImportData(db, job._id.toString(), job.r2Key)

  // Delete the job document itself
  await db.collection("importJobs").deleteOne({ _id: job._id })

  return NextResponse.json({
    success: true,
    data: result,
  })
}
