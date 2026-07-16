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
