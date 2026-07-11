"use client"

import { Database } from "lucide-react"

export default function BackupPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="size-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center shrink-0">
          <Database className="size-5 text-teal-600 dark:text-teal-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Backup & Restore</h1>
          <p className="text-xs text-muted-foreground">Manage database backups and restore points</p>
        </div>
      </div>
      <div className="rounded-xl border border-dashed bg-muted/30 p-10 text-center flex flex-col items-center gap-3 mx-auto max-w-xs">
        <div className="size-12 rounded-full bg-muted flex items-center justify-center">
          <Database className="size-6 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-sm">Coming soon</h3>
      </div>
    </div>
  )
}
