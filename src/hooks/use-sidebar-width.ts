"use client"

const STORAGE_KEY = "sidebar_width_px"
const DEFAULT_WIDTH = 260

export function getInitialSidebarWidth(): number {
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

export function saveSidebarWidthLocal(width: number): void {
  try { localStorage.setItem(STORAGE_KEY, String(width)) } catch { /* unavailable */ }
}

export async function fetchSidebarWidth(): Promise<number | null> {
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

export async function saveSidebarWidthApi(width: number): Promise<void> {
  try {
    await fetch("/api/user/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sidebarWidth: width }),
    })
  } catch { /* ignore */ }
}
