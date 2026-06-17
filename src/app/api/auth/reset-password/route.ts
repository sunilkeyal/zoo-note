import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { connectToDatabase } from "@/lib/mongodb"
import {
  verifyResetToken,
  markTokenUsed,
} from "@/lib/reset-token"

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 400 }
      )
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }

    const result = await verifyResetToken(token)
    if (!result.valid) {
      return NextResponse.json(
        { error: result.reason },
        { status: 400 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const db = await connectToDatabase()
    await db
      .collection("users")
      .updateOne({ email: result.email }, { $set: { passwordHash } })

    await markTokenUsed(token)

    return NextResponse.json(
      { message: "Password has been reset successfully" },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 400 }
    )
  }
}
