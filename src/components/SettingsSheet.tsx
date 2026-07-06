"use client"

import { useEffect } from "react"
import { X } from "lucide-react"
import type { SidebarDensity } from "@/hooks/use-sidebar-density"

interface SettingsSheetProps {
  open: boolean
  onClose: () => void
  density: SidebarDensity
  onDensityChange: (density: SidebarDensity) => void
}

const modes: { value: SidebarDensity; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "compact", label: "Compact" },
  { value: "dense", label: "Dense" },
]

export default function SettingsSheet({ open, onClose, density, onDensityChange }: SettingsSheetProps) {
  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, onClose])

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50"
          onClick={onClose}
        />
      )}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-80 bg-background shadow-xl border-l border-border transform transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 h-14 border-b border-border">
          <h2 className="text-base font-semibold">Settings</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-accent">
            <X className="size-4" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-1">Appearance</h3>
            <p className="text-xs text-muted-foreground mb-3">Adjust the sidebar density</p>

            <div className="flex gap-2">
              {modes.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => onDensityChange(mode.value)}
                  className={`flex-1 px-3 py-2 text-sm rounded-md border transition-colors ${
                    density === mode.value
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
