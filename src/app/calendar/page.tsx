"use client"

import { CalendarDays } from "lucide-react"

export default function CalendarPage() {
  return (
    <div className="py-2">
      <div className="flex items-center gap-3 mb-2">
        <div className="size-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <CalendarDays className="size-5 text-blue-500" />
        </div>
        <h1 className="text-2xl font-bold">Calendar</h1>
      </div>
      <p className="text-muted-foreground">
        Coming soon — view your notes on a calendar, organized by creation and modification dates.
      </p>
    </div>
  )
}
