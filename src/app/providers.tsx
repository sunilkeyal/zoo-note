"use client"

import { ThemeProvider } from "next-themes"
import { NoteProvider } from "@/contexts/NoteContext"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <NoteProvider>
        {children}
      </NoteProvider>
    </ThemeProvider>
  )
}
