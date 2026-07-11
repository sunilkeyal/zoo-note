import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { getAuditLogs } from "@/lib/audit"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const params = new URL(request.url).searchParams
  const page = parseInt(params.get("page") || "1", 10)
  const limit = parseInt(params.get("limit") || "20", 10)
  const userId = params.get("userId") || undefined
  const action = params.get("action") || undefined
  const from = params.get("from") ? new Date(params.get("from")!) : undefined
  const to = params.get("to") ? new Date(params.get("to")!) : undefined

  try {
    const db = await connectToDatabase()
    const data = await getAuditLogs(db, { userId, action, from, to, page, limit })
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Audit logs error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch audit logs" },
      { status: 500 }
    )
  }
}
