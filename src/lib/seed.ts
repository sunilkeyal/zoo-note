import { connectToDatabase } from "@/lib/mongodb"
import bcrypt from "bcryptjs"

let seedingDone = false
let seedingPromise: Promise<void> | null = null

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
const USER_PASSWORD = process.env.USER_PASSWORD

const seedUsers = [
  { email: "admin@example.com",   displayName: "Admin User", password: ADMIN_PASSWORD || "admin123",   role: "admin" },
  { email: "user@example.com",    displayName: "Regular User", password: USER_PASSWORD || "user123",  role: "user" },
]

export async function ensureAdmin() {
  if (seedingDone) return
  if (seedingPromise) return seedingPromise

  seedingPromise = (async () => {
    try {
      if (!process.env.ADMIN_PASSWORD) {
        console.warn("[seed] ADMIN_PASSWORD env var not set — using insecure default. SET THIS IN PRODUCTION.")
      }
      if (!process.env.USER_PASSWORD) {
        console.warn("[seed] USER_PASSWORD env var not set — using insecure default. SET THIS IN PRODUCTION.")
      }

      const db = await connectToDatabase()
      for (const u of seedUsers) {
        const existing = await db.collection("users").findOne({ email: u.email })
        if (!existing) {
          const hash = await bcrypt.hash(u.password, 12)
          await db.collection("users").insertOne({
            email: u.email,
            displayName: u.displayName,
            passwordHash: hash,
            role: u.role,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        }
      }

      // Migrate existing notes/folders without userId to the admin user
      const adminUser = await db.collection("users").findOne({ email: "admin@example.com" })
      if (adminUser) {
        const adminId = adminUser._id.toString()
        await db.collection("notes").updateMany(
          { userId: { $exists: false } },
          { $set: { userId: adminId } }
        )
        await db.collection("folders").updateMany(
          { userId: { $exists: false } },
          { $set: { userId: adminId } }
        )
      }

      seedingDone = true
    } catch (err) {
      seedingPromise = null
      console.error("Failed to seed users:", err)
    }
  })()

  return seedingPromise
}
