import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { Folder } from "@/types"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let objectId: ObjectId
  try {
    objectId = new ObjectId(id)
  } catch {
    return NextResponse.json({ success: false, error: "Invalid folder ID format" }, { status: 400 })
  }

  const db = await connectToDatabase()
  const foldersCollection = db.collection("folders")
  const { name } = await request.json()

  if (!name || !name.trim()) {
    return NextResponse.json({ success: false, error: "Folder name is required" }, { status: 400 })
  }

  const result = await foldersCollection.findOneAndUpdate(
    { _id: objectId },
    { $set: { name: name.trim(), updatedAt: new Date() } },
    { returnDocument: "after" }
  )

  if (!result) {
    return NextResponse.json({ success: false, error: "Folder not found" }, { status: 404 })
  }

  const folder: Folder = {
    _id: result._id.toString(),
    name: result.name,
    createdAt: result.createdAt.toISOString(),
    updatedAt: result.updatedAt.toISOString(),
  }

  return NextResponse.json({ success: true, data: folder })
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
    return NextResponse.json({ success: false, error: "Invalid folder ID format" }, { status: 400 })
  }

  const db = await connectToDatabase()
  const foldersCollection = db.collection("folders")
  const notesCollection = db.collection("notes")

  const deleteResult = await foldersCollection.deleteOne({ _id: objectId })

  if (deleteResult.deletedCount === 0) {
    return NextResponse.json({ success: false, error: "Folder not found" }, { status: 404 })
  }

  const notesDelete = await notesCollection.deleteMany({ folderId: id })

  return NextResponse.json({
    success: true,
    data: {
      deletedFolder: id,
      deletedNotesCount: notesDelete.deletedCount,
    },
  })
}
