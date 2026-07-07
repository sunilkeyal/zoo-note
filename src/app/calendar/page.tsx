"use client"

import { CalendarDays } from "lucide-react"

export default function CalendarPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="size-10 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center shrink-0">
          <CalendarDays className="size-5 text-sky-500 dark:text-sky-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-xs text-muted-foreground">View your notes on a calendar</p>
        </div>
      </div>
      <div className="rounded-xl border border-dashed bg-muted/30 p-10 text-center flex flex-col items-center gap-3 mx-auto max-w-xs">
        <div className="size-12 rounded-full bg-muted flex items-center justify-center">
          <CalendarDays className="size-6 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-sm">Coming soon</h3>
      </div>
    </div>
  )
}
