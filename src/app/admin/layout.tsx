"use client"

import React, { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import AppHeader from "@/components/AppHeader"
import NotesSidebar from "@/components/NotesSidebar"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login")
    } else if (status === "authenticated" && session?.user?.role !== "admin") {
      router.replace("/")
    }
  }, [status, session, router])

  if (status !== "authenticated" || session?.user?.role !== "admin") {
    return null
  }

  return (
    <SidebarProvider>
      <ResizablePanelGroup
        orientation="horizontal"
        className="flex-1"
        style={{ height: '100dvh' }}
      >
        <ResizablePanel id="sidebar" defaultSize="18%" minSize="200px" maxSize="25%" className="h-full">
          <NotesSidebar resizable />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel id="content" defaultSize="82%" minSize="65%" className="h-full">
          <SidebarInset className="overflow-hidden">
            <AppHeader />
            <main className="flex-1 overflow-auto px-4 sm:px-6 md:px-8 lg:px-10 py-6 w-full md:max-w-[900px] lg:max-w-[1140px]">{children}</main>
          </SidebarInset>
        </ResizablePanel>
      </ResizablePanelGroup>
    </SidebarProvider>
  )
}
