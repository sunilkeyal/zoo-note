"use client"

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react"

export type SidebarDensity = "spacious" | "default" | "compact"

const STORAGE_KEY = "sidebar_density"

const NEW_DENSITIES = new Set(["spacious", "default", "compact"])

const OLD_TO_NEW: Record<string, SidebarDensity> = {
  dense: "compact",
}

function getInitialDensity(): SidebarDensity {
  if (typeof window === "undefined") return "default"
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return "default"
    if (NEW_DENSITIES.has(stored as SidebarDensity)) return stored as SidebarDensity
    if (stored in OLD_TO_NEW) return OLD_TO_NEW[stored]
  } catch { /* unavailable */ }
  return "default"
}

interface SidebarDensityContextValue {
  density: SidebarDensity
  setDensity: (value: SidebarDensity) => void
}

const SidebarDensityContext = createContext<SidebarDensityContextValue | null>(null)

async function fetchPreferences(): Promise<SidebarDensity | null> {
  try {
    const res = await fetch("/api/user/preferences")
    if (!res.ok) return null
    const data = await res.json()
    if (data.sidebarDensity === "spacious" || data.sidebarDensity === "default" || data.sidebarDensity === "compact") {
      return data.sidebarDensity
    }
    return "default"
  } catch {
    return null
  }
}

async function savePreference(density: SidebarDensity): Promise<void> {
  try {
    await fetch("/api/user/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sidebarDensity: density }),
    })
  } catch { /* ignore */ }
}

export function SidebarDensityProvider({ children }: { children: React.ReactNode }) {
  const [density, setDensityState] = useState<SidebarDensity>(getInitialDensity)
  const userChanged = useRef(false)

  useEffect(() => {
    const stored = getInitialDensity()
    if (stored !== density) {
      setDensityState(stored)
    }
  }, [density])

  useEffect(() => {
    fetchPreferences().then((apiDensity) => {
      if (apiDensity && !userChanged.current && apiDensity !== density) {
        setDensityState(apiDensity)
        try { localStorage.setItem(STORAGE_KEY, apiDensity) } catch { /* unavailable */ }
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const setDensity = useCallback((value: SidebarDensity) => {
    userChanged.current = true
    setDensityState(value)
    try { localStorage.setItem(STORAGE_KEY, value) } catch { /* unavailable */ }
    savePreference(value)
  }, [])

  return (
    <SidebarDensityContext.Provider value={{ density, setDensity }}>
      {children}
    </SidebarDensityContext.Provider>
  )
}

export function useSidebarDensity() {
  const ctx = useContext(SidebarDensityContext)
  if (!ctx) throw new Error("useSidebarDensity must be used within SidebarDensityProvider")
  return ctx
}
