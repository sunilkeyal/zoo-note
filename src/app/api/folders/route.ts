import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { Folder } from "@/types"

export async function GET() {
  const db = await connectToDatabase()
  const collection = db.collection("folders")

  const folders = await collection
    .find({})
    .sort({ createdAt: -1 })
    .toArray()

  const mapped: Folder[] = folders.map((f) => ({
    _id: f._id.toString(),
    name: f.name,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  }))

  return NextResponse.json({ success: true, data: mapped })
}

export async function POST(request: NextRequest) {
  const db = await connectToDatabase()
  const collection = db.collection("folders")
  const { name } = await request.json()

  if (!name || !name.trim()) {
    return NextResponse.json({ success: false, error: "Folder name is required" }, { status: 400 })
  }

  const now = new Date()
  const result = await collection.insertOne({
    name: name.trim(),
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
