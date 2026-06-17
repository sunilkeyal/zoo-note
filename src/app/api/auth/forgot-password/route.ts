import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { sendPasswordResetEmail } from "@/lib/email"
import {
  generateResetToken,
  hashToken,
  storeResetToken,
  checkRateLimit,
} from "@/lib/reset-token"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    if (!checkRateLimit(normalizedEmail)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      )
    }

    const db = await connectToDatabase()
    const user = await db
      .collection("users")
      .findOne({ email: normalizedEmail })

    if (user) {
      const token = generateResetToken()
      const tokenHash = hashToken(token)
      await storeResetToken(normalizedEmail, tokenHash)

      const resetLink = `${request.nextUrl.origin}/reset-password?token=${token}`
      await sendPasswordResetEmail(normalizedEmail, resetLink)
    }

    return NextResponse.json(
      { message: "If an account exists, a reset link has been sent" },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      { message: "If an account exists, a reset link has been sent" },
      { status: 200 }
    )
  }
}
