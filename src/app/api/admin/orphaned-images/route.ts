import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { storageDelete } from "@/lib/storage"
import { ObjectId } from "mongodb"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const db = await connectToDatabase()

  const allImages = await db.collection("images")
    .find({})
    .project({ _id: 1, length: 1, filename: 1, "metadata.userId": 1 })
    .toArray()

  // Collect all image IDs referenced by notes in a single pass
  const allImageIds = allImages.map((img) => img._id.toString())

  const notesWithImages = await db.collection("notes")
    .find({ content: { $regex: "api/images" }, isDeleted: { $ne: true } })
    .project({ content: 1 })
    .toArray()

  const referencedIds = new Set<string>()
  for (const note of notesWithImages) {
    const content = note.content as string || ""
    for (const id of allImageIds) {
      if (content.includes(id)) {
        referencedIds.add(id)
      }
    }
  }

  const orphaned: { id: string; size: number; filename: string; userId?: string }[] = []
  for (const img of allImages) {
    if (!referencedIds.has(img._id.toString())) {
      orphaned.push({
        id: img._id.toString(),
        size: img.length as number,
        filename: img.filename as string,
        userId: img.metadata?.userId as string | undefined,
      })
    }
  }

  const totalBytes = orphaned.reduce((sum, o) => sum + o.size, 0)

  return NextResponse.json({
    success: true,
    data: {
      orphaned,
      orphanedCount: orphaned.length,
      orphanedBytes: totalBytes,
      referencedCount: referencedIds.size,
      totalImages: allImages.length,
    },
  })
}

export async function DELETE() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const db = await connectToDatabase()

  const allImages = await db.collection("images")
    .find({})
    .project({ _id: 1, length: 1 })
    .toArray()

  if (allImages.length === 0) {
    return NextResponse.json({ success: true, data: { deletedCount: 0, freedBytes: 0 } })
  }

  // Collect all image IDs referenced by notes in a single pass
  const allImageIds = allImages.map((img) => img._id.toString())

  const notesWithImages = await db.collection("notes")
    .find({ content: { $regex: "api/images" }, isDeleted: { $ne: true } })
    .project({ content: 1 })
    .toArray()

  const referencedIds = new Set<string>()
  for (const note of notesWithImages) {
    const content = note.content as string || ""
    for (const id of allImageIds) {
      if (content.includes(id)) {
        referencedIds.add(id)
      }
    }
  }

  // Collect orphaned image IDs
  const orphanedIds: ObjectId[] = []
  let freedBytes = 0
  for (const img of allImages) {
    if (!referencedIds.has(img._id.toString())) {
      orphanedIds.push(img._id)
      freedBytes += img.length as number
    }
  }

  if (orphanedIds.length === 0) {
    return NextResponse.json({ success: true, data: { deletedCount: 0, freedBytes: 0 } })
  }

  // Bulk delete from storage (R2/local) — fire and forget, don't block DB cleanup
  const storagePromises = orphanedIds.map((id) =>
    storageDelete(id.toHexString()).catch(() => {})
  )
  await Promise.allSettled(storagePromises)

  // Bulk delete from images collection
  const result = await db.collection("images").deleteMany({ _id: { $in: orphanedIds } })

  return NextResponse.json({
    success: true,
    data: { deletedCount: result.deletedCount, freedBytes },
  })
}
