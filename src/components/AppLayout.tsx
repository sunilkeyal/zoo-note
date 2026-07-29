"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import AppHeader from "@/components/AppHeader"
import NotesSidebar from "@/components/NotesSidebar"
import MobileTabBar, { type MobileTab } from "./MobileTabBar"
import NoteCardGrid from "./NoteCardGrid"
import MobileFolders from "./MobileFolders"
import MobileFolderDetail from "./MobileFolderDetail"
import MobileSearch from "./MobileSearch"
import FolderPickerModal from "./FolderPickerModal"
import MobileNewFolder from "./MobileNewFolder"
import MobileMore from "./MobileMore"
import MobileSettings from "./MobileSettings"
import MobileAdmin from "./MobileAdmin"
import MobileAccount from "./MobileAccount"
import MobileImportExport from "./MobileImportExport"
import MainArea from "./MainArea"
import { useNotes } from "@/contexts/NoteContext"
import { useIsMobile } from "@/hooks/use-mobile"
import { useSidebarWidth } from "@/hooks/use-sidebar-width"
import { useThemeSync } from "@/contexts/ThemeSyncContext"
import type { Note, Folder } from "@/types"

type MobileScreen = "home" | "folders" | "folder-detail" | "favorites" | "more" | "search" | "new-folder" | "settings" | "admin" | "note-detail" | "account" | "import-export"

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const { theme, setTheme } = useThemeSync()
  const { width: sidebarWidthPx, setWidth: setSidebarWidthPx } = useSidebarWidth()
  const { notes, folders, fetchNotes, fetchFolders, createNote, createFolder, activeNoteId, setActiveNoteId } = useNotes()

  const [mobileScreen, setMobileScreen] = useState<MobileScreen>("home")
  const [activeTab, setActiveTab] = useState<MobileTab>("home")
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null)
  const [showFolderPicker, setShowFolderPicker] = useState(false)
  const [previousScreen, setPreviousScreen] = useState<MobileScreen>("home")
  const [isCreatingNote, setIsCreatingNote] = useState(false)
  const [adminStats, setAdminStats] = useState<{
    totalUsers: number; activeToday: number; totalNotes: number; newThisWeek: number; storage: string
    health: { status: string; uptime: string; responseTime: string; nodeVersion: string; environment: string } | null
    r2: { storageBytes: number; totalObjects: number; cost: number } | null
  } | null>(null)

  const formatBytes = useCallback((bytes: number): string => {
    if (bytes === 0) return "0 B"
    const units = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[Math.min(i, units.length - 1)]}`
  }, [])

  const fetchAdminStats = useCallback(async () => {
    const results = await Promise.allSettled([
      fetch("/api/admin/stats?range=7").then(r => r.json()),
      fetch("/api/admin/r2?metric=storage").then(r => r.json()),
      fetch("/api/admin/r2?metric=cost&range=7").then(r => r.json()),
    ])

    const statsJson = results[0].status === "fulfilled" ? results[0].value : null
    if (!statsJson?.success) return

    const { kpis, systemHealth } = statsJson.data
    if (!kpis) return

    let r2Data: { storageBytes: number; totalObjects: number; cost: number } | null = null
    const r2Storage = results[1].status === "fulfilled" ? results[1].value : null
    const r2Cost = results[2].status === "fulfilled" ? results[2].value : null
    if (r2Storage?.success && r2Cost?.success) {
      r2Data = {
        storageBytes: r2Storage.data.totalBytes ?? 0,
        totalObjects: r2Storage.data.totalObjects ?? 0,
        cost: r2Cost.data.cost ?? 0,
      }
    }

    setAdminStats({
      totalUsers: kpis.totalUsers ?? 0,
      activeToday: kpis.activeToday ?? 0,
      totalNotes: kpis.totalNotes ?? 0,
      newThisWeek: kpis.newThisWeek ?? 0,
      storage: formatBytes(kpis.storageBreakdown?.totalBytes ?? kpis.storageUsedBytes ?? 0),
      health: systemHealth ? {
        status: systemHealth.status,
        uptime: String(Math.round(systemHealth.uptimeSeconds)),
        responseTime: String(systemHealth.responseTimeMs),
        nodeVersion: systemHealth.nodeVersion,
        environment: systemHealth.environment,
      } : null,
      r2: r2Data,
    })
  }, [formatBytes])

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login")
  }, [status, router])

  useEffect(() => {
    fetchNotes()
    fetchFolders()
  }, [fetchNotes, fetchFolders])

  useEffect(() => {
    if (mobileScreen === "admin") fetchAdminStats()
  }, [mobileScreen, fetchAdminStats])

  if (status !== "authenticated") return null

  const isAdmin = (session?.user as { role?: string })?.role === "admin"

  const handleTabChange = (tab: MobileTab) => {
    setActiveTab(tab)
    setMobileScreen(tab)
  }

  const handleNoteClick = (note: Note) => {
    setPreviousScreen(mobileScreen)
    setActiveNoteId(note._id)
    setMobileScreen("note-detail")
  }

  const handleNewNote = async (folderId?: string) => {
    if (isCreatingNote) return
    setIsCreatingNote(true)
    try {
      const note = await createNote({ title: "Untitled Note", folderId: folderId || "" })
      if (note && note._id) {
        setActiveNoteId(note._id)
        setPreviousScreen(mobileScreen)
        setMobileScreen("note-detail")
      }
    } catch {
      // Note creation failed - user can retry
    } finally {
      setIsCreatingNote(false)
    }
  }

  const handleFolderPickerSelect = async (folderId: string | null) => {
    setShowFolderPicker(false)
    setIsCreatingNote(true)
    try {
      const note = await createNote({ title: "Untitled Note", folderId: folderId || "" })
      if (note && note._id) {
        setActiveNoteId(note._id)
        setPreviousScreen("home")
        setMobileScreen("note-detail")
      }
    } catch {
      // Note creation failed - user can retry
    } finally {
      setIsCreatingNote(false)
    }
  }

  const handleFolderPickerCancel = () => {
    setShowFolderPicker(false)
  }

  const handleNewFolder = (name: string) => {
    createFolder(name).then(() => {
      setMobileScreen("folders")
      setActiveTab("folders")
    })
  }

  const handleFolderClick = (folder: Folder) => {
    setSelectedFolder(folder)
    setMobileScreen("folder-detail")
  }

  const handleSignOut = () => {
    router.push("/api/auth/signout")
  }

  const handleSaveAccount = useCallback(async (data: { name: string; email: string; newPassword?: string }) => {
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error || "Failed to save")
    const { changed } = result as { changed: string[] }
    if (changed.includes("email") || changed.includes("password")) {
      setTimeout(() => signOut({ callbackUrl: "/login" }), 500)
    } else {
      if (changed.includes("name")) {
        await update({ name: data.name })
      }
    }
    return result
  }, [update])

  const handleSidebarResize = useCallback((panelSize: { inPixels: number }) => {
    setSidebarWidthPx(Math.round(panelSize.inPixels))
  }, [setSidebarWidthPx])

  // Desktop layout — resizable sidebar
  if (!isMobile) {
    return (
      <SidebarProvider>
        <ResizablePanelGroup
          orientation="horizontal"
          className="flex-1"
          style={{ height: '100dvh' }}
        >
          <ResizablePanel
            id="sidebar"
            defaultSize={sidebarWidthPx}
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
              <main className="flex-1 overflow-auto px-4 sm:px-6 md:px-8 lg:px-10 py-6 w-full md:max-w-[900px] lg:max-w-[1140px]">
                {children}
              </main>
            </SidebarInset>
          </ResizablePanel>
        </ResizablePanelGroup>
      </SidebarProvider>
    )
  }

  // Mobile layout — bottom tabs
  const isNoteDetail = mobileScreen === "note-detail" || /^\/notes\/[^/]+$/.test(pathname)
  const favNotes = notes.filter((n) => n.isFavorite)

  return (
    <div className="flex flex-col h-dvh bg-background">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-border flex-shrink-0">
        {isNoteDetail ? (
          <div className="flex items-center gap-2">
            <span onClick={() => {
              if (/^\/notes\/[^/]+$/.test(pathname)) {
                router.push("/")
              } else {
                setMobileScreen(previousScreen)
                if (previousScreen === "folder-detail" && selectedFolder) {
                  setActiveTab("folders")
                }
              }
            }} className="text-lg cursor-pointer">←</span>
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
                {mobileScreen === "folders" && "Folders"}
                {mobileScreen === "folder-detail" && selectedFolder?.name}
                {mobileScreen === "favorites" && "Favorites"}
                {mobileScreen === "more" && "More"}
                {mobileScreen === "search" && "Search"}
                {mobileScreen === "new-folder" && "New Folder"}
                {mobileScreen === "settings" && "Settings"}
                {mobileScreen === "account" && "Account"}
                {mobileScreen === "import-export" && "Import / Export"}
                {mobileScreen === "admin" && "Admin Dashboard"}
              </span>
            </div>
            {mobileScreen === "folder-detail" && (
              <span onClick={() => setMobileScreen("folders")} className="text-sm text-blue-600 cursor-pointer">← Folders</span>
            )}
          </>
        )}
      </div>

      {/* Screen content */}
      <div className="flex-1 min-h-0 relative">
        {isNoteDetail ? (
          <div className="flex-1 flex flex-col min-h-0">
            <MainArea />
          </div>
        ) : (
          <>
            {mobileScreen === "home" && (
              <>
                <NoteCardGrid notes={notes} folders={folders} onNoteClick={handleNoteClick} onNewFolder={() => setMobileScreen("new-folder")} showFolderFilter={false} />
                <div onClick={() => {
                  if (isCreatingNote) return
                  setShowFolderPicker(true)
                }} className={`fixed bottom-20 right-4 w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl shadow-lg z-50 ${isCreatingNote ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`} aria-label="Create new note" role="button">+</div>
              </>
            )}
            {mobileScreen === "folders" && (
              <MobileFolders folders={folders} notes={notes} onFolderClick={handleFolderClick} onNewFolder={() => setMobileScreen("new-folder")} />
            )}
            {mobileScreen === "folder-detail" && selectedFolder && (
              <MobileFolderDetail folder={selectedFolder} notes={notes} onBack={() => setMobileScreen("folders")} onNoteClick={handleNoteClick} onNewNote={() => handleNewNote(selectedFolder._id)} />
            )}
            {mobileScreen === "favorites" && (
              <NoteCardGrid notes={favNotes} folders={folders} onNoteClick={handleNoteClick} onNewFolder={() => {}} showFolderFilter={false} />
            )}
            {mobileScreen === "search" && (
              <MobileSearch notes={notes} folders={folders} onBack={() => setMobileScreen("home")} onNoteClick={handleNoteClick} />
            )}
            {mobileScreen === "new-folder" && (
              <MobileNewFolder existingFolders={folders.map((f) => f.name)} onBack={() => setMobileScreen("folders")} onCreate={handleNewFolder} />
            )}
            {mobileScreen === "more" && (
              <MobileMore
                isAdmin={isAdmin}
                userName={(session?.user as { email?: string })?.email || ""}
                onSettings={() => setMobileScreen("settings")}
                onAdmin={() => setMobileScreen("admin")}
                onSignOut={handleSignOut}
                onProfile={() => setMobileScreen("account")}
                onImportExport={() => setMobileScreen("import-export")}
              />
            )}
            {mobileScreen === "settings" && (
              <MobileSettings currentTheme={theme || "light"} onBack={() => setMobileScreen("more")} onThemeChange={(t) => setTheme(t as "light" | "dark" | "system")} />
            )}
            {mobileScreen === "account" && (
              <MobileAccount
                name={(session?.user as { name?: string })?.name || ""}
                email={(session?.user as { email?: string })?.email || ""}
                onBack={() => setMobileScreen("more")}
                onSave={handleSaveAccount}
              />
            )}
            {mobileScreen === "import-export" && (
              <MobileImportExport onBack={() => setMobileScreen("more")} />
            )}
            {mobileScreen === "admin" && (
              <MobileAdmin stats={adminStats ?? { totalUsers: 0, activeToday: 0, totalNotes: 0, newThisWeek: 0, storage: "0 B", health: null, r2: null }} onBack={() => setMobileScreen("more")} />
            )}
          </>
        )}
      </div>

      {/* Tab bar */}
      {!isNoteDetail && <MobileTabBar activeTab={activeTab} onTabChange={handleTabChange} />}

      {/* Folder picker modal */}
      <FolderPickerModal
        open={showFolderPicker}
        onOpenChange={setShowFolderPicker}
        folders={folders}
        onSelect={handleFolderPickerSelect}
        onCancel={handleFolderPickerCancel}
      />
    </div>
  )
}
