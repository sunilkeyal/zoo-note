import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import bcrypt from "bcryptjs"
import { ObjectId } from "mongodb"

export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  let body: { name?: string; email?: string; newPassword?: string; currentPassword?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const { name, email, newPassword, currentPassword } = body

  if (name !== undefined && name.trim() === "") {
    return NextResponse.json({ error: "Name is required." }, { status: 400 })
  }

  if (email !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format." }, { status: 400 })
    }
  }

  if (newPassword !== undefined) {
    if (!currentPassword) {
      return NextResponse.json(
        { error: "Current password is required to set a new password." },
        { status: 400 }
      )
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters." },
        { status: 400 }
      )
    }
  }

  const db = await connectToDatabase()
  let userId: ObjectId
  try {
    userId = new ObjectId(session.user.id)
  } catch {
    return NextResponse.json({ error: "Invalid session." }, { status: 400 })
  }
  const user = await db.collection("users").findOne({ _id: userId })

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 })
  }

  const changed: string[] = []
  const update: Record<string, unknown> = { updatedAt: new Date().toISOString() }

  if (newPassword !== undefined) {
    const valid = await bcrypt.compare(currentPassword as string, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 403 })
    }
    update.passwordHash = await bcrypt.hash(newPassword, 12)
    changed.push("password")
  }

  if (email !== undefined) {
    const normalizedEmail = email.toLowerCase().trim()
    if (normalizedEmail !== user.email) {
      const existing = await db
        .collection("users")
        .findOne({ email: normalizedEmail, _id: { $ne: userId } })
      if (existing) {
        return NextResponse.json(
          { error: "An account with this email already exists." },
          { status: 409 }
        )
      }
      update.email = normalizedEmail
      changed.push("email")
    }
  }

  if (name !== undefined && name.trim() !== user.displayName) {
    update.displayName = name.trim()
    changed.push("name")
  }

  if (changed.length > 0) {
    await db.collection("users").updateOne({ _id: userId }, { $set: update })
  }

  return NextResponse.json({ changed })
}
