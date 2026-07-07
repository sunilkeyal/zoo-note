import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { generateExportZip } from "@/lib/export"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const db = await connectToDatabase()

  const [notes, folders] = await Promise.all([
    db
      .collection("notes")
      .find({ userId: session.user.id, isDeleted: { $ne: true } })
      .sort({ position: 1, updatedAt: -1 })
      .toArray(),
    db
      .collection("folders")
      .find({ userId: session.user.id, isDeleted: { $ne: true } })
      .sort({ position: 1, createdAt: -1 })
      .toArray(),
  ])

  const mappedNotes = notes.map((n) => ({
    _id: n._id.toString(),
    title: n.title,
    content: n.content || "",
    folderId: n.folderId || undefined,
    userId: n.userId || undefined,
    position: n.position ?? 0,
    isFavorite: n.isFavorite ?? false,
    favoritedAt: n.favoritedAt?.toISOString?.() || n.favoritedAt || undefined,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  }))

  const mappedFolders = folders.map((f) => ({
    _id: f._id.toString(),
    name: f.name,
    userId: f.userId || undefined,
    position: f.position ?? 0,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  }))

  const zipBuffer = await generateExportZip(mappedNotes, mappedFolders, db)

  const dateStr = new Date().toISOString().split("T")[0]
  return new NextResponse(new Uint8Array(zipBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="zoonote-export-${dateStr}.zip"`,
    },
  })
}
