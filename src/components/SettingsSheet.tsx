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

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
        aria-hidden="true"
        aria-label="Close settings sheet overlay"
      />
      <div
        role="dialog"
        aria-label="Settings"
        aria-modal="true"
        className="fixed top-0 right-0 h-full w-80 bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-700 z-50 flex flex-col"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Settings</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Appearance</h3>
            <p className="text-xs text-gray-500 mb-3">Adjust the sidebar density</p>

            <div className="flex gap-2">
              {modes.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => onDensityChange(mode.value)}
                  className={`flex-1 px-3 py-2 text-sm rounded-md border transition-colors ${
                    density === mode.value
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium"
                      : "border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
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
