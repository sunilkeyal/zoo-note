"use client"

import React from "react"

interface R2Data {
  storageBytes: number
  totalObjects: number
  cost: number
}

interface MobileAdminProps {
  stats: {
    totalUsers: number
    activeToday: number
    totalNotes: number
    newThisWeek: number
    storage: string
    health: { status: string; uptime: string; responseTime: string; nodeVersion: string; environment: string } | null
    r2: R2Data | null
  }
  onBack: () => void
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[Math.min(i, units.length - 1)]}`
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function MobileAdmin({ stats, onBack }: MobileAdminProps) {
  const cards = [
    { label: "Total Users", value: stats.totalUsers.toLocaleString(), sub: `${stats.activeToday} active today`, color: "#dbeafe" },
    { label: "Total Notes", value: stats.totalNotes.toLocaleString(), sub: `+${stats.newThisWeek} this week`, color: "#dcfce7" },
    { label: "Mongo Storage", value: stats.storage, color: "#fef3c7" },
    ...(stats.r2 ? [
      { label: "R2 Storage", value: formatBytes(stats.r2.storageBytes), sub: `${stats.r2.totalObjects.toLocaleString()} objects`, color: "#ecfdf5" },
    ] : []),
    { label: "Uptime", value: stats.health ? formatUptime(parseInt(stats.health.uptime)) : "...", color: "#f3e8ff" },
    { label: "Response Time", value: stats.health ? `${stats.health.responseTime}ms` : "...", sub: stats.health && parseInt(stats.health.responseTime) > 100 ? "Slow" : undefined, color: "#fce7f3" },
    { label: "System Health", value: stats.health?.status === "healthy" ? "Healthy" : "Issues", color: stats.health?.status === "healthy" ? "#e0e7ff" : "#fee2e2" },
    { label: "System Info", value: stats.health ? stats.health.nodeVersion : "...", sub: stats.health?.environment, color: "#e0f2fe" },
    ...(stats.r2 ? [
      { label: "R2 Cost", value: `$${stats.r2.cost.toFixed(2)}`, color: "#fff7ed" },
    ] : []),
  ]

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-4 pt-3 pb-2 flex items-center gap-2 border-b border-border">
        <span onClick={onBack} className="text-lg cursor-pointer text-blue-600">←</span>
        <span className="text-[17px] font-bold">Admin Dashboard</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="grid grid-cols-2 gap-2">
          {cards.map((card, i) => (
            <div key={i} className="p-3.5 rounded-[10px]" style={{ background: card.color }}>
              <div className="text-xl font-bold">{card.value}</div>
              <div className="text-xs text-muted-foreground">{card.label}</div>
              {card.sub && <div className="text-[10px] text-muted-foreground mt-0.5">{card.sub}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
