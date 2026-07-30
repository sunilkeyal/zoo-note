"use client"

import React, { useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import AppHeader from "@/components/AppHeader"
import NotesSidebar from "@/components/NotesSidebar"
import { getInitialSidebarWidth, saveSidebarWidthLocal, saveSidebarWidthApi } from "@/hooks/use-sidebar-width"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const sidebarWidthRef = useRef(getInitialSidebarWidth())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login")
    } else if (status === "authenticated" && session?.user?.role !== "admin") {
      router.replace("/")
    }
  }, [status, session, router])

  const handleSidebarResize = (panelSize: { inPixels: number }) => {
    const w = Math.round(panelSize.inPixels)
    sidebarWidthRef.current = w
    saveSidebarWidthLocal(w)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => saveSidebarWidthApi(w), 300)
  }

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
        <ResizablePanel
          id="sidebar"
          defaultSize={getInitialSidebarWidth()}
          minSize={200}
          maxSize={500}
          groupResizeBehavior="preserve-pixel-size"
          onResize={handleSidebarResize}
          className="h-full"
        >
          <NotesSidebar resizable />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel id="content" className="h-full">
          <SidebarInset className="overflow-hidden">
            <AppHeader />
            <main className="flex-1 overflow-auto px-4 sm:px-6 md:px-8 lg:px-10 py-6 w-full md:max-w-[900px] lg:max-w-[1140px]">{children}</main>
          </SidebarInset>
        </ResizablePanel>
      </ResizablePanelGroup>
    </SidebarProvider>
  )
}
