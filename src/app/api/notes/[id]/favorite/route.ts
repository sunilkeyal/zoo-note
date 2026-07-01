import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { ObjectId } from "mongodb"

export async function PATCH(
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

  const note = await collection.findOne(
    { _id: objectId, userId: session.user.id },
    { projection: { isFavorite: 1 } }
  )

  if (!note) {
    return NextResponse.json({ success: false, error: "Note not found" }, { status: 404 })
  }

  const isCurrentlyFavorite = !!note.isFavorite
  const update: Record<string, unknown> = {
    isFavorite: !isCurrentlyFavorite,
  }
  if (!isCurrentlyFavorite) {
    update.favoritedAt = new Date()
  } else {
    update.favoritedAt = null
  }

  const result = await collection.findOneAndUpdate(
    { _id: objectId, userId: session.user.id },
    { $set: update },
    { returnDocument: "after" }
  )

  if (!result) {
    return NextResponse.json({ success: false, error: "Note not found" }, { status: 404 })
  }

  const updatedNote = {
    _id: result._id.toString(),
    title: result.title,
    content: result.content || "",
    folderId: result.folderId || undefined,
    position: result.position ?? 0,
    isFavorite: !!result.isFavorite,
    favoritedAt: result.favoritedAt?.toISOString?.() || result.favoritedAt || undefined,
    createdAt: result.createdAt.toISOString(),
    updatedAt: result.updatedAt.toISOString(),
  }

  return NextResponse.json({ success: true, data: updatedNote })
}
