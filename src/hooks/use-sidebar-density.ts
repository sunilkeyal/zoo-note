"use client"

import { useState, useCallback, useEffect } from "react"

export type SidebarDensity = "default" | "compact" | "dense"

const STORAGE_KEY = "sidebar_density"

export function useSidebarDensity() {
  const [density, setDensityState] = useState<SidebarDensity>("default")

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as SidebarDensity | null
      if (stored && ["default", "compact", "dense"].includes(stored)) {
        setDensityState(stored)
      }
    } catch { /* unavailable */ }
  }, [])

  const setDensity = useCallback((value: SidebarDensity) => {
    setDensityState(value)
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch { /* unavailable */ }
  }, [])

  return { density, setDensity }
}
