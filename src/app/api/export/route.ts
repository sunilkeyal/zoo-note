import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { generateExportZip } from "@/lib/export"
import { Note, Folder } from "@/types"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const db = await connectToDatabase()
  const notesCollection = db.collection("notes")
  const foldersCollection = db.collection("folders")

  const notes = await notesCollection
    .find({ userId: session.user.id, isDeleted: { $ne: true } })
    .sort({ position: 1, updatedAt: -1 })
    .toArray()

  const folders = await foldersCollection
    .find({ userId: session.user.id, isDeleted: { $ne: true } })
    .toArray()

  const mappedNotes: Note[] = notes.map((n: Record<string, unknown>) => ({
    _id: String(n._id),
    title: n.title as string,
    content: (n.content as string) || "",
    folderId: (n.folderId as string) || undefined,
    userId: (n.userId as string) || undefined,
    position: (n.position as number) ?? 0,
    createdAt: (n.createdAt as Date).toISOString(),
    updatedAt: (n.updatedAt as Date).toISOString(),
  }))

  const mappedFolders: Folder[] = folders.map((f: Record<string, unknown>) => ({
    _id: String(f._id),
    name: f.name as string,
    userId: (f.userId as string) || undefined,
    createdAt: (f.createdAt as Date).toISOString(),
    updatedAt: (f.updatedAt as Date).toISOString(),
  }))

  if (mappedNotes.length === 0) {
    return NextResponse.json({ success: false, error: "No notes to export" }, { status: 404 })
  }

  const zipBuffer = await generateExportZip(mappedNotes, mappedFolders)

  const dateStr = new Date().toISOString().slice(0, 10)
  return new NextResponse(new Uint8Array(zipBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="notes-export-${dateStr}.zip"`,
    },
  })
}
