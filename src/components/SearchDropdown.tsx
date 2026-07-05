"use client"

import React from "react"
import { Command, CommandList, CommandItem, CommandEmpty } from "@/components/ui/command"
import { FileText } from "lucide-react"
import { cn, stripHtml } from "@/lib/utils"
import type { Note } from "@/types"

interface SearchDropdownProps {
  open: boolean
  query: string
  results: Note[]
  onSelect: (noteId: string) => void
  onClose: () => void
  inputRef: React.RefObject<HTMLInputElement | null>
  variant?: "home" | "sidebar"
  maxItems?: number
}

export default function SearchDropdown({
  open,
  query,
  results,
  onSelect,
  onClose,
  inputRef,
  variant = "home",
  maxItems = 20,
}: SearchDropdownProps) {
  if (!open || !query.trim()) return null

  const displayResults = results.slice(0, maxItems)

  return (
    <div
      className={cn(
        "absolute top-full left-0 right-0 mt-1 border rounded-lg bg-popover shadow-lg z-50 overflow-hidden",
        variant === "sidebar" ? "text-xs" : "text-sm"
      )}
    >
      <Command shouldFilter={false}>
        <div className={cn("px-3 py-1.5 text-muted-foreground border-b",
          variant === "sidebar" ? "text-[10px]" : "text-xs"
        )}>
          {results.length} note{results.length !== 1 ? "s" : ""} found
        </div>
        <CommandList className="max-h-60 overflow-y-auto">
          {displayResults.length === 0 ? (
            <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
              No notes match your search.
            </CommandEmpty>
          ) : (
            displayResults.map((note) => (
              <CommandItem
                key={note._id}
                value={note._id}
                onSelect={() => {
                  onSelect(note._id)
                  onClose()
                }}
                className={cn(
                  "flex items-center gap-2.5 px-3 cursor-pointer aria-selected:bg-accent",
                  variant === "sidebar" ? "py-1.5" : "py-2"
                )}
              >
                <FileText className={cn(
                  "shrink-0 text-muted-foreground",
                  variant === "sidebar" ? "h-3.5 w-3.5" : "h-4 w-4"
                )} />
                <div className="min-w-0 flex-1">
                  <div className={cn(
                    "font-medium truncate",
                    variant === "sidebar" ? "text-xs" : "text-sm"
                  )}>
                    {note.title || "Untitled"}
                  </div>
                  <div className={cn(
                    "text-muted-foreground truncate",
                    variant === "sidebar" ? "text-[10px]" : "text-xs"
                  )}>
                    {stripHtml(note.content) || "No content"}
                  </div>
                </div>
              </CommandItem>
            ))
          )}
        </CommandList>
      </Command>
    </div>
  )
}
