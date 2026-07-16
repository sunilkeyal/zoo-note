# Android PWA + Capacitor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wrap ZooNote as an installable Android APK with full offline support using Capacitor + Serwist.

**Architecture:** Capacitor wraps the Vercel-hosted Next.js app in an Android WebView. Serwist (service worker) caches the app shell and API responses. IndexedDB stores notes/folders locally for offline access. A sync queue replays offline edits when reconnected.

**Tech Stack:** Capacitor, Serwist, IndexedDB (`idb`), GitHub Actions

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Capacitor packages**

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/status-bar @capacitor/keyboard @capacitor/splash-screen
```

- [ ] **Step 2: Install Serwist and idb**

```bash
npm install serwist idb
```

- [ ] **Step 3: Verify installation**

```bash
npm ls @capacitor/core serwist idb
```

Expected: All packages listed with version numbers, no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add capacitor, serwist, and idb"
```

---

## Task 2: Configure Capacitor

**Files:**
- Create: `capacitor.config.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Create Capacitor config**

```typescript
// capacitor.config.ts
import { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.sunilkeyal.zoonote",
  appName: "ZooNote",
  webDir: ".next",
  server: {
    url: "https://YOUR-VERCEL-APP.vercel.app",
    cleartext: false,
  },
  plugins: {
    StatusBar: {
      style: "DARK",
      backgroundColor: "#000000",
    },
    Keyboard: {
      resize: "body",
    },
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#000000",
      showSpinner: true,
    },
  },
}

export default config
```

- [ ] **Step 2: Update .gitignore**

Add these lines to `.gitignore`:

```
# Capacitor
/android/
/public/sw.js
/public/workbox-*.js
/public/swe-worker-*.js
```

- [ ] **Step 3: Commit**

```bash
git add capacitor.config.ts .gitignore
git commit -m "feat: add Capacitor config and update gitignore"
```

---

## Task 3: Add Serwist to Next.js Config

**Files:**
- Modify: `next.config.mjs`

- [ ] **Step 1: Wrap next.config.mjs with Serwist**

```javascript
// next.config.mjs
import { withSerwist } from "@serwist/next"

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@sparticuz/chromium"],
  outputFileTracingIncludes: {
    "/api/notes/*/export": ["./node_modules/@sparticuz/chromium/bin/**/*"],
    "/api/notes/import/onenote": ["./src/lib/onenote/vendor/**/*"],
  },
}

export default withSerwist({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  swUrl: "/sw.js",
  reloadOnOnline: true,
})(nextConfig)
```

- [ ] **Step 2: Commit**

```bash
git add next.config.mjs
git commit -m "feat: wrap next config with Serwist"
```

---

## Task 4: Create Service Worker Entry

**Files:**
- Create: `src/sw.ts`

- [ ] **Step 1: Create service worker with caching strategies**

```typescript
// src/sw.ts
import { precacheAndRoute } from "serwist"
import { registerRoute } from "serwist"
import { NetworkFirst, CacheFirst, NetworkOnly } from "serwist"

// Precache app shell (HTML, JS, CSS)
precacheAndRoute(self.__WB_MANIFEST)

// API routes: network-first (fallback to cache)
const apiStrategy = new NetworkFirst({
  cacheName: "api-cache",
  networkTimeoutSeconds: 3,
  plugins: [
    {
      cacheDidUpdate: async ({ cache, request }) => {
        // Notify the app about fresh data
        const clients = await self.clients.matchAll()
        clients.forEach((client) => {
          client.postMessage({ type: "SW_CACHE_UPDATED", url: request.url })
        })
      },
    },
  ],
})

registerRoute(
  ({ url }) => url.pathname.startsWith("/api/notes") || url.pathname.startsWith("/api/folders"),
  apiStrategy
)

// Static assets: cache-first
const staticStrategy = new CacheFirst({
  cacheName: "static-assets",
  plugins: [
    {
      cacheWillUpdate: async ({ response }) => {
        return response.type === "basic" ? response : null
      },
    },
  ],
})

registerRoute(
  ({ request }) => request.destination === "image" || request.destination === "font",
  staticStrategy
)

// Auth routes: network-only (never cache)
registerRoute(
  ({ url }) => url.pathname.startsWith("/api/auth"),
  new NetworkOnly()
)

