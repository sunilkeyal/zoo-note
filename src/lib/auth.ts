import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { connectToDatabase } from "@/lib/mongodb"
import bcrypt from "bcryptjs"

async function ensureAdmin(db: import("mongodb").Db) {
  const existing = await db.collection("users").countDocuments()
  if (existing === 0) {
    const hash = await bcrypt.hash("admin123", 12)
    await db.collection("users").insertOne({
      username: "admin",
      email: "admin@example.com",
      displayName: "Admin User",
      passwordHash: hash,
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const { username, password } = credentials as {
          username: string
          password: string
        }

        const db = await connectToDatabase()
        await ensureAdmin(db)

        const user = await db.collection("users").findOne({ username })
        if (!user) return null

        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) return null

        return {
          id: user._id.toString(),
          name: user.displayName,
          email: user.email,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string
        session.user.id = token.id as string
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
})
