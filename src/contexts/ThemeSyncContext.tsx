"use client"

import { createContext, useContext, useEffect, useRef, useCallback } from "react"
import { useTheme } from "next-themes"

export type Theme = "light" | "dark" | "system"

interface ThemeSyncContextValue {
  theme: Theme | undefined
  setTheme: (theme: Theme) => void
}

const ThemeSyncContext = createContext<ThemeSyncContextValue | null>(null)

async function fetchThemePreference(): Promise<Theme | null> {
  try {
    const res = await fetch("/api/user/preferences")
    if (!res.ok) return null
    const data = await res.json()
    if (data.theme === "light" || data.theme === "dark" || data.theme === "system") {
      return data.theme
    }
    return null
  } catch {
    return null
  }
}

async function saveThemePreference(theme: Theme): Promise<void> {
  try {
    await fetch("/api/user/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme }),
    })
  } catch { /* ignore */ }
}

export function ThemeSyncProvider({ children }: { children: React.ReactNode }) {
  const { theme: nextTheme, setTheme: nextSetTheme } = useTheme()
  const userChanged = useRef(false)

  useEffect(() => {
    fetchThemePreference().then((savedTheme) => {
      if (savedTheme && !userChanged.current && savedTheme !== nextTheme) {
        nextSetTheme(savedTheme)
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const setTheme = useCallback((newTheme: Theme) => {
    userChanged.current = true
    nextSetTheme(newTheme)
    saveThemePreference(newTheme)
  }, [nextSetTheme])

  return (
    <ThemeSyncContext.Provider value={{ theme: nextTheme as Theme | undefined, setTheme }}>
      {children}
    </ThemeSyncContext.Provider>
  )
}

export function useThemeSync() {
  const ctx = useContext(ThemeSyncContext)
  if (!ctx) throw new Error("useThemeSync must be used within ThemeSyncProvider")
  return ctx
}
