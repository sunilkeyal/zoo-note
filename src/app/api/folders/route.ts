import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { Folder } from "@/types"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const db = await connectToDatabase()
  const collection = db.collection("folders")

  const folders = await collection
    .find({ userId: session.user.id, isDeleted: { $ne: true } })
    .sort({ position: 1, createdAt: -1 })
    .toArray()

  const mapped: Folder[] = folders.map((f) => ({
    _id: f._id.toString(),
    name: f.name,
    userId: f.userId || undefined,
    position: f.position ?? 0,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  }))

  return NextResponse.json({ success: true, data: mapped })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const db = await connectToDatabase()
  const collection = db.collection("folders")
  const { name, position } = await request.json()

  if (!name || !name.trim()) {
    return NextResponse.json({ success: false, error: "Folder name is required" }, { status: 400 })
  }

  const now = new Date()

  // Compute next position if not provided
  let nextPosition = position
  if (nextPosition === undefined) {
    const maxPosFolder = await collection
      .find({ userId: session.user.id, isDeleted: { $ne: true } })
      .sort({ position: -1 })
      .limit(1)
      .toArray()
    nextPosition = maxPosFolder.length > 0 ? maxPosFolder[0].position + 1000 : 0
  }

  const result = await collection.insertOne({
    name: name.trim(),
    position: nextPosition,
    userId: session.user.id,
    createdAt: now,
    updatedAt: now,
  })

  const folder: Folder = {
    _id: result.insertedId.toString(),
    name: name.trim(),
    position: nextPosition,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }

  return NextResponse.json({ success: true, data: folder }, { status: 201 })
}
