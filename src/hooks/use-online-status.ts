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
