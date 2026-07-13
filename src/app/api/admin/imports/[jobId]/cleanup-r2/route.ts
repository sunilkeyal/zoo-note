import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { deleteByPrefix, listByPrefix } from "@/lib/storage"
import { ObjectId } from "mongodb"

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

  const job = await db.collection("importJobs").findOne({ _id: new ObjectId(jobId) })
  if (!job) {
    return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 })
  }

  if (job.status !== "completed") {
    return NextResponse.json(
      { success: false, error: "R2 cleanup is only available for completed imports." },
      { status: 400 }
    )
  }

  if (!job.r2Key) {
    return NextResponse.json({ success: false, error: "Job has no r2Key" }, { status: 400 })
  }

  const r2Prefix = job.r2Key.substring(0, job.r2Key.lastIndexOf("/"))

  try {
    const files = await listByPrefix(r2Prefix)
    await deleteByPrefix(r2Prefix)
    return NextResponse.json({ success: true, r2Prefix, filesDeleted: files.length })
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to clean R2 files" },
      { status: 500 }
    )
  }
}
