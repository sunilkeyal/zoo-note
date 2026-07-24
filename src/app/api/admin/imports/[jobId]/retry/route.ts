import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { ObjectId } from "mongodb"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const { jobId } = await params
  const db = await connectToDatabase()

  const job = await db.collection("importJobs").findOne({ _id: new ObjectId(jobId) })
  if (!job) {
    return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 })
  }

  if (job.status !== "failed") {
    return NextResponse.json(
      { success: false, error: "Only failed imports can be retried." },
      { status: 400 }
    )
  }

  if (!job.manifest) {
    return NextResponse.json(
      { success: false, error: "Job has no manifest — conversion data is missing. Use recovery instead." },
      { status: 400 }
    )
  }

  // Reset the job to processing state so the status poller will pick it up
  await db.collection("importJobs").updateOne(
    { _id: job._id },
    {
      $set: {
        status: "processing",
        error: undefined,
        batchLockedAt: null,
        updatedAt: new Date(),
      },
    }
  )

  return NextResponse.json({ success: true, jobId: job._id.toString() })
}