// Listen for messages from the app
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
})
```

- [ ] **Step 2: Commit**

```bash
git add src/sw.ts
git commit -m "feat: add Serwist service worker with caching strategies"
```

---

## Task 5: Add SerwistProvider to Providers

**Files:**
- Modify: `src/app/providers.tsx`

- [ ] **Step 1: Add SerwistProvider**

```typescript
"use client"

import { ThemeProvider } from "next-themes"
import { ImportProvider } from "@/contexts/ImportContext"
import { NoteProvider } from "@/contexts/NoteContext"
import { SessionProvider } from "next-auth/react"
import { SidebarDensityProvider } from "@/contexts/SidebarDensityContext"
import { ThemeSyncProvider } from "@/contexts/ThemeSyncContext"
import { Toaster } from "sonner"
import { SerwistProvider } from "@serwist/react"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SerwistProvider>
      <SessionProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ThemeSyncProvider>
            <SidebarDensityProvider>
              <NoteProvider>
                <ImportProvider>
                  {children}
                </ImportProvider>
              </NoteProvider>
            </SidebarDensityProvider>
          </ThemeSyncProvider>
        </ThemeProvider>
        <Toaster />
      </SessionProvider>
    </SerwistProvider>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/providers.tsx
git commit -m "feat: add SerwistProvider to app providers"
```

---

## Task 6: Create IndexedDB Cache Layer

**Files:**
- Create: `src/lib/offline-db.ts`

- [ ] **Step 1: Create IndexedDB cache module**

```typescript
// src/lib/offline-db.ts
import { openDB, type IDBPDatabase } from "idb"

const DB_NAME = "zoonote-offline"
const DB_VERSION = 1

interface ZooNoteDB {
  notes: {
    key: string
    value: any
    indexes: { "by-userId": string; "by-updatedAt": string }
  }
  folders: {
    key: string
    value: any
    indexes: { "by-userId": string }
  }
  sync_queue: {
    key: string
    value: {
      id: string
      action: "create" | "update" | "delete"
      endpoint: string
      method: string
      body?: any
      timestamp: number
      status: "pending" | "syncing" | "synced" | "failed"
      retries: number
    }
    indexes: { "by-status": string; "by-timestamp": string }
  }
}

let dbPromise: Promise<IDBPDatabase<ZooNoteDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<ZooNoteDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Notes store
        const noteStore = db.createObjectStore("notes", { keyPath: "_id" })
        noteStore.createIndex("by-userId", "userId")
        noteStore.createIndex("by-updatedAt", "updatedAt")

        // Folders store
        const folderStore = db.createObjectStore("folders", { keyPath: "_id" })
        folderStore.createIndex("by-userId", "userId")

        // Sync queue store
        const syncStore = db.createObjectStore("sync_queue", { keyPath: "id" })
        syncStore.createIndex("by-status", "status")
        syncStore.createIndex("by-timestamp", "timestamp")
      },
    })
  }
  return dbPromise
}

// Notes
export async function cacheNotes(notes: any[]) {
  const db = await getDB()
  const tx = db.transaction("notes", "readwrite")
  for (const note of notes) {
    await tx.store.put(note)
  }
  await tx.done
}

export async function getCachedNotes(userId: string): Promise<any[]> {
  const db = await getDB()
  return db.getAllFromIndex("notes", "by-userId", userId)
}

export async function cacheNote(note: any) {
  const db = await getDB()
  await db.put("notes", note)
}

export async function deleteCachedNote(id: string) {
  const db = await getDB()
  await db.delete("notes", id)
}

// Folders
export async function cacheFolders(folders: any[]) {
  const db = await getDB()
  const tx = db.transaction("folders", "readwrite")
  for (const folder of folders) {
    await tx.store.put(folder)
  }
  await tx.done
}

export async function getCachedFolders(userId: string): Promise<any[]> {
  const db = await getDB()
  return db.getAllFromIndex("folders", "by-userId", userId)
}

export async function cacheFolder(folder: any) {
  const db = await getDB()
  await db.put("folders", folder)
}

export async function deleteCachedFolder(id: string) {
  const db = await getDB()
  await db.delete("folders", id)
}

// Sync Queue
export async function addToSyncQueue(entry: Omit<ZooNoteDB["sync_queue"]["value"], "id" | "status" | "retries">) {
  const db = await getDB()
  const id = `${entry.action}-${entry.endpoint}-${Date.now()}`
  await db.put("sync_queue", {
    ...entry,
    id,
    status: "pending",
    retries: 0,
  })
  return id
}

