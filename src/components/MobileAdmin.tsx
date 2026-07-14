"use client"

import React from "react"

interface MobileAdminProps {
  stats: { users: number; notes: number; storage: string; imports: number }
  onBack: () => void
}

export default function MobileAdmin({ stats, onBack }: MobileAdminProps) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-4 pt-3 pb-2 flex items-center gap-2 border-b border-border">
        <span onClick={onBack} className="text-lg cursor-pointer text-blue-600">←</span>
        <span className="text-[17px] font-bold">Admin Dashboard</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          {[
            { label: "Users", value: stats.users.toLocaleString(), color: "#dbeafe" },
            { label: "Notes", value: stats.notes.toLocaleString(), color: "#dcfce7" },
            { label: "Storage", value: stats.storage, color: "#fef3c7" },
            { label: "Imports", value: stats.imports.toLocaleString(), color: "#e0e7ff" },
          ].map((stat, i) => (
            <div key={i} className="p-3.5 rounded-[10px]" style={{ background: stat.color }}>
              <div className="text-xl font-bold">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Management</div>
        {[
          { icon: "👥", label: "User Management", desc: "View and manage user accounts" },
          { icon: "📝", label: "All Notes", desc: "Browse and moderate all notes" },
          { icon: "📁", label: "Folder Management", desc: "Create, rename, delete folders" },
          { icon: "🔧", label: "System Settings", desc: "App configuration and limits" },
          { icon: "📋", label: "Audit Logs", desc: "View system activity history" },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3 py-2.5 border-b border-border">
            <span className="text-lg">{item.icon}</span>
            <div className="flex-1">
              <div className="text-sm font-medium">{item.label}</div>
              <div className="text-xs text-muted-foreground">{item.desc}</div>
            </div>
            <span className="text-muted-foreground">›</span>
          </div>
        ))}
      </div>
    </div>
  )
}
