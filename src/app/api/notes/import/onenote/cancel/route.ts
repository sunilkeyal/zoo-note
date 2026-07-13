import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { getImportJob } from "@/lib/onenote/import-job"
import { cleanupImportData } from "@/lib/onenote/cleanup"

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

  if (job.status === "completed" || job.status === "failed") {
    return NextResponse.json(
      { success: false, error: `Cannot cancel a ${job.status} import` },
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
