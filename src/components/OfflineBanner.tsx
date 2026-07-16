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
