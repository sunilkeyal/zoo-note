import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { Note, NoteInput } from "@/types"

export async function GET() {
  const db = await connectToDatabase()
  const collection = db.collection("notes")

  const notes = await collection
    .find({})
    .project({ title: 1, content: 1, folderId: 1, position: 1, createdAt: 1, updatedAt: 1 })
    .sort({ position: 1, updatedAt: -1 })
    .toArray()

  const mapped: Note[] = notes.map((n) => ({
    _id: n._id.toString(),
    title: n.title,
    content: n.content || "",
    folderId: n.folderId || undefined,
    position: n.position ?? 0,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  }))

  return NextResponse.json({ success: true, data: mapped })
}

export async function POST(request: NextRequest) {
  const db = await connectToDatabase()
  const collection = db.collection("notes")

  const body: NoteInput = await request.json()
  const { title, folderId, position } = body

  if (!title || !title.trim()) {
    return NextResponse.json({ success: false, error: "Title is required" }, { status: 400 })
  }

  const now = new Date()
  const doc: Record<string, unknown> = {
    title: title.trim(),
    content: "",
    position: position ?? 0,
    createdAt: now,
    updatedAt: now,
  }
  if (folderId) doc.folderId = folderId

  const result = await collection.insertOne(doc)

  const note: Note = {
    _id: result.insertedId.toString(),
    title: title.trim(),
    content: "",
    folderId: folderId || undefined,
    position: position ?? 0,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }

  return NextResponse.json({ success: true, data: note }, { status: 201 })
}
