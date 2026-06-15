# User Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add username/password login, session management, and sidebar user dropdown with logout.

**Architecture:** Auth.js (NextAuth v5) with Credentials provider and MongoDB adapter. Users stored in a `users` collection. Seed default admin on first auth call. Login page at `/login`, middleware guards all routes. Sidebar footer shows user dropdown with logout.

**Tech Stack:** Next.js 16 App Router, Auth.js v5 (beta), MongoDB, shadcn/ui (Card, Sidebar, DropdownMenu), bcryptjs

---

### Task 0: Create feature branch + install dependencies

**Files:**
- Modify: `package.json`
- Run: `npm install`

- [ ] **Step 1: Create feature branch from main**

Run: `git checkout main && git pull origin main`

Run: `git checkout -b feature/user-auth`

Expected: Switched to new branch `feature/user-auth`

- [ ] **Step 2: Install auth dependencies**

Run: `npm install next-auth@beta @auth/mongodb-adapter bcryptjs`

Run: `npm install -D @types/bcryptjs`

- [ ] **Step 3: Commit dependency changes**

Run:
```bash
git add package.json package-lock.json
git commit -m "chore: add next-auth and bcryptjs dependencies"
```

---

### Task 0b: Add env vars

**Files:**
- Modify: `.env.local`

- [ ] **Step 1: Generate and add AUTH_SECRET**

Run: `npx auth secret`

This adds `AUTH_SECRET=<generated>` to `.env.local`

If the command isn't available, manually run Node to generate:
```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Then add the output to `.env.local` as `AUTH_SECRET=<output>`

- [ ] **Step 2 (optional): Add ADMIN_PASSWORD**

Optionally add `ADMIN_PASSWORD=<custom>` to `.env.local` to override the default admin password (`admin123`).

- [ ] **Step 3: Commit**

```bash
git add .env.local
git commit -m "chore: add AUTH_SECRET for Auth.js"
```

### Task 1: Seed module

**Files:**
- Create: `src/lib/seed.ts`

- [ ] **Step 1: Create seed module**

Create `src/lib/seed.ts`:
```typescript
import { connectToDatabase } from "@/lib/mongodb"
import bcrypt from "bcryptjs"

let seedingDone = false
let seedingPromise: Promise<void> | null = null

