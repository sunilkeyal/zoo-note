import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { storageDelete, isR2 } from "@/lib/storage"
import { ObjectId, Db } from "mongodb"

async function getAllNoteImageIds(db: Db): Promise<Set<string>> {
  const allNotes = await db.collection("notes").find({}).project({ content: 1 }).toArray()
  const ids = new Set<string>()
  for (const note of allNotes) {
    const content = note.content as string || ""
    const matches = content.matchAll(/\/api\/images\/([a-f0-9]+)/g)
    for (const m of matches) {
      ids.add(m[1])
    }
  }
  return ids
}

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const db = await connectToDatabase()

  const totalNotes = await db.collection("notes").countDocuments()
  const activeNotes = await db.collection("notes").countDocuments({ isDeleted: { $ne: true } })
  const trashedNotes = totalNotes - activeNotes

  const referencedImageIds = await getAllNoteImageIds(db)
  const allImages = await db.collection("images").find({}).project({ _id: 1, length: 1, filename: 1, "metadata.userId": 1 }).toArray()

  const orphanedImages: { id: string; size: number; filename: string; userId?: string }[] = []
  for (const img of allImages) {
    if (!referencedImageIds.has(img._id.toString())) {
      orphanedImages.push({
        id: img._id.toString(),
        size: img.length as number,
        filename: img.filename as string,
        userId: img.metadata?.userId as string | undefined,
      })
    }
  }

  const orphanedImageBytes = orphanedImages.reduce((sum, o) => sum + o.size, 0)

  const notesByUser = await db.collection("notes").aggregate([
    { $group: { _id: "$userId", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]).toArray()

  let r2ObjectCount = 0
  if (isR2()) {
    const { listByPrefix } = await import("@/lib/storage")
    const objects = await listByPrefix("")
    r2ObjectCount = objects.length
  }

  return NextResponse.json({
    success: true,
    data: {
      summary: {
        totalNotes,
        activeNotes,
        trashedNotes,
        totalImages: allImages.length,
        orphanedImages: orphanedImages.length,
        orphanedImageBytes,
        r2ObjectCount,
      },
      notesByUser: notesByUser.map((u) => ({ userId: u._id as string, count: u.count as number })),
      orphanedImages: orphanedImages.slice(0, 100),
    },
  })
}

export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const url = new URL(request.url)
  const mode = url.searchParams.get("mode") || "all"

  const db = await connectToDatabase()

  let deleteFilter: Record<string, unknown> = {}
  if (mode === "byUser") {
    const userId = url.searchParams.get("userId")
    if (userId) deleteFilter = { userId }
  }
  // mode "all" and "withoutFolder" both delete everything

  const notesResult = await db.collection("notes").deleteMany(deleteFilter)
  const foldersResult = await db.collection("folders").deleteMany(deleteFilter)

  const referencedImageIds = await getAllNoteImageIds(db)
  const allImages = await db.collection("images").find({}).project({ _id: 1, length: 1 }).toArray()
  const orphanedImageIds: ObjectId[] = []
  let freedImageBytes = 0
  for (const img of allImages) {
    if (!referencedImageIds.has(img._id.toString())) {
      orphanedImageIds.push(img._id)
      freedImageBytes += img.length as number
    }
  }

  let deletedImages = 0
  if (orphanedImageIds.length > 0) {
    await Promise.allSettled(orphanedImageIds.map((id) => storageDelete(id.toHexString()).catch(() => {})))
    const imgResult = await db.collection("images").deleteMany({ _id: { $in: orphanedImageIds } })
    deletedImages = imgResult.deletedCount
  }

  let r2ObjectsDeleted = 0
  if (isR2() && mode === "all") {
    const { S3Client, ListObjectsV2Command, DeleteObjectCommand } = await import("@aws-sdk/client-s3")
    const s3 = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    })
    const bucket = process.env.R2_BUCKET_NAME!
    let continuationToken: string | undefined
    do {
      const res = await s3.send(new ListObjectsV2Command({
        Bucket: bucket,
        MaxKeys: 1000,
        ContinuationToken: continuationToken,
      }))
      const keys = (res.Contents ?? []).map((o) => o.Key!).filter(Boolean)
      r2ObjectsDeleted += keys.length
      if (keys.length > 0) {
        await Promise.all(keys.map((key) => s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))))
      }
      continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined
    } while (continuationToken)
  }

  return NextResponse.json({
    success: true,
    data: {
      deletedNotes: notesResult.deletedCount,
      deletedFolders: foldersResult.deletedCount,
      deletedImages,
      freedImageBytes,
      r2ObjectsDeleted,
    },
  })
}
