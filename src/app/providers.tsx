"use client"

import { ThemeProvider } from "next-themes"
import { ImportProvider } from "@/contexts/ImportContext"
import { NoteProvider } from "@/contexts/NoteContext"
import { SessionProvider } from "next-auth/react"
import { SidebarDensityProvider } from "@/contexts/SidebarDensityContext"
import { ThemeSyncProvider } from "@/contexts/ThemeSyncContext"
import { Toaster } from "sonner"
import { OfflineBanner } from "@/components/OfflineBanner"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <ThemeSyncProvider>
          <SidebarDensityProvider>
            <NoteProvider>
              <ImportProvider>
                <OfflineBanner />
                {children}
              </ImportProvider>
            </NoteProvider>
          </SidebarDensityProvider>
        </ThemeSyncProvider>
      </ThemeProvider>
      <Toaster />
    </SessionProvider>
  )
}
