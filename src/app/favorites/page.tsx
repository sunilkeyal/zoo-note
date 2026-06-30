"use client"

import { Star } from "lucide-react"

export default function FavoritesPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="size-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
        <Star className="size-8 text-amber-500" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Favorites</h1>
      <p className="text-muted-foreground max-w-md">
        Coming soon — right-click any note to mark it as a favorite, then find it here.
      </p>
    </div>
  )
}
