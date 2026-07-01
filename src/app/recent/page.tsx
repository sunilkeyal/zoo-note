"use client"

import { Clock } from "lucide-react"

export default function RecentPage() {
  return (
    <div className="py-2">
      <div className="flex items-center gap-3 mb-2">
        <div className="size-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
          <Clock className="size-5 text-violet-500" />
        </div>
        <h1 className="text-2xl font-bold">Recent</h1>
      </div>
      <p className="text-muted-foreground">
        Coming soon — quickly jump back to notes you&apos;ve recently viewed or edited.
      </p>
    </div>
  )
}
