"use client"

import { CalendarDays } from "lucide-react"

export default function CalendarPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="size-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
        <CalendarDays className="size-8 text-blue-500" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Calendar</h1>
      <p className="text-muted-foreground max-w-md">
        Coming soon — view your notes on a calendar, organized by creation and modification dates.
      </p>
    </div>
  )
}
