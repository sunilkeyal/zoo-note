import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import bcrypt from "bcryptjs"
import { generatePassword } from "@/lib/password"
import { sendUserWelcomeEmail } from "@/lib/email"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search") || ""
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")))
  const role = searchParams.get("role")
  const status = searchParams.get("status")

  const db = await connectToDatabase()
  const filter: Record<string, any> = {}

  if (search) {
    const regex = { $regex: search, $options: "i" }
    filter.$or = [{ displayName: regex }, { email: regex }]
  }

  if (role && ["admin", "user"].includes(role)) {
    filter.role = role
  }

  if (status === "active") {
    const activeFilter = [{ isActive: { $exists: false } }, { isActive: true }]
    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: activeFilter }]
      delete filter.$or
    } else {
      filter.$or = activeFilter
    }
  } else if (status === "disabled") {
    filter.isActive = false
  }

  const total = await db.collection("users").countDocuments(filter)
  const users = await db.collection("users")
    .find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray()

  const mapped = users.map((u: any) => ({
    _id: u._id.toString(),
    email: u.email,
    displayName: u.displayName,
    role: u.role,
    isActive: u.isActive !== false,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  }))

  return NextResponse.json({
    success: true,
    data: { users: mapped, total, page, limit },
  })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const { email, displayName, role } = body

  if (!email || !displayName || !role) {
    return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
  }

  if (!["admin", "user"].includes(role)) {
    return NextResponse.json({ success: false, error: "Invalid role" }, { status: 400 })
  }

  const db = await connectToDatabase()
  const normalizedEmail = email.toLowerCase().trim()

  const existing = await db.collection("users").findOne({ email: normalizedEmail })
  if (existing) {
    return NextResponse.json({ success: false, error: "Email already exists" }, { status: 409 })
  }

  const password = generatePassword()
  const passwordHash = await bcrypt.hash(password, 12)
  const now = new Date()

  const result = await db.collection("users").insertOne({
    email: normalizedEmail,
    displayName,
    passwordHash,
    role,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  })

  sendUserWelcomeEmail(normalizedEmail, password).catch((err) =>
    console.error("[Admin] Failed to send welcome email:", err)
  )

  return NextResponse.json({
    success: true,
    data: {
      user: {
        _id: result.insertedId.toString(),
        email: normalizedEmail,
        displayName,
        role,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      temporaryPassword: password,
    },
  }, { status: 201 })
}
