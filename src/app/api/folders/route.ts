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
    .find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .toArray()

  const mapped: Folder[] = folders.map((f) => ({
    _id: f._id.toString(),
    name: f.name,
    userId: f.userId || undefined,
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
  const { name } = await request.json()

  if (!name || !name.trim()) {
    return NextResponse.json({ success: false, error: "Folder name is required" }, { status: 400 })
  }

  const now = new Date()
  const result = await collection.insertOne({
    name: name.trim(),
    userId: session.user.id,
    createdAt: now,
    updatedAt: now,
  })

  const folder: Folder = {
    _id: result.insertedId.toString(),
    name: name.trim(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }

  return NextResponse.json({ success: true, data: folder }, { status: 201 })
}
