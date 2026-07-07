import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { importFromZip } from "@/lib/import"

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get("file") as File | null

  if (!file) {
    return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 })
  }

  if (!file.name.endsWith(".zip")) {
    return NextResponse.json(
      { success: false, error: "Only .zip files accepted" },
      { status: 400 }
    )
  }

  const MAX_SIZE = 10 * 1024 * 1024 // 10MB
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { success: false, error: "File too large (max 10MB)" },
      { status: 400 }
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const db = await connectToDatabase()

  try {
    const result = await importFromZip(buffer, session.user.id as string, db)
    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed"
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }
}
