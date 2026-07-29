"use client"

import { useState, useCallback, useEffect, useRef } from "react"

const STORAGE_KEY = "sidebar_width_px"
const DEFAULT_WIDTH = 260

function getInitialWidth(): number {
  if (typeof window === "undefined") return DEFAULT_WIDTH
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const n = parseInt(stored, 10)
      if (!isNaN(n) && n >= 200 && n <= 600) return n
    }
  } catch { /* unavailable */ }
  return DEFAULT_WIDTH
}

async function fetchWidth(): Promise<number | null> {
  try {
    const res = await fetch("/api/user/preferences")
    if (!res.ok) return null
    const data = await res.json()
    if (typeof data.sidebarWidth === "number" && data.sidebarWidth >= 200 && data.sidebarWidth <= 600) {
      return data.sidebarWidth
    }
    return null
  } catch {
    return null
  }
}

async function saveWidthToApi(width: number): Promise<void> {
  try {
    await fetch("/api/user/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sidebarWidth: width }),
    })
  } catch { /* ignore */ }
}

export function useSidebarWidth() {
  const [width, setWidthState] = useState<number>(getInitialWidth)
  const userChanged = useRef(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetchWidth().then((apiWidth) => {
      if (apiWidth !== null && !userChanged.current && apiWidth !== width) {
        setWidthState(apiWidth)
        try { localStorage.setItem(STORAGE_KEY, String(apiWidth)) } catch { /* unavailable */ }
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setWidth = useCallback((value: number) => {
    userChanged.current = true
    setWidthState(value)
    try { localStorage.setItem(STORAGE_KEY, String(value)) } catch { /* unavailable */ }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      saveWidthToApi(value)
    }, 300)
  }, [])

  return { width, setWidth }
}
