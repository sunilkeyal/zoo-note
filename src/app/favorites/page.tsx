"use client"

import { Star } from "lucide-react"

export default function FavoritesPage() {
  return (
    <div className="py-2">
      <div className="flex items-center gap-3 mb-2">
        <div className="size-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <Star className="size-5 text-amber-500" />
        </div>
        <h1 className="text-2xl font-bold">Favorites</h1>
      </div>
      <p className="text-muted-foreground">
        Coming soon — right-click any note to mark it as a favorite, then find it here.
      </p>
    </div>
  )
}
