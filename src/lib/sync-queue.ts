import {
  getPendingSyncEntries,
  updateSyncEntryStatus,
  removeSyncEntry,
  cacheNote,
  cacheFolder,
  deleteCachedNote,
  deleteCachedFolder,
} from "./offline-db"

const MAX_RETRIES = 3
const BACKOFF_BASE_MS = 1000

let isSyncing = false

export function getIsSyncing() {
  return isSyncing
}

export async function processSyncQueue(): Promise<boolean> {
  if (isSyncing || !navigator.onLine) return false

  isSyncing = true
  let hadErrors = false

  try {
    const entries = await getPendingSyncEntries()

    for (const entry of entries) {
      try {
        await updateSyncEntryStatus(entry.id, "syncing")

        const fetchOptions: RequestInit = {
          method: entry.method,
          headers: { "Content-Type": "application/json" },
        }

        if (entry.body && entry.method !== "GET" && entry.method !== "DELETE") {
          fetchOptions.body = JSON.stringify(entry.body)
        }

        const response = await fetch(entry.endpoint, fetchOptions)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const result = await response.json()

        // Update local cache with server response
        if (entry.endpoint.includes("/api/notes")) {
          if (entry.method === "DELETE") {
            await deleteCachedNote(entry.body?.id)
          } else if (result.data) {
            await cacheNote(result.data)
          }
        } else if (entry.endpoint.includes("/api/folders")) {
          if (entry.method === "DELETE") {
            await deleteCachedFolder(entry.body?.id)
          } else if (result.data) {
            await cacheFolder(result.data)
          }
        }

        await removeSyncEntry(entry.id)
      } catch (error) {
        hadErrors = true
        const newRetries = entry.retries + 1

        if (newRetries >= MAX_RETRIES) {
          await updateSyncEntryStatus(entry.id, "failed", newRetries)
        } else {
          await updateSyncEntryStatus(entry.id, "pending", newRetries)
          // Exponential backoff
          await new Promise((resolve) =>
            setTimeout(resolve, BACKOFF_BASE_MS * Math.pow(2, entry.retries))
          )
        }
      }
    }
  } finally {
    isSyncing = false
  }

  return !hadErrors
}

// Listen for online events
let syncInterval: ReturnType<typeof setInterval> | null = null

export function startSyncListener() {
  if (syncInterval) return

  // Try syncing every 30 seconds when online
  syncInterval = setInterval(() => {
    if (navigator.onLine) {
      processSyncQueue()
    }
  }, 30000)

  // Also sync immediately when coming online
  window.addEventListener("online", () => {
    processSyncQueue()
  })
}

export function stopSyncListener() {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }
}
