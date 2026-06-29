"use client"

import React, { useState, Suspense } from "react"
import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter } from "@/components/ui/card"

function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const signupSuccess = searchParams.get("signup") === "success"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      const code = (result as any).code
      setError(
        code === "AccountDisabled"
          ? "Your account has been disabled. Please contact an administrator."
          : "Invalid email or password"
      )
      setLoading(false)
    } else {
      window.location.href = "/"
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-4">
        <img src="/ZooNoteBar.png" alt="ZooNoteBar" className="size-16 rounded-xl" />
      <Card className="w-full max-w-sm">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <div>
              <CardTitle>Login to your account</CardTitle>
              <CardDescription>Enter your email below to login to your account</CardDescription>
            </div>
            <CardAction>
              <Link href="/signup">
                <Button variant="outline" size="sm" type="button">Sign Up</Button>
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-4">
            {signupSuccess && (
              <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600">
                Account created successfully! Please sign in.
              </div>
            )}
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
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
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <a
                  href="/forgot-password"
                  className="text-xs text-muted-foreground underline-offset-4 hover:underline"
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
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-svh items-center justify-center p-4">Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}
