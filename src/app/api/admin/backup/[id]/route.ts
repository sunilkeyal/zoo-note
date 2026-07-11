import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { deleteBackup, restoreBackup, downloadBackup } from "@/lib/backup"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  try {
    const { id } = await params
    const db = await connectToDatabase()
    const deleted = await deleteBackup(db, new ObjectId(id))
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Backup not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Backup delete error:", error)
    return NextResponse.json({ success: false, error: "Failed to delete backup" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))

    if (body.confirm !== "RESTORE") {
      return NextResponse.json(
        { success: false, error: 'Type "RESTORE" to confirm' },
        { status: 400 }
      )
    }

    const db = await connectToDatabase()
    await restoreBackup(db, new ObjectId(id))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Backup restore error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to restore backup" },
      { status: 500 }
    )
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  try {
    const { id } = await params
    const result = await downloadBackup(new ObjectId(id))
    if (!result) {
      return NextResponse.json({ success: false, error: "Backup not found" }, { status: 404 })
    }

    return new NextResponse(new Uint8Array(result.data), {
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    })
  } catch (error) {
    console.error("Backup download error:", error)
    return NextResponse.json({ success: false, error: "Failed to download backup" }, { status: 500 })
  }
}
