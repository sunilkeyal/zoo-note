import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { ObjectId } from "mongodb"

const COLLECTION = "importJobs"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const db = await connectToDatabase()
  const collection = db.collection(COLLECTION)

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")))
  const status = searchParams.get("status")
  const sortField = searchParams.get("sortField") || "createdAt"
  const sortDir = searchParams.get("sortDir") || "desc"

  const filter: Record<string, any> = {}
  if (status && ["failed", "completed", "processing", "pending", "uploading", "converting"].includes(status)) {
    filter.status = status
  }

  const total = await collection.countDocuments(filter)
  const skip = (page - 1) * limit
  const safeSortDir = sortDir === "asc" ? 1 : -1

  const jobs = await collection
    .find(filter)
    .sort({ [sortField]: safeSortDir })
    .skip(skip)
    .limit(limit)
    .toArray()

  // Resolve userIds to user emails
  const userIds = [...new Set(jobs.map((job: any) => job.userId).filter(Boolean))]
  const usersCollection = db.collection("users")
  const users = await usersCollection
    .find({ _id: { $in: userIds.map((id) => new ObjectId(id)) } }, { projection: { email: 1, displayName: 1 } })
    .toArray()
  const userMap = new Map(users.map((u: any) => [u._id.toString(), { email: u.email, displayName: u.displayName }]))

  const data = jobs.map((job: any) => ({
    _id: job._id.toString(),
    userId: job.userId,
    user: userMap.get(job.userId) || null,
    filename: job.filename,
    fileSize: job.fileSize,
    status: job.status,
    progress: job.progress,
    result: job.result || null,
    r2Key: job.r2Key || null,
    error: job.error || null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  }))

  return NextResponse.json({
    success: true,
    data: {
      jobs: data,
      total,
      page,
      limit,
    },
  })
}