export async function getPendingSyncEntries(): Promise<ZooNoteDB["sync_queue"]["value"][]> {
  const db = await getDB()
  return db.getAllFromIndex("sync_queue", "by-status", "pending")
}

export async function updateSyncEntryStatus(
  id: string,
  status: "pending" | "syncing" | "synced" | "failed",
  retries?: number
) {
  const db = await getDB()
  const entry = await db.get("sync_queue", id)
  if (entry) {
    entry.status = status
    if (retries !== undefined) entry.retries = retries
    await db.put("sync_queue", entry)
  }
}

export async function removeSyncEntry(id: string) {
  const db = await getDB()
  await db.delete("sync_queue", id)
}

export async function getFailedSyncEntries(): Promise<ZooNoteDB["sync_queue"]["value"][]> {
  const db = await getDB()
  return db.getAllFromIndex("sync_queue", "by-status", "failed")
}

export async function getSyncQueueCount(): Promise<number> {
  const db = await getDB()
  const all = await db.getAll("sync_queue")
  return all.filter((e) => e.status === "pending" || e.status === "syncing").length
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/offline-db.ts
git commit -m "feat: add IndexedDB cache layer for offline data"
```

---

## Task 7: Create Sync Queue Logic

**Files:**
- Create: `src/lib/sync-queue.ts`

- [ ] **Step 1: Create sync queue processor**

```typescript
// src/lib/sync-queue.ts
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/sync-queue.ts
git commit -m "feat: add sync queue processor with retry logic"
```

---

## Task 8: Create Online Status Hook

**Files:**
- Create: `src/hooks/use-online-status.ts`

- [ ] **Step 1: Create online status hook**

```typescript
// src/hooks/use-online-status.ts
"use client"

import { useState, useEffect, useCallback } from "react"
import { getSyncQueueCount } from "@/lib/offline-db"
import { processSyncQueue } from "@/lib/sync-queue"

export type OnlineStatus = {
  isOnline: boolean
  isSyncing: boolean
  pendingCount: number
  syncNow: () => Promise<void>
}

export function useOnlineStatus(): OnlineStatus {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  )
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  const updatePendingCount = useCallback(async () => {
    const count = await getSyncQueueCount()
    setPendingCount(count)
  }, [])

  const syncNow = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return
    setIsSyncing(true)
    try {
      await processSyncQueue()
      await updatePendingCount()
    } finally {
      setIsSyncing(false)
    }
  }, [isSyncing, updatePendingCount])

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      syncNow()
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    updatePendingCount()

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [syncNow, updatePendingCount])

  // Periodic pending count update
  useEffect(() => {
    const interval = setInterval(updatePendingCount, 10000)
    return () => clearInterval(interval)
  }, [updatePendingCount])

  return { isOnline, isSyncing, pendingCount, syncNow }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/use-online-status.ts
git commit -m "feat: add useOnlineStatus hook"
```

---

## Task 9: Create OfflineBanner Component

**Files:**
- Create: `src/components/OfflineBanner.tsx`

- [ ] **Step 1: Create OfflineBanner component**

```tsx
// src/components/OfflineBanner.tsx
"use client"

import { useState } from "react"
import { useOnlineStatus } from "@/hooks/use-online-status"
import { WifiOff, X } from "lucide-react"

