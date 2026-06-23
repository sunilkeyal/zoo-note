import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import bcrypt from "bcryptjs"
import { MongoServerError } from "mongodb"

export async function POST(request: NextRequest) {
  try {
    const { email: rawEmail, password, name: rawName } = await request.json()

    const email = typeof rawEmail === "string" ? rawEmail.toLowerCase().trim() : ""
    const name = typeof rawName === "string" ? rawName.trim() : ""

    // Validation
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      )
    }

    const db = await connectToDatabase()

    // Check for duplicate email (belt-and-suspenders with unique index)
    const existing = await db.collection("users").findOne({ email })
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 12)

    await db.collection("users").insertOne({
      email,
      displayName: name,
      passwordHash,
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    // Handle MongoDB duplicate key error (race condition)
    if (error instanceof MongoServerError && error.code === 11000) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      )
    }

    console.error("Signup error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
