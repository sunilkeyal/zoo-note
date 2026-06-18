import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { ObjectId } from "mongodb"

export async function POST(request: NextRequest) {
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

  let restoredNotes = 0
  let restoredFolders = 0

  if (noteIds && noteIds.length > 0) {
    const noteObjectIds = noteIds.map((id) => new ObjectId(id))
    const result = await notesCollection.updateMany(
      { _id: { $in: noteObjectIds }, userId: session.user.id },
      { $unset: { isDeleted: "", deletedAt: "" } }
    )
    restoredNotes = result.modifiedCount
  }

  if (folderIds && folderIds.length > 0) {
    const folderObjectIds = folderIds.map((id) => new ObjectId(id))
    const result = await foldersCollection.updateMany(
      { _id: { $in: folderObjectIds }, userId: session.user.id },
      { $unset: { isDeleted: "", deletedAt: "" } }
    )
    restoredFolders = result.modifiedCount

    // Also restore notes inside these folders
    const noteResult = await notesCollection.updateMany(
      { folderId: { $in: folderIds }, userId: session.user.id, isDeleted: true },
      { $unset: { isDeleted: "", deletedAt: "" } }
    )
    restoredNotes += noteResult.modifiedCount
  }

  return NextResponse.json({
    success: true,
    data: { restoredNotes, restoredFolders },
  })
}
