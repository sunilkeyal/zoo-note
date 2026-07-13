import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { listByPrefix, deleteByPrefix, isR2 } from "@/lib/storage"
import { ObjectId } from "mongodb"

export async function POST() {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  if (!isR2()) {
    return NextResponse.json(
      { success: false, error: "R2 sweep is only available with R2 storage provider." },
      { status: 400 }
    )
  }

  const db = await connectToDatabase()

  // List all objects under imports/ prefix
  const allKeys = await listByPrefix("imports/")
  if (allKeys.length === 0) {
    return NextResponse.json({ success: true, orphanedFound: 0, filesDeleted: 0, orphanedJobIds: [] })
  }

  // Extract unique jobIds from keys (format: imports/{jobId}/...)
  const jobIds = new Set<string>()
  for (const key of allKeys) {
    const parts = key.split("/")
    if (parts.length >= 2 && parts[0] === "imports") {
      jobIds.add(parts[1])
    }
  }

  // Check which jobIds still exist in MongoDB
  const objectIds = Array.from(jobIds)
    .map((id) => {
      try {
        return new ObjectId(id)
      } catch {
        return null
      }
    })
    .filter((id): id is ObjectId => id !== null)

  const existingJobs = await db
    .collection("importJobs")
    .find({ _id: { $in: objectIds } }, { projection: { _id: 1 } })
    .toArray()
  const existingIds = new Set(existingJobs.map((j) => j._id.toString()))

  // Identify orphaned jobIds
  const orphanedJobIds = Array.from(jobIds).filter((id) => !existingIds.has(id))

  // Delete R2 files for each orphaned jobId
  let filesDeleted = 0
  for (const orphanedId of orphanedJobIds) {
    const prefix = `imports/${orphanedId}/`
    const keysToDelete = allKeys.filter((k) => k.startsWith(prefix))
    await deleteByPrefix(prefix)
    filesDeleted += keysToDelete.length
  }

  return NextResponse.json({
    success: true,
    orphanedFound: orphanedJobIds.length,
    filesDeleted,
    orphanedJobIds,
  })
}
