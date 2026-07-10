import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { GridFSBucket, ObjectId } from "mongodb"

export async function DELETE() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const db = await connectToDatabase()
  const bucket = new GridFSBucket(db, { bucketName: "images" })

  // Load all images from GridFS
  const allImages = await db.collection("images.files")
    .find({})
    .project({ _id: 1, length: 1, "metadata.userId": 1 })
    .toArray()

  let deletedCount = 0
  let freedBytes = 0

  for (const img of allImages) {
    const id = img._id.toString()
    const userId = img.metadata?.userId as string | undefined

    // An image is orphaned if no note content references it
    const referenced = await db.collection("notes").countDocuments({
      ...(userId ? { userId } : {}),
      content: { $regex: id },
    })

    if (referenced === 0) {
      try {
        await bucket.delete(new ObjectId(id))
        deletedCount++
        freedBytes += img.length as number
      } catch {
        // Already gone — skip
      }
    }
  }

  return NextResponse.json({
    success: true,
    data: { deletedCount, freedBytes },
  })
}
