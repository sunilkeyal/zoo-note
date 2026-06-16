"use client"

import React from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import AppHeader from "@/components/AppHeader"
import NotesSidebar from "@/components/NotesSidebar"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <NotesSidebar />
      <SidebarInset className="overflow-hidden">
        <AppHeader />
        <main className="p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
