import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { connectToDatabase } from "@/lib/mongodb"
import bcrypt from "bcryptjs"
import { ensureAdmin } from "@/lib/seed"
import { authConfig } from "@/lib/auth.config"

// Trigger seed on first module load (non-blocking)
ensureAdmin()

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null
        }

        const { username, password } = credentials as {
          username: string
          password: string
        }

        const db = await connectToDatabase()

        await ensureAdmin()

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
})
