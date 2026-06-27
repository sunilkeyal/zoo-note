import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { NoteUpdate } from "@/types"
import { ObjectId } from "mongodb"
import { getBucket } from "@/lib/gridfs"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  let objectId: ObjectId
  try {
    objectId = new ObjectId(id)
  } catch {
    return NextResponse.json({ success: false, error: "Invalid note ID format" }, { status: 400 })
  }

  const db = await connectToDatabase()
  const collection = db.collection("notes")
  const body: NoteUpdate = await request.json()
  const { title, content, folderId, position } = body

  if (title !== undefined && title.length > 200) {
    return NextResponse.json({ success: false, error: "Title is too long (max 200 characters)" }, { status: 400 })
  }

  if (content !== undefined && content.length > 1_000_000) {
    return NextResponse.json({ success: false, error: "Content is too large (max 1MB)" }, { status: 400 })
  }

  const update: Record<string, unknown> = { updatedAt: new Date() }
  if (title !== undefined) update.title = title.trim()
  if (content !== undefined) update.content = content
  if (folderId !== undefined) update.folderId = folderId || null
  if (position !== undefined) update.position = position

  let oldContent: string | undefined
  if (content !== undefined) {
    const oldNote = await collection.findOne(
      { _id: objectId, userId: session.user.id },
      { projection: { content: 1 } }
    )
    oldContent = oldNote?.content
  }

  const result = await collection.findOneAndUpdate(
    { _id: objectId, userId: session.user.id },
    { $set: update },
    { returnDocument: "after" }
  )

  if (!result) {
    return NextResponse.json({ success: false, error: "Note not found" }, { status: 404 })
  }

  if (oldContent !== undefined) {
    const imageIdRegex = /\/api\/images\/([a-f0-9]+)/g
    const oldIds = new Set(
      (oldContent.match(imageIdRegex) || []).map((m) => m.split("/").pop()!)
    )
    const newIds = new Set(
      (content!.match(imageIdRegex) || []).map((m) => m.split("/").pop()!)
    )
    const orphanIds = [...oldIds].filter((id) => !newIds.has(id))
    if (orphanIds.length > 0) {
      const bucket = await getBucket()
      await Promise.allSettled(orphanIds.map((id) => bucket.delete(new ObjectId(id))))
    }
  }

  const note = {
    _id: result._id.toString(),
    title: result.title,
    content: result.content || "",
    folderId: result.folderId || undefined,
    position: result.position ?? 0,
    createdAt: result.createdAt.toISOString(),
    updatedAt: result.updatedAt.toISOString(),
  }

  return NextResponse.json({ success: true, data: note })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  let objectId: ObjectId
  try {
    objectId = new ObjectId(id)
  } catch {
    return NextResponse.json({ success: false, error: "Invalid note ID format" }, { status: 400 })
  }

  const db = await connectToDatabase()
  const collection = db.collection("notes")

  const result = await collection.updateOne(
    { _id: objectId, userId: session.user.id },
    { $set: { isDeleted: true, deletedAt: new Date() } }
  )

  if (result.matchedCount === 0) {
    return NextResponse.json({ success: false, error: "Note not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
