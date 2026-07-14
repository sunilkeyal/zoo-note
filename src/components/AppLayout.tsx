"use client"

import React, { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import AppHeader from "@/components/AppHeader"
import NotesSidebar from "@/components/NotesSidebar"
import MobileTabBar, { type MobileTab } from "./MobileTabBar"
import NoteCardGrid from "./NoteCardGrid"
import MobileSearch from "./MobileSearch"
import MobileNewNote from "./MobileNewNote"
import MobileNewFolder from "./MobileNewFolder"
import MobileMore from "./MobileMore"
import MobileSettings from "./MobileSettings"
import MobileAdmin from "./MobileAdmin"
import { useNotes } from "@/contexts/NoteContext"
import { useIsMobile } from "@/hooks/use-mobile"
import type { Note } from "@/types"

type MobileScreen = "home" | "favorites" | "recent" | "more" | "search" | "new-note" | "new-folder" | "settings" | "admin"

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const { notes, folders, fetchNotes, fetchFolders, createNote, createFolder } = useNotes()

  const [mobileScreen, setMobileScreen] = useState<MobileScreen>("home")
  const [activeTab, setActiveTab] = useState<MobileTab>("home")

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login")
  }, [status, router])

  useEffect(() => {
    fetchNotes()
    fetchFolders()
  }, [fetchNotes, fetchFolders])

  if (status !== "authenticated") return null

  const isAdmin = (session?.user as { role?: string })?.role === "admin"

  const handleTabChange = (tab: MobileTab) => {
    setActiveTab(tab)
    setMobileScreen(tab)
  }

  const handleNoteClick = (note: Note) => {
    router.push(`/notes/${note._id}`)
  }

  const handleNewNote = (data: { title: string; folderId?: string }) => {
    createNote({ title: data.title, folderId: data.folderId || "" }).then(() => {
      setMobileScreen("home")
      setActiveTab("home")
    })
  }

  const handleNewFolder = (name: string) => {
    createFolder(name).then(() => {
      setMobileScreen("home")
    })
  }

  const handleSignOut = () => {
    router.push("/api/auth/signout")
  }

  // Desktop layout — unchanged sidebar
  if (!isMobile) {
    return (
      <SidebarProvider>
        <NotesSidebar />
        <SidebarInset className="overflow-hidden">
          <AppHeader />
          <main className="flex-1 overflow-auto px-4 sm:px-6 md:px-8 lg:px-10 py-6 w-full md:max-w-[900px] lg:max-w-[1140px]">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  // Mobile layout — bottom tabs
  const isNoteDetail = /^\/notes\/[^/]+$/.test(pathname)
  const favNotes = notes.filter((n) => n.isFavorite)
  const recentNotes = [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 20)

  return (
    <div className="flex flex-col h-dvh bg-background">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-border flex-shrink-0">
        {isNoteDetail ? (
          <div className="flex items-center gap-2">
            <span onClick={() => router.back()} className="text-lg cursor-pointer">←</span>
            <span className="text-sm font-medium">Edit Note</span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <img src="/ZooNote.png" alt="ZooNote" className="size-6 rounded-sm" />
              <span className="text-sm font-semibold">ZooNote</span>
              <span className="text-sm text-muted-foreground">·</span>
              <span className="text-sm font-medium">
                {mobileScreen === "home" && "Notes"}
                {mobileScreen === "favorites" && "Favorites"}
                {mobileScreen === "recent" && "Recent"}
                {mobileScreen === "more" && "More"}
                {mobileScreen === "search" && "Search"}
                {mobileScreen === "new-note" && "New Note"}
                {mobileScreen === "new-folder" && "New Folder"}
                {mobileScreen === "settings" && "Settings"}
                {mobileScreen === "admin" && "Admin Dashboard"}
              </span>
            </div>
            {mobileScreen === "home" && (
              <span onClick={() => setMobileScreen("search")} className="text-base text-muted-foreground cursor-pointer">🔍</span>
            )}
          </>
        )}
      </div>

      {/* Screen content */}
      <div className="flex-1 min-h-0 relative pb-16">
        {isNoteDetail ? (
          <div className="flex-1 flex flex-col min-h-0">{children}</div>
        ) : (
          <>
            {mobileScreen === "home" && (
              <>
                <NoteCardGrid notes={notes} folders={folders} onNoteClick={handleNoteClick} onNewFolder={() => setMobileScreen("new-folder")} />
                <div onClick={() => setMobileScreen("new-note")} className="fixed bottom-20 right-4 w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl shadow-lg cursor-pointer z-50">+</div>
              </>
            )}
            {mobileScreen === "favorites" && (
              <NoteCardGrid notes={favNotes} folders={folders} onNoteClick={handleNoteClick} onNewFolder={() => {}} showFolderFilter={false} />
            )}
            {mobileScreen === "recent" && (
              <NoteCardGrid notes={recentNotes} folders={folders} onNoteClick={handleNoteClick} onNewFolder={() => {}} showFolderFilter={false} />
            )}
            {mobileScreen === "search" && (
              <MobileSearch notes={notes} folders={folders} onBack={() => setMobileScreen("home")} onNoteClick={handleNoteClick} />
            )}
            {mobileScreen === "new-note" && (
              <MobileNewNote folders={folders} onBack={() => setMobileScreen("home")} onSave={handleNewNote} />
            )}
            {mobileScreen === "new-folder" && (
              <MobileNewFolder existingFolders={folders.map((f) => f.name)} onBack={() => setMobileScreen("home")} onCreate={handleNewFolder} />
            )}
            {mobileScreen === "more" && (
              <MobileMore isAdmin={isAdmin} userName={(session?.user as { email?: string })?.email || ""} onSettings={() => setMobileScreen("settings")} onAdmin={() => setMobileScreen("admin")} onSignOut={handleSignOut} />
            )}
            {mobileScreen === "settings" && (
              <MobileSettings currentTheme="light" onBack={() => setMobileScreen("more")} onThemeChange={() => {}} />
            )}
            {mobileScreen === "admin" && (
              <MobileAdmin stats={{ users: 0, notes: notes.length, storage: "0 GB", imports: 0 }} onBack={() => setMobileScreen("more")} />
            )}
          </>
        )}
      </div>

      {/* Tab bar */}
      {!isNoteDetail && <MobileTabBar activeTab={activeTab} onTabChange={handleTabChange} />}
    </div>
  )
}
