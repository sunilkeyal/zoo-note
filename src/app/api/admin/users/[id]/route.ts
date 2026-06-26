import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"

async function getAdminSession() {
  const session = await auth()
  if (!session?.user) return null
  if (session.user.role !== "admin") return null
  return session
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  let objectId: ObjectId
  try {
    objectId = new ObjectId(id)
  } catch {
    return NextResponse.json({ success: false, error: "Invalid user ID format" }, { status: 400 })
  }

  const db = await connectToDatabase()
  const user = await db.collection("users").findOne({ _id: objectId })

  if (!user) {
    return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    data: {
      _id: user._id.toString(),
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      isActive: user.isActive !== false,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const currentUserId = session?.user?.id
  if (currentUserId && currentUserId === id) {
    return NextResponse.json({ success: false, error: "Cannot modify your own account" }, { status: 400 })
  }

  let objectId: ObjectId
  try {
    objectId = new ObjectId(id)
  } catch {
    return NextResponse.json({ success: false, error: "Invalid user ID format" }, { status: 400 })
  }

  const body = await request.json()
  const db = await connectToDatabase()

  const user = await db.collection("users").findOne({ _id: objectId })
  if (!user) {
    return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
  }

  const update: Record<string, any> = {}

  if (body.displayName !== undefined) {
    if (typeof body.displayName !== "string" || body.displayName.trim().length === 0) {
      return NextResponse.json({ success: false, error: "Invalid display name" }, { status: 400 })
    }
    update.displayName = body.displayName.trim()
  }

  if (body.role !== undefined) {
    if (!["admin", "user"].includes(body.role)) {
      return NextResponse.json({ success: false, error: "Invalid role" }, { status: 400 })
    }
    if (body.role !== user.role) {
      if (user.role === "admin" && body.role !== "admin") {
        const adminCount = await db.collection("users").countDocuments({
          role: "admin",
          $or: [{ isActive: { $exists: false } }, { isActive: true }],
        })
        if (adminCount <= 1) {
          return NextResponse.json({ success: false, error: "Cannot change role of the last admin" }, { status: 400 })
        }
      }
    }
    update.role = body.role
  }

  if (body.isActive !== undefined) {
    if (user.role === "admin" && body.isActive === false) {
      const adminCount = await db.collection("users").countDocuments({
        role: "admin",
        $or: [{ isActive: { $exists: false } }, { isActive: true }],
      })
      if (adminCount <= 1) {
        return NextResponse.json({ success: false, error: "Cannot disable the last admin account" }, { status: 400 })
      }
    }
    update.isActive = body.isActive
  }

  update.updatedAt = new Date()

  await db.collection("users").updateOne(
    { _id: objectId },
    { $set: update }
  )

  const updated = await db.collection("users").findOne({ _id: objectId })

  return NextResponse.json({
    success: true,
    data: {
      _id: updated!._id.toString(),
      email: updated!.email,
      displayName: updated!.displayName,
      role: updated!.role,
      isActive: updated!.isActive !== false,
      createdAt: updated!.createdAt,
      updatedAt: updated!.updatedAt,
    },
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const currentUserId = session?.user?.id
  if (currentUserId && currentUserId === id) {
    return NextResponse.json({ success: false, error: "Cannot delete your own account" }, { status: 400 })
  }

  let objectId: ObjectId
  try {
    objectId = new ObjectId(id)
  } catch {
    return NextResponse.json({ success: false, error: "Invalid user ID format" }, { status: 400 })
  }

  const db = await connectToDatabase()
  const user = await db.collection("users").findOne({ _id: objectId })

  if (!user) {
    return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
  }

  if (user.role === "admin") {
    const adminCount = await db.collection("users").countDocuments({
      role: "admin",
      $or: [{ isActive: { $exists: false } }, { isActive: true }],
    })
    if (adminCount <= 1) {
      return NextResponse.json({ success: false, error: "Cannot delete the last admin account" }, { status: 400 })
    }
  }

  const userId = id

  await db.collection("notes").deleteMany({ userId })
  await db.collection("folders").deleteMany({ userId })
  await db.collection("users").deleteOne({ _id: objectId })

  return NextResponse.json({ success: true })
}
