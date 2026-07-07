"use client"

import React from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Moon, Sun } from "lucide-react"
import { useThemeSync } from "@/contexts/ThemeSyncContext"

export default function AppHeader() {
  const { theme, setTheme } = useThemeSync()
  const isDark = theme === "dark"

  return (
    <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger />
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={<Button variant="ghost" size="sm" onClick={() => setTheme(isDark ? "light" : "dark")} />}
            >
              {isDark ? <Sun /> : <Moon />}
            </TooltipTrigger>
            <TooltipContent>
              {isDark ? "Switch to light mode" : "Switch to dark mode"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </header>
  )
}
