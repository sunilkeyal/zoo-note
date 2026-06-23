# Sign Up & Email Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace username-based authentication with email, add a self-registration sign-up page for normal users.

**Architecture:** Update the Credentials provider to look up by email, remove `username` from seed/MongoDB, create a sign-up API route and page. All changes are in `src/` — no new dependencies.

**Tech Stack:** Next.js 16, Auth.js v5 (NextAuth), bcryptjs, MongoDB

---

### Task 1: Allow /signup in auth config

**Files:**
- Modify: `src/lib/auth.config.ts`

- [ ] **Step 1: Add `/signup` to public routes**

Change the `authorized` callback to allow `/signup`:

```ts
// src/lib/auth.config.ts line 14
      if (pathname === "/login" || pathname === "/signup" || pathname === "/forgot-password" || pathname === "/reset-password" || pathname.startsWith("/api/auth")) {
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/auth.config.ts
git commit -m "feat: allow /signup in auth config"
```

---

### Task 2: Add unique email index to MongoDB

**Files:**
- Modify: `src/lib/mongodb.ts`

- [ ] **Step 1: Add unique email index**

Add after the existing index creation block in `mongodb.ts`:

```ts
  await cachedDb.collection("users").createIndex(
    { email: 1 },
    { unique: true, background: true }
  ).catch(() => {});
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/mongodb.ts
git commit -m "feat: add unique email index on users collection"
```

---

### Task 3: Remove username from seed

**Files:**
- Modify: `src/lib/seed.ts`

- [ ] **Step 1: Update seed users and lookup logic**

Change the `seedUsers` array to remove `username`. Change the lookup query to use `email` instead of `username`:

```ts
const seedUsers = [
  { email: "admin@example.com",   displayName: "Admin User", password: ADMIN_PASSWORD || "admin123",   role: "admin" },
  { email: "user@example.com",    displayName: "Regular User", password: USER_PASSWORD || "user123",  role: "user" },
]
```

Change the insert logic — remove `username` from the inserted document, and find existing users by `email`:

```ts
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
```

Also update the admin user lookup for the migration (note/folder migration):

```ts
      const adminUser = await db.collection("users").findOne({ email: "admin@example.com" })
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/seed.ts
git commit -m "feat: remove username from seed, use email for lookup"
```

---

### Task 4: Switch Credentials provider to email

**Files:**
- Modify: `src/lib/auth.ts`

- [ ] **Step 1: Change credential fields from username to email**

Replace the credentials definition:

```ts
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
```

Update the `authorize` function to destructure and look up by `email`:

```ts
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const { email, password } = credentials as {
          email: string
          password: string
        }

        const db = await connectToDatabase()

        await ensureAdmin()

        const user = await db.collection("users").findOne({ email })
        if (!user) return null

        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) return null
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat: switch credentials provider from username to email"
```

---

### Task 5: Update login page to use email

**Files:**
- Modify: `src/app/login/page.tsx`

- [ ] **Step 1: Replace username with email in login form**

Change state variable:

```ts
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
```

Update the `handleSubmit` to pass `email`:

```ts
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })
```

Update error message:

```ts
      setError("Invalid email or password")
```

Update the UI — replace username input with email input:

```tsx
            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
```

Update description text:

```tsx
              <CardDescription>Enter your email below to login to your account</CardDescription>
```

- [ ] **Step 2: Enable the Sign Up button**

Change the disabled Sign Up button to link to `/signup`:

```tsx
              <Link href="/signup">
                <Button variant="outline" size="sm" type="button">Sign Up</Button>
              </Link>
```

Add the `Link` import at the top:

```tsx
import Link from "next/link"
```

- [ ] **Step 3: Add success banner for signup redirect**

Add a state to read the query param:

```ts
import { useSearchParams } from "next/navigation"
```

```ts
  const searchParams = useSearchParams()
  const signupSuccess = searchParams.get("signup") === "success"
```

Wrap the component in Suspense (since `useSearchParams` requires it), or handle it by wrapping in the component. Actually, to keep it simple, the login page will be wrapped in a client component that uses `useSearchParams`. Let's use a pattern similar to the reset-password page.

```tsx
"use client"

import React, { useState, Suspense } from "react"
import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
// ... other imports

function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const signupSuccess = searchParams.get("signup") === "success"

  // ... rest of the form
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-svh items-center justify-center p-4">Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}
```

Add the success banner in the form, before the error block:

```tsx
            {signupSuccess && (
              <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600">
                Account created successfully! Please sign in.
              </div>
            )}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "feat: update login to use email, enable signup button, add success banner"
```

---

### Task 6: Create sign-up API route

**Files:**
- Create: `src/app/api/auth/signup/route.ts`

- [ ] **Step 1: Create the sign-up API handler**

```ts
import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()

    // Validation
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      )
    }

    if (name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      )
    }

    const db = await connectToDatabase()

    // Check for duplicate email (belt-and-suspenders with unique index)
    const existing = await db.collection("users").findOne({ email })
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 12)

    await db.collection("users").insertOne({
      email,
      displayName: name.trim(),
      passwordHash,
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    // Handle MongoDB duplicate key error (race condition)
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      )
    }

    console.error("Signup error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/auth/signup/route.ts
git commit -m "feat: add sign-up API route"
```

---

### Task 7: Create sign-up page

**Files:**
- Create: `src/app/signup/page.tsx`

- [ ] **Step 1: Create the sign-up page**

```tsx
"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      })

      if (res.ok) {
        router.push("/login?signup=success")
      } else {
        const data = await res.json()
        setError(data.error || "Something went wrong")
        setLoading(false)
      }
    } catch {
      setError("Unable to connect. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <div>
              <CardTitle>Create an account</CardTitle>
              <CardDescription>Enter your details to get started</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password (min 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Sign Up"}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="underline underline-offset-4 hover:text-primary">
                Sign in
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/signup/page.tsx
git commit -m "feat: add sign-up page"
```

---

### Task 8: Verify the full flow

- [ ] **Step 1: Run the dev server and test**

Run: `npm run dev`

Test manually:
1. Visit `/signup` — form should render with email, name, password fields
2. Submit with invalid data — see validation errors
3. Submit with valid data — redirected to `/login?signup=success`
4. Login page shows success banner "Account created successfully! Please sign in."
5. Login with the new email+password — should succeed
6. Visit `/signup` again with same email — see "already exists" error
7. Login with old seeded credentials: `admin@example.com` / `admin123` — should work
8. Login with `user@example.com` / `user123` — should work

- [ ] **Step 2: Commit any remaining changes**

```bash
git add -A
git commit -m "chore: final adjustments after verification"
```
