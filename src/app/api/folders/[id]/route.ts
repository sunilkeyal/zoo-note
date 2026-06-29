import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { ObjectId } from "mongodb"
import { Folder } from "@/types"

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
    return NextResponse.json({ success: false, error: "Invalid folder ID format" }, { status: 400 })
  }

  const db = await connectToDatabase()
  const foldersCollection = db.collection("folders")
  const { name, position } = await request.json()

  if (!name?.trim() && position === undefined) {
    return NextResponse.json({ success: false, error: "At least one field (name or position) is required" }, { status: 400 })
  }

  if (position !== undefined && (typeof position !== 'number' || !Number.isFinite(position))) {
    return NextResponse.json({ success: false, error: "Position must be a finite number" }, { status: 400 })
  }

  const updateFields: Record<string, unknown> = { updatedAt: new Date() }
  if (name?.trim()) updateFields.name = name.trim()
  if (position !== undefined) updateFields.position = position

  const result = await foldersCollection.findOneAndUpdate(
    { _id: objectId, userId: session.user.id },
    { $set: updateFields },
    { returnDocument: "after" }
  )

  if (!result) {
    return NextResponse.json({ success: false, error: "Folder not found" }, { status: 404 })
  }

  const folder: Folder = {
    _id: result._id.toString(),
    name: result.name,
    position: result.position ?? 0,
    createdAt: result.createdAt.toISOString(),
    updatedAt: result.updatedAt.toISOString(),
  }

  return NextResponse.json({ success: true, data: folder })
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
    return NextResponse.json({ success: false, error: "Invalid folder ID format" }, { status: 400 })
  }

  const db = await connectToDatabase()
  const foldersCollection = db.collection("folders")
  const notesCollection = db.collection("notes")
  const now = new Date()

  const folderResult = await foldersCollection.updateOne(
    { _id: objectId, userId: session.user.id },
    { $set: { isDeleted: true, deletedAt: now } }
  )

  if (folderResult.matchedCount === 0) {
    return NextResponse.json({ success: false, error: "Folder not found" }, { status: 404 })
  }

  const notesResult = await notesCollection.updateMany(
    { folderId: id, userId: session.user.id },
    { $set: { isDeleted: true, deletedAt: now } }
  )

  return NextResponse.json({
    success: true,
    data: { deletedFolder: id, softDeletedNotesCount: notesResult.modifiedCount },
  })
}
