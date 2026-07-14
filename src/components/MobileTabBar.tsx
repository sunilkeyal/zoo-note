"use client"

import React from "react"

export type MobileTab = "home" | "folders" | "search" | "favorites" | "more"

interface MobileTabBarProps {
  activeTab: MobileTab
  onTabChange: (tab: MobileTab) => void
}

const TABS: { id: MobileTab; icon: string; label: string }[] = [
  { id: "home", icon: "🏠", label: "Home" },
  { id: "folders", icon: "📁", label: "Folders" },
  { id: "search", icon: "🔍", label: "Search" },
  { id: "favorites", icon: "⭐", label: "Favorites" },
  { id: "more", icon: "⋯", label: "More" },
]

export default function MobileTabBar({ activeTab, onTabChange }: MobileTabBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-border flex bg-background z-40">
      {TABS.map((tab) => (
        <div
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex flex-col items-center gap-0.5 py-2 cursor-pointer flex-1 min-h-[44px] justify-center ${
            activeTab === tab.id
              ? "text-blue-600 font-semibold"
              : "text-muted-foreground"
          }`}
        >
          <span className="text-lg">{tab.icon}</span>
          <span className="text-[10px]">{tab.label}</span>
        </div>
      ))}
    </div>
  )
}