export async function ensureAdmin() {
  if (seedingDone) return
  if (seedingPromise) return seedingPromise

  seedingPromise = (async () => {
    try {
      const db = await connectToDatabase()
      const existing = await db.collection("users").countDocuments()
      if (existing === 0) {
        const password = process.env.ADMIN_PASSWORD || "admin123"
        const hash = await bcrypt.hash(password, 12)
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
      seedingDone = true
    } catch (err) {
      seedingPromise = null
      console.error("Failed to seed admin user:", err)
    }
  })()

  return seedingPromise
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/seed.ts
git commit -m "feat: add admin seeding logic with dedup and error handling"
```

---

### Task 1b: Auth config and API route

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: Create Auth.js configuration**

Create `src/lib/auth.ts`:
```typescript
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { connectToDatabase } from "@/lib/mongodb"
import bcrypt from "bcryptjs"
import { ensureAdmin } from "@/lib/seed"

// Trigger seed on first module load (non-blocking)
ensureAdmin()

export const { handlers, signIn, signOut, auth } = NextAuth({
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
```

- [ ] **Step 2: Create Auth.js API route**

Create `src/app/api/auth/[...nextauth]/route.ts`:
```typescript
import { handlers } from "@/lib/auth"

export const { GET, POST } = handlers
```

- [ ] **Step 3: Verify API route compiles**

Run: `npm run lint`
Expected: No lint errors

- [ ] **Step 4: Commit**

Run:
```bash
git add src/lib/auth.ts src/app/api/auth/\[...nextauth\]/route.ts
git commit -m "feat: add Auth.js config with credentials provider and admin seed"
```

---

### Task 2: Login page

**Files:**
- Create: `src/app/login/page.tsx`

- [ ] **Step 1: Create login page component**

Create `src/app/login/page.tsx`:
```tsx
"use client"

import React, { useState } from "react"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter } from "@/components/ui/card"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError("Invalid username or password")
      setLoading(false)
    } else {
      // hard reload so NoteProvider re-fetches with session cookie
      window.location.href = "/"
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <div>
              <CardTitle>Login to your account</CardTitle>
              <CardDescription>Enter your username below to login to your account</CardDescription>
            </div>
            <CardAction>
              <Button variant="outline" size="sm" type="button" disabled>
                Sign Up
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="grid gap-2">
              <label htmlFor="username" className="text-sm font-medium">
                Username
              </label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <a
                  href="#"
                  className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                  onClick={(e) => e.preventDefault()}
                  tabIndex={-1}
                >
                  Forgot your password?
                </a>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Login"}
            </Button>
            <Button variant="outline" className="w-full" type="button" disabled>
              Login with Google
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Verify login page compiles**

Run: `npm run lint`
Expected: No lint errors

- [ ] **Step 3: Commit**

Run:
```bash
git add src/app/login/page.tsx
git commit -m "feat: add login page with shadcn card"
```

---

### Task 3: Auth middleware

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Create middleware**

Create `src/middleware.ts`:
```typescript
import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"

// Lightweight config — no Node.js modules to avoid Edge Runtime errors
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
```

- [ ] **Step 2: Verify middleware compiles**

Run: `npm run lint`
Expected: No lint errors

- [ ] **Step 3: Commit**

Run:
```bash
git add src/middleware.ts
git commit -m "feat: add auth middleware to protect routes"
```

---

### Task 3b: Session type augmentation

**Files:**
- Create: `src/types/next-auth.d.ts`

- [ ] **Step 1: Create type augmentation**

Create `src/types/next-auth.d.ts`:
```typescript
import "@auth/core/types"

declare module "@auth/core/types" {
  interface DefaultUser {
    role: string
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/next-auth.d.ts
git commit -m "feat: add NextAuth type augmentation for user role"
```

---

### Task 4: Add SessionProvider to app

**Files:**
- Modify: `src/app/providers.tsx`

- [ ] **Step 1: Add SessionProvider wrapper**

Edit `src/app/providers.tsx`:
```tsx
"use client"

import { ThemeProvider } from "next-themes"
import { NoteProvider } from "@/contexts/NoteContext"
import { SessionProvider } from "next-auth/react"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <NoteProvider>
          {children}
        </NoteProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
```

- [ ] **Step 2: Verify compiles**

Run: `npm run lint`
Expected: No lint errors

- [ ] **Step 3: Commit**

Run:
```bash
git add src/app/providers.tsx
git commit -m "feat: add SessionProvider to app providers"
```

---

### Task 5: Sidebar user section with dropdown menu

**Files:**
- Modify: `src/components/NotesSidebar.tsx`

- [ ] **Step 1: Add imports and user section to sidebar**

Edit `src/components/NotesSidebar.tsx` — add these imports at the top:
```tsx
import { useSession, signOut } from "next-auth/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, Settings, User as UserIcon, Rocket } from "lucide-react"
```

Edit the component — add `useSession` hook after existing hooks:
```tsx
const { data: session } = useSession()
```

Edit the return block — add `SidebarFooter` with dropdown before the `</Sidebar>` closing tag and after the `SidebarContent`:
```tsx
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger render={<SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    {session?.user?.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{session?.user?.name || "User"}</span>
                    <span className="truncate text-xs">{(session?.user as { role?: string })?.role || ""}</span>
                  </div>
                </SidebarMenuButton>} />
                <DropdownMenuContent
                  className="min-w-56 rounded-lg"
                  side="top"
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="p-0 font-normal">
                      <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                          {session?.user?.name?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                          <span className="truncate font-semibold">{session?.user?.name || "User"}</span>
                          <span className="truncate text-xs">{session?.user?.email || ""}</span>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled>
                    <Settings /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>
                    <UserIcon /> Account
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>
                    <Rocket /> Upgrade to Pro
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => signOut()}>
                    <LogOut /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
```

- [ ] **Step 2: Verify compiles**

Run: `npm run lint`
Expected: No lint errors

- [ ] **Step 3: Commit**

Run:
```bash
git add src/components/NotesSidebar.tsx
git commit -m "feat: add user dropdown menu to sidebar footer"
```

---

### Manual Verification

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Verify redirect to login**

Open `http://localhost:3000` — should redirect to `http://localhost:3000/login`

- [ ] **Step 3: Login with admin credentials**

Enter username: `admin`, password: `admin123` — should redirect to `/`

- [ ] **Step 4: Verify sidebar user dropdown**

Click user section in sidebar footer — dropdown should show user info, Settings, Account, Upgrade to Pro (disabled), and Log out (red)

- [ ] **Step 5: Verify logout**

Click "Log out" — should redirect to `/login`

- [ ] **Step 6: Verify incorrect credentials**

Login with wrong password — should show error message "Invalid username or password"
