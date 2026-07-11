import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { createBackup, listBackups } from "@/lib/backup"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  try {
    const db = await connectToDatabase()
    const data = await listBackups(db)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Backup list error:", error)
    return NextResponse.json({ success: false, error: "Failed to list backups" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const db = await connectToDatabase()
    const backup = await createBackup(db, body.notes ?? "")
    return NextResponse.json({ success: true, data: backup })
  } catch (error) {
    console.error("Backup creation error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create backup" },
      { status: 500 }
    )
  }
}
