"use client"

import { ScrollText } from "lucide-react"

export default function AuditPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="size-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
          <ScrollText className="size-5 text-amber-600 dark:text-amber-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p className="text-xs text-muted-foreground">Track user actions and system events</p>
        </div>
      </div>
      <div className="rounded-xl border border-dashed bg-muted/30 p-10 text-center flex flex-col items-center gap-3 mx-auto max-w-xs">
        <div className="size-12 rounded-full bg-muted flex items-center justify-center">
          <ScrollText className="size-6 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-sm">Coming soon</h3>
      </div>
    </div>
  )
}
