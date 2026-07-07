"use client"

import { ThemeProvider } from "next-themes"
import { NoteProvider } from "@/contexts/NoteContext"
import { SessionProvider } from "next-auth/react"
import { SidebarDensityProvider } from "@/contexts/SidebarDensityContext"
import { ThemeSyncProvider } from "@/contexts/ThemeSyncContext"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <ThemeSyncProvider>
          <SidebarDensityProvider>
            <NoteProvider>
              {children}
            </NoteProvider>
          </SidebarDensityProvider>
        </ThemeSyncProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
