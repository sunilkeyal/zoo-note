import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { Note, Folder } from "@/types"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const userIdFilter = searchParams.get("userId")

  const db = await connectToDatabase()
  const notesCollection = db.collection("notes")
  const foldersCollection = db.collection("folders")

  const notesQuery: Record<string, unknown> = { isDeleted: true }
  const foldersQuery: Record<string, unknown> = { isDeleted: true }
  if (userIdFilter) {
    if (typeof userIdFilter !== "string" || userIdFilter.length < 1) {
      return NextResponse.json({ success: false, error: "Invalid userId filter" }, { status: 400 })
    }
    notesQuery.userId = userIdFilter
    foldersQuery.userId = userIdFilter
  }

  const [deletedNotes, deletedFolders] = await Promise.all([
    notesCollection.find(notesQuery).sort({ deletedAt: -1 }).toArray(),
    foldersCollection.find(foldersQuery).sort({ deletedAt: -1 }).toArray(),
  ])

  const notes: Note[] = deletedNotes.map((n) => ({
    _id: n._id.toString(),
    title: n.title,
    content: n.content || "",
    folderId: n.folderId || undefined,
    userId: n.userId || undefined,
    position: n.position ?? 0,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
    isDeleted: true,
    deletedAt: n.deletedAt?.toISOString(),
  }))

  const folders: Folder[] = deletedFolders.map((f) => ({
    _id: f._id.toString(),
    name: f.name,
    userId: f.userId || undefined,
    position: f.position ?? 0,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
    isDeleted: true,
    deletedAt: f.deletedAt?.toISOString(),
  }))

  return NextResponse.json({ success: true, data: { notes, folders } })
}
