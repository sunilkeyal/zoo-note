import NextAuth, { CredentialsSignin } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { connectToDatabase } from "@/lib/mongodb"
import bcrypt from "bcryptjs"
import { ensureAdmin } from "@/lib/seed"
import { authConfig } from "@/lib/auth.config"

class AccountDisabledError extends CredentialsSignin {
  code = "AccountDisabled" as const
}

// Trigger seed on first module load (non-blocking)
ensureAdmin()

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const { email: rawEmail, password } = credentials as {
          email: string
          password: string
        }
        const email = rawEmail.toLowerCase().trim()

        const db = await connectToDatabase()

        await ensureAdmin()

        const user = await db.collection("users").findOne({ email })
        if (!user) return null

        if (user.isActive === false) throw new AccountDisabledError()

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
