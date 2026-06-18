import { connectToDatabase } from "@/lib/mongodb"
import bcrypt from "bcryptjs"

let seedingDone = false
let seedingPromise: Promise<void> | null = null

const seedUsers = [
  { username: "admin",  email: "admin@example.com",   displayName: "Admin User", password: process.env.ADMIN_PASSWORD || "admin123",   role: "admin" },
  { username: "user",   email: "user@example.com",    displayName: "Regular User", password: process.env.USER_PASSWORD || "user123",  role: "user" },
]

export async function ensureAdmin() {
  if (seedingDone) return
  if (seedingPromise) return seedingPromise

  seedingPromise = (async () => {
    try {
      const db = await connectToDatabase()
      for (const u of seedUsers) {
        const existing = await db.collection("users").findOne({ username: u.username })
        if (!existing) {
          const hash = await bcrypt.hash(u.password, 12)
          await db.collection("users").insertOne({
            username: u.username,
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
      const adminUser = await db.collection("users").findOne({ username: "admin" })
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
