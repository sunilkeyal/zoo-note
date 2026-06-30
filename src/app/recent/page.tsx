"use client"

import { Clock } from "lucide-react"

export default function RecentPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="size-16 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-4">
        <Clock className="size-8 text-violet-500" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Recent</h1>
      <p className="text-muted-foreground max-w-md">
        Coming soon — quickly jump back to notes you&apos;ve recently viewed or edited.
      </p>
    </div>
  )
}
