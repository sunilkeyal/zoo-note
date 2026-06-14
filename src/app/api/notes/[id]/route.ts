import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { NoteUpdate } from "@/types"
import { ObjectId } from "mongodb"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const update: Record<string, unknown> = { updatedAt: new Date() }
  if (title !== undefined) update.title = title.trim()
  if (content !== undefined) update.content = content
  if (folderId !== undefined) update.folderId = folderId || null
  if (position !== undefined) update.position = position

  const result = await collection.findOneAndUpdate(
    { _id: objectId },
    { $set: update },
    { returnDocument: "after" }
  )

  if (!result) {
    return NextResponse.json({ success: false, error: "Note not found" }, { status: 404 })
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
  const { id } = await params

  let objectId: ObjectId
  try {
    objectId = new ObjectId(id)
  } catch {
    return NextResponse.json({ success: false, error: "Invalid note ID format" }, { status: 400 })
  }

  const db = await connectToDatabase()
  const collection = db.collection("notes")
  const result = await collection.deleteOne({ _id: objectId })

  if (result.deletedCount === 0) {
    return NextResponse.json({ success: false, error: "Note not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