export function OfflineBanner() {
  const { isOnline } = useOnlineStatus()
  const [dismissed, setDismissed] = useState(false)

  if (isOnline || dismissed) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-amber-500 px-4 py-2 text-sm text-white dark:bg-amber-600">
      <div className="flex items-center gap-2">
        <WifiOff className="h-4 w-4" />
        <span>You&apos;re offline — changes will sync when reconnected</span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="ml-2 rounded p-1 hover:bg-amber-600 dark:hover:bg-amber-700"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/OfflineBanner.tsx
git commit -m "feat: add OfflineBanner component"
```

---

## Task 10: Create SyncIndicator Component

**Files:**
- Create: `src/components/SyncIndicator.tsx`

- [ ] **Step 1: Create SyncIndicator component**

```tsx
// src/components/SyncIndicator.tsx
"use client"

import { useOnlineStatus } from "@/hooks/use-online-status"
import { Cloud, CloudOff, RefreshCw } from "lucide-react"

export function SyncIndicator() {
  const { isOnline, isSyncing, pendingCount, syncNow } = useOnlineStatus()

  return (
    <button
      onClick={syncNow}
      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
      title={
        !isOnline
          ? "Offline"
          : isSyncing
            ? "Syncing..."
            : pendingCount > 0
              ? `${pendingCount} pending`
              : "Synced"
      }
    >
      {!isOnline ? (
        <CloudOff className="h-4 w-4 text-amber-500" />
      ) : isSyncing ? (
        <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
      ) : pendingCount > 0 ? (
        <Cloud className="h-4 w-4 text-amber-500" />
      ) : (
        <Cloud className="h-4 w-4 text-green-500" />
      )}
      <span className="hidden sm:inline">
        {!isOnline ? "Offline" : isSyncing ? "Syncing" : pendingCount > 0 ? `${pendingCount}` : "Synced"}
      </span>
    </button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SyncIndicator.tsx
git commit -m "feat: add SyncIndicator component"
```

---

## Task 11: Add SyncIndicator to Mobile Header

**Files:**
- Modify: `src/components/AppHeader.tsx`

- [ ] **Step 1: Read AppHeader.tsx to understand structure**

Read `src/components/AppHeader.tsx` and identify where to add the SyncIndicator in the mobile header area.

- [ ] **Step 2: Import and add SyncIndicator**

Add `import { SyncIndicator } from "@/components/SyncIndicator"` at the top, then place `<SyncIndicator />` in the mobile header section (next to other header controls).

- [ ] **Step 3: Commit**

```bash
git add src/components/AppHeader.tsx
git commit -m "feat: add SyncIndicator to mobile header"
```

---

## Task 12: Add OfflineBanner to Layout

**Files:**
- Modify: `src/app/providers.tsx`

- [ ] **Step 1: Import and add OfflineBanner**

```typescript
"use client"

import { ThemeProvider } from "next-themes"
import { ImportProvider } from "@/contexts/ImportContext"
import { NoteProvider } from "@/contexts/NoteContext"
import { SessionProvider } from "next-auth/react"
import { SidebarDensityProvider } from "@/contexts/SidebarDensityContext"
import { ThemeSyncProvider } from "@/contexts/ThemeSyncContext"
import { Toaster } from "sonner"
import { SerwistProvider } from "@serwist/react"
import { OfflineBanner } from "@/components/OfflineBanner"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SerwistProvider>
      <SessionProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ThemeSyncProvider>
            <SidebarDensityProvider>
              <NoteProvider>
                <ImportProvider>
                  <OfflineBanner />
                  {children}
                </ImportProvider>
              </NoteProvider>
            </SidebarDensityProvider>
          </ThemeSyncProvider>
        </ThemeProvider>
        <Toaster />
      </SessionProvider>
    </SerwistProvider>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/providers.tsx
git commit -m "feat: add OfflineBanner to providers"
```

---

## Task 13: Create GitHub Actions Workflow

**Files:**
- Create: `.github/workflows/build-android.yml`

- [ ] **Step 1: Create workflow file**

```yaml
name: Build Android APK

on:
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Build Next.js app
        run: npm run build

      - name: Setup Java JDK
        uses: actions/setup-java@v4
        with:
          distribution: "temurin"
          java-version: "17"

      - name: Setup Android SDK
        uses: android-actions/setup-android@v3

      - name: Setup Capacitor
        run: |
          npx cap add android
          npx cap sync

      - name: Build APK
        run: |
          cd android
          ./gradlew assembleDebug

      - name: Upload APK artifact
        uses: actions/upload-artifact@v4
        with:
          name: zoonote-debug.apk
          path: android/app/build/outputs/apk/debug/app-debug.apk
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/build-android.yml
git commit -m "ci: add GitHub Actions workflow for Android APK build"
```

---

## Task 14: Verify Build Works

**Files:**
- None (verification only)

- [ ] **Step 1: Run Next.js build to verify no errors**

```bash
npm run build
```

Expected: Build completes without errors.

- [ ] **Step 2: Run linter**

```bash
npm run lint
```

Expected: No linting errors.

- [ ] **Step 3: Run tests**

```bash
npm run test
```

Expected: All tests pass.

- [ ] **Step 4: Commit any fixes if needed**

```bash
git add -A
git commit -m "fix: resolve any build/lint/test issues"
```
