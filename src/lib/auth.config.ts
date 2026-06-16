import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  providers: [],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async authorized({ request, auth }) {
      const { pathname } = request.nextUrl
      if (pathname === "/login" || pathname.startsWith("/api/auth")) {
        return true
      }
      if (pathname.startsWith("/admin")) {
        return auth?.user?.role === "admin"
      }
      return !!auth
    },
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
} satisfies NextAuthConfig
