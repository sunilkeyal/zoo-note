import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import bcrypt from "bcryptjs"
import { MongoServerError } from "mongodb"

// Simple in-memory IP rate limiter: max 5 signups per IP per hour.
// In multi-instance/serverless deployments, complement this with
// infrastructure-level rate limiting (e.g. Cloudflare, Vercel Edge).
const signupAttempts = new Map<string, { count: number; windowStart: number }>()
const SIGNUP_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const SIGNUP_MAX_PER_WINDOW = 5

function checkSignupRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = signupAttempts.get(ip)
  if (!entry || now - entry.windowStart > SIGNUP_WINDOW_MS) {
    signupAttempts.set(ip, { count: 1, windowStart: now })
    return true
  }
  if (entry.count >= SIGNUP_MAX_PER_WINDOW) return false
  entry.count++
  return true
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  if (!checkSignupRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many signup attempts. Please try again later." },
      { status: 429 }
    )
  }

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
