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
