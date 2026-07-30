"use client"

import { X } from "lucide-react"
import type { SidebarDensity } from "@/hooks/use-sidebar-density"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer"

interface SettingsSheetProps {
  open: boolean
  onClose: () => void
  density: SidebarDensity
  onDensityChange: (density: SidebarDensity) => void
}

const modes: { value: SidebarDensity; label: string; description: string }[] = [
  { value: "spacious", label: "Spacious", description: "Most spacious" },
  { value: "default", label: "Default", description: "Medium density" },
  { value: "compact", label: "Compact", description: "Most compact" },
]

export default function SettingsSheet({ open, onClose, density, onDensityChange }: SettingsSheetProps) {
  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()} swipeDirection="right">
      <DrawerContent className="w-80 flex flex-col [--drawer-inset:0.5rem] [--drawer-bleed-background:transparent] rounded-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <DrawerTitle className="text-sm font-semibold text-gray-900 dark:text-white">Settings</DrawerTitle>
          <DrawerClose render={<button aria-label="Close" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" />}>
            <X size={15} />
          </DrawerClose>
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
      </DrawerContent>
    </Drawer>
  )
}
