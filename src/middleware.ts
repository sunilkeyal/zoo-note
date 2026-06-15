import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"

const authConfig: NextAuthConfig = {
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
      return !!auth
    },
  },
}

export default NextAuth(authConfig).auth

export const config = {
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"],
}
