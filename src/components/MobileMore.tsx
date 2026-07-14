"use client"

import React from "react"

interface MobileMoreProps {
  isAdmin: boolean
  userName: string
  onSettings: () => void
  onAdmin: () => void
  onSignOut: () => void
}

export default function MobileMore({ isAdmin, userName, onSettings, onAdmin, onSignOut }: MobileMoreProps) {
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
      <div className="px-4 pt-3 pb-2">
        <span className="text-lg font-bold">More</span>
      </div>

      <div className="px-4 flex-1 overflow-y-auto">
        {/* Account */}
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Account</div>
        <div className="flex items-center gap-3 py-2.5 border-b border-border">
          <span className="text-lg">👤</span>
          <div className="flex-1">
            <div className="text-sm font-medium">Profile</div>
            <div className="text-xs text-muted-foreground">{userName}</div>
          </div>
          <span className="text-muted-foreground">›</span>
        </div>
        <div onClick={onSettings} className="flex items-center gap-3 py-2.5 border-b border-border cursor-pointer">
          <span className="text-lg">🎨</span>
          <div className="flex-1">
            <div className="text-sm font-medium">Appearance</div>
            <div className="text-xs text-muted-foreground">Theme, density, font size</div>
          </div>
          <span className="text-muted-foreground">›</span>
        </div>

        {/* Data */}
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-1.5">Data</div>
        <div className="flex items-center gap-3 py-2.5 border-b border-border">
          <span className="text-lg">📥</span>
          <div className="flex-1">
            <div className="text-sm font-medium">Import</div>
            <div className="text-xs text-muted-foreground">OneNote, Markdown, PDF</div>
          </div>
          <span className="text-muted-foreground">›</span>
        </div>
        <div className="flex items-center gap-3 py-2.5 border-b border-border">
          <span className="text-lg">📤</span>
          <div className="flex-1">
            <div className="text-sm font-medium">Export</div>
            <div className="text-xs text-muted-foreground">Download all notes</div>
          </div>
          <span className="text-muted-foreground">›</span>
        </div>

        {/* Admin */}
        {isAdmin && (
          <>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-1.5">Admin</div>
            <div onClick={onAdmin} className="flex items-center gap-3 py-2.5 border-b border-border cursor-pointer">
              <span className="text-lg">📊</span>
              <div className="flex-1">
                <div className="text-sm font-medium">Admin Dashboard</div>
                <div className="text-xs text-muted-foreground">Users, stats, settings</div>
              </div>
              <span className="text-muted-foreground">›</span>
            </div>
          </>
        )}

        {/* Sign Out */}
        <div className="py-4 text-center">
          <div onClick={onSignOut} className="text-xs text-destructive cursor-pointer">Sign Out</div>
          <div className="text-[11px] text-muted-foreground/40 mt-2">ZooNote v0.1.0</div>
        </div>
      </div>
    </div>
  )
}
