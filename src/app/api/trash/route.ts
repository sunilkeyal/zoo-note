import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { Note, Folder } from "@/types"
import { ObjectId } from "mongodb"
import { deleteImageById } from "@/lib/gridfs"
import { extractImageIds } from "@/lib/utils"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const db = await connectToDatabase()
  const notesCollection = db.collection("notes")
  const foldersCollection = db.collection("folders")

  const [deletedNotes, deletedFolders] = await Promise.all([
    notesCollection
      .find({ userId: session.user.id, isDeleted: true })
      .sort({ deletedAt: -1 })
      .toArray(),
    foldersCollection
      .find({ userId: session.user.id, isDeleted: true })
      .sort({ deletedAt: -1 })
      .toArray(),
  ])

  const uniqueFolderIds = [...new Set(deletedNotes.map((n) => n.folderId?.toString()).filter(Boolean))]

  let folderNameMap: Record<string, string> = {}
  if (uniqueFolderIds.length > 0) {
    const folderDocs = await foldersCollection
      .find({ userId: session.user.id, _id: { $in: uniqueFolderIds.map((id) => new ObjectId(id)) } })
      .project({ name: 1 })
      .toArray()
    for (const f of folderDocs) {
      folderNameMap[f._id.toString()] = f.name
    }
  }

  const notes: Note[] = deletedNotes.map((n) => ({
    _id: n._id.toString(),
    title: n.title,
    content: n.content || "",
    folderId: n.folderId || undefined,
    folderName: n.folderId ? folderNameMap[n.folderId.toString()] || undefined : undefined,
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

export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { noteIds, folderIds }: { noteIds?: string[]; folderIds?: string[] } = body

  if ((!noteIds || noteIds.length === 0) && (!folderIds || folderIds.length === 0)) {
    return NextResponse.json({ success: false, error: "No items specified" }, { status: 400 })
  }

  const db = await connectToDatabase()
  const notesCollection = db.collection("notes")
  const foldersCollection = db.collection("folders")

  let deletedNotes = 0
  let deletedFolders = 0

  if (noteIds && noteIds.length > 0) {
    const noteObjectIds: ObjectId[] = []
    for (const id of noteIds) {
      try { noteObjectIds.push(new ObjectId(id)) } catch { continue }
    }
    if (noteObjectIds.length === 0) {
      return NextResponse.json({ success: false, error: "Invalid note ID format" }, { status: 400 })
    }

    // Collect image IDs before deleting so we can orphan the ones not referenced elsewhere
    const noteDocs = await notesCollection
      .find({ _id: { $in: noteObjectIds }, userId: session.user.id })
      .project({ content: 1 })
      .toArray()
    const noteImageIds = new Set<string>()
    for (const doc of noteDocs) {
      for (const imgId of extractImageIds(doc.content || "")) {
        noteImageIds.add(imgId)
      }
    }

    const result = await notesCollection.deleteMany({
      _id: { $in: noteObjectIds },
      userId: session.user.id,
    })
    deletedNotes = result.deletedCount

    if (noteImageIds.size > 0) {
      for (const imgId of noteImageIds) {
        const stillReferenced = await notesCollection.countDocuments({
          userId: session.user.id,
          content: { $regex: imgId },
        })
        if (stillReferenced === 0) {
          try { await deleteImageById(db, new ObjectId(imgId)) } catch { /* already gone */ }
        }
      }
    }
  }

  if (folderIds && folderIds.length > 0) {
    const folderObjectIds: ObjectId[] = []
    for (const id of folderIds) {
      try { folderObjectIds.push(new ObjectId(id)) } catch { continue }
    }
    if (folderObjectIds.length === 0) {
      return NextResponse.json({ success: false, error: "Invalid folder ID format" }, { status: 400 })
    }
    const result = await foldersCollection.deleteMany({
      _id: { $in: folderObjectIds },
      userId: session.user.id,
    })
    deletedFolders = result.deletedCount

    // Collect image IDs from folder notes before deleting them
    const folderNoteDocs = await notesCollection
      .find({ folderId: { $in: folderIds }, userId: session.user.id })
      .project({ content: 1 })
      .toArray()
    const folderImageIds = new Set<string>()
    for (const doc of folderNoteDocs) {
      for (const imgId of extractImageIds(doc.content || "")) {
        folderImageIds.add(imgId)
      }
    }

    // Also hard-delete notes inside these folders
    await notesCollection.deleteMany({
      folderId: { $in: folderIds },
      userId: session.user.id,
    })

    if (folderImageIds.size > 0) {
      for (const imgId of folderImageIds) {
        const stillReferenced = await notesCollection.countDocuments({
          userId: session.user.id,
          content: { $regex: imgId },
        })
        if (stillReferenced === 0) {
          try { await deleteImageById(db, new ObjectId(imgId)) } catch { /* already gone */ }
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    data: { deletedNotes, deletedFolders },
  })
}
