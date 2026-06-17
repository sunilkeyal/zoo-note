import crypto from "crypto"
import { connectToDatabase } from "@/lib/mongodb"

const TOKEN_BYTES = 32
const TOKEN_EXPIRY_MS = 60 * 60 * 1000

const rateLimitMap = new Map<string, number>()
const RATE_LIMIT_MS = 60 * 1000

export function generateResetToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString("hex")
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
}

export async function storeResetToken(
  email: string,
  tokenHash: string
): Promise<void> {
  const db = await connectToDatabase()
  await db.collection("passwordResetTokens").insertOne({
    email,
    tokenHash,
    expiresAt: new Date(Date.now() + TOKEN_EXPIRY_MS),
    used: false,
    createdAt: new Date(),
  })
}

export async function verifyResetToken(
  token: string
): Promise<{ valid: boolean; email?: string; reason?: string }> {
  if (!token || token.length !== 64) {
    return { valid: false, reason: "Invalid token" }
  }

  const tokenHash = hashToken(token)
  const db = await connectToDatabase()
  const record = await db
    .collection("passwordResetTokens")
    .findOne({ tokenHash })

  if (!record) {
    return { valid: false, reason: "Invalid token" }
  }

  if (record.used) {
    return { valid: false, reason: "Invalid token" }
  }

  if (new Date() > record.expiresAt) {
    return { valid: false, reason: "Token has expired" }
  }

  return { valid: true, email: record.email }
}

export async function markTokenUsed(token: string): Promise<void> {
  const tokenHash = hashToken(token)
  const db = await connectToDatabase()
  await db
    .collection("passwordResetTokens")
    .updateOne({ tokenHash }, { $set: { used: true } })
}

export function checkRateLimit(email: string): boolean {
  const now = Date.now()
  const lastRequest = rateLimitMap.get(email)
  if (lastRequest && now - lastRequest < RATE_LIMIT_MS) {
    return false
  }
  rateLimitMap.set(email, now)
  return true
}
