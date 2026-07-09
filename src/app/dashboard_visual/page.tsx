"use client"

import React, { useState } from "react"

// ─── Mock data ────────────────────────────────────────────────────────────────

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const notesPerDay = [32, 58, 41, 76, 63, 29, 45]
const activeUsersPerDay = [6, 11, 8, 14, 10, 4, 7]
const storageGrowth = [1.1, 1.4, 1.6, 1.8, 2.0, 2.2, 2.3]

const last30Labels = ["Jun 9", "Jun 13", "Jun 17", "Jun 21", "Jun 25", "Jun 29", "Jul 3", "Jul 7", "Jul 9"]
const notesLast30 = [14, 22, 18, 35, 28, 44, 38, 52, 41]

const topUsers = [
  { name: "Alice M.", notes: 248, folders: 12, storage: "340 MB", lastSeen: "Today", active: true },
  { name: "Bob K.", notes: 185, folders: 8, storage: "210 MB", lastSeen: "Today", active: true },
  { name: "Carol T.", notes: 140, folders: 15, storage: "180 MB", lastSeen: "Yesterday", active: true },
  { name: "David R.", notes: 112, folders: 6, storage: "95 MB", lastSeen: "3 days ago", active: false },
  { name: "Eve S.", notes: 97, folders: 9, storage: "78 MB", lastSeen: "1 week ago", active: false },
]

const recentActivity = [
  { user: "Alice M.", action: "Created note", target: "Q3 Planning", time: "2 min ago" },
  { user: "Bob K.", action: "Created folder", target: "Work Projects", time: "15 min ago" },
  { user: "Carol T.", action: "Deleted note", target: "Draft ideas", time: "1 hour ago" },
  { user: "Admin", action: "Created user", target: "new@example.com", time: "2 hours ago" },
  { user: "David R.", action: "Exported notes", target: "PDF export", time: "3 hours ago" },
]

// ─── Shared mini components ───────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`rounded-xl border-2 ${color} p-4 flex flex-col gap-1`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

function MiniBar({ values, labels, color = "bg-violet-400" }: { values: number[]; labels: string[]; color?: string }) {
  const max = Math.max(...values)
  return (
    <div className="mt-3">
      <div className="flex items-end gap-1 h-20">
        {values.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5">
            <div className={`${color} rounded-t w-full transition-all`} style={{ height: `${(v / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        {labels.map((l, i) => <span key={i}>{l}</span>)}
      </div>
    </div>
  )
}

function MiniLine({ values, labels }: { values: number[]; labels: string[] }) {
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const h = 64
  const w = 240
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return `${x},${y}`
  }).join(" ")
  return (
    <div className="mt-3">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-16 overflow-visible">
        <polyline points={pts} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinejoin="round" />
        {values.map((v, i) => {
          const x = (i / (values.length - 1)) * w
          const y = h - ((v - min) / range) * h
          return <circle key={i} cx={x} cy={y} r="3" fill="#8b5cf6" />
        })}
      </svg>
      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        {labels.map((l, i) => <span key={i}>{l}</span>)}
      </div>
    </div>
  )
}

// ─── OPTION A: Single scroll — KPIs → Charts → User breakdown ─────────────────

function OptionA() {
  return (
    <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Dashboard — Option A</h2>
        <p className="text-sm text-gray-400 mt-0.5">Single long page · all sections visible on scroll · no tabs</p>
      </div>

      {/* KPI row — 6 cards */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">System Overview</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          <StatCard label="Total Users" value="24" sub="+2 this week" color="border-violet-200 bg-violet-50" />
          <StatCard label="Active Today" value="8" sub="33% of users" color="border-green-200 bg-green-50" />
          <StatCard label="Total Notes" value="1,482" sub="+63 this week" color="border-blue-200 bg-blue-50" />
          <StatCard label="Total Folders" value="198" color="border-sky-200 bg-sky-50" />
          <StatCard label="Storage Used" value="2.3 GB" sub="of 10 GB" color="border-amber-200 bg-amber-50" />
          <StatCard label="Trash Items" value="47" sub="2.1 GB reclaimable" color="border-red-200 bg-red-50" />
        </div>
      </section>

      {/* Charts row */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Activity Trends (Last 7 Days)</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border p-4">
            <p className="text-sm font-semibold text-gray-700">Notes Created</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">344</p>
            <MiniBar values={notesPerDay} labels={weekDays} color="bg-violet-400" />
          </div>
          <div className="rounded-xl border p-4">
            <p className="text-sm font-semibold text-gray-700">Active Users / Day</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">avg 8.6</p>
            <MiniBar values={activeUsersPerDay} labels={weekDays} color="bg-green-400" />
          </div>
          <div className="rounded-xl border p-4">
            <p className="text-sm font-semibold text-gray-700">Storage Growth (GB)</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">+1.2 GB</p>
            <MiniLine values={storageGrowth} labels={weekDays} />
          </div>
        </div>
      </section>

      {/* 30-day trend */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Notes Created — Last 30 Days</p>
        <div className="rounded-xl border p-4">
          <MiniLine values={notesLast30} labels={last30Labels} />
        </div>
      </section>

      {/* Recent activity feed */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Recent Activity</p>
        <div className="rounded-xl border divide-y">
          {recentActivity.map((a, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 text-sm">
              <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0">{a.user[0]}</span>
              <span className="font-medium text-gray-700">{a.user}</span>
              <span className="text-gray-400">{a.action}</span>
              <span className="font-medium text-gray-600 flex-1 truncate">{a.target}</span>
              <span className="text-xs text-gray-400 shrink-0">{a.time}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Per-user breakdown table */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Top Users by Activity</p>
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 font-semibold text-gray-600">User</th>
                <th className="text-right px-4 py-2 font-semibold text-gray-600">Notes</th>
                <th className="text-right px-4 py-2 font-semibold text-gray-600">Folders</th>
                <th className="text-right px-4 py-2 font-semibold text-gray-600">Storage</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-600">Last Seen</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {topUsers.map((u, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-gray-800">{u.name}</td>
                  <td className="px-4 py-2.5 text-right text-gray-600">{u.notes}</td>
                  <td className="px-4 py-2.5 text-right text-gray-600">{u.folders}</td>
                  <td className="px-4 py-2.5 text-right text-gray-600">{u.storage}</td>
                  <td className="px-4 py-2.5 text-gray-500">{u.lastSeen}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${u.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.active ? "bg-green-500" : "bg-gray-400"}`} />
                      {u.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-2">Showing top 5 · <a href="#" className="underline">View all in User Management →</a></p>
      </section>
    </div>
  )
}

// ─── OPTION B: Internal tabs within dashboard page ─────────────────────────────

function OptionB() {
  const [tab, setTab] = useState<"overview" | "activity" | "users">("overview")
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "activity", label: "Activity & Trends" },
    { id: "users", label: "User Breakdown" },
  ] as const

  return (
    <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Dashboard — Option B</h2>
        <p className="text-sm text-gray-400 mt-0.5">Internal tab strip within the page · each tab scoped to a topic</p>
      </div>

      {/* Tab strip */}
      <div className="flex gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${tab === t.id ? "border-b-2 border-violet-600 text-violet-700 -mb-px bg-violet-50" : "text-gray-500 hover:text-gray-700"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label="Total Users" value="24" sub="+2 this week" color="border-violet-200 bg-violet-50" />
            <StatCard label="Active Today" value="8" sub="33% of users" color="border-green-200 bg-green-50" />
            <StatCard label="New This Month" value="5" color="border-blue-200 bg-blue-50" />
            <StatCard label="Total Notes" value="1,482" sub="+63 this week" color="border-indigo-200 bg-indigo-50" />
            <StatCard label="Storage Used" value="2.3 GB" sub="of 10 GB" color="border-amber-200 bg-amber-50" />
            <StatCard label="Inactive Users" value="7" sub="29% never logged in" color="border-red-200 bg-red-50" />
          </div>
          <div className="rounded-xl border p-4">
            <p className="text-sm font-semibold text-gray-700 mb-1">Recent Activity</p>
            <div className="space-y-2 mt-2">
              {recentActivity.slice(0, 3).map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0">{a.user[0]}</span>
                  <span className="font-medium text-gray-700">{a.user}</span>
                  <span>{a.action}:</span>
                  <span className="text-gray-600">{a.target}</span>
                  <span className="ml-auto text-xs">{a.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "activity" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border p-4">
              <p className="text-sm font-semibold text-gray-700">Notes Created (Last 7 Days)</p>
              <p className="text-2xl font-bold mt-1">344</p>
              <MiniBar values={notesPerDay} labels={weekDays} color="bg-violet-400" />
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-sm font-semibold text-gray-700">Daily Active Users</p>
              <p className="text-2xl font-bold mt-1">avg 8.6</p>
              <MiniBar values={activeUsersPerDay} labels={weekDays} color="bg-green-400" />
            </div>
          </div>
          <div className="rounded-xl border p-4">
            <p className="text-sm font-semibold text-gray-700 mb-1">Notes Created — Last 30 Days</p>
            <MiniLine values={notesLast30} labels={last30Labels} />
          </div>
          <div className="rounded-xl border p-4">
            <p className="text-sm font-semibold text-gray-700 mb-1">Storage Growth (GB)</p>
            <MiniLine values={storageGrowth} labels={weekDays} />
          </div>
        </div>
      )}

      {tab === "users" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Total Users" value="24" color="border-violet-200 bg-violet-50" />
            <StatCard label="Active (7d)" value="12" color="border-green-200 bg-green-50" />
            <StatCard label="Never Active" value="4" color="border-red-200 bg-red-50" />
          </div>
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold text-gray-600">User</th>
                  <th className="text-right px-4 py-2 font-semibold text-gray-600">Notes</th>
                  <th className="text-right px-4 py-2 font-semibold text-gray-600">Storage</th>
                  <th className="text-left px-4 py-2 font-semibold text-gray-600">Last Seen</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {topUsers.map((u, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium">{u.name}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{u.notes}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{u.storage}</td>
                    <td className="px-4 py-2.5 text-gray-500">{u.lastSeen}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── OPTION C: Two-column layout — KPIs + feed left, charts right ─────────────

function OptionC() {
  return (
    <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Dashboard — Option C</h2>
        <p className="text-sm text-gray-400 mt-0.5">Two-column layout · stats + feed on left · charts on right</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left column — 2/5 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Total Users" value="24" sub="+2 this week" color="border-violet-200 bg-violet-50" />
            <StatCard label="Active Today" value="8" color="border-green-200 bg-green-50" />
            <StatCard label="Total Notes" value="1,482" color="border-blue-200 bg-blue-50" />
            <StatCard label="Storage" value="2.3 GB" sub="of 10 GB" color="border-amber-200 bg-amber-50" />
            <StatCard label="Total Folders" value="198" color="border-sky-200 bg-sky-50" />
            <StatCard label="Trash Items" value="47" color="border-red-200 bg-red-50" />
          </div>

          {/* Activity feed */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Live Feed</p>
            <div className="rounded-xl border divide-y">
              {recentActivity.map((a, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2.5 text-xs">
                  <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 shrink-0">{a.user[0]}</span>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-gray-700">{a.user}</span>
                    <span className="text-gray-400"> · {a.action}</span>
                    <span className="text-gray-500 font-medium"> {a.target}</span>
                  </div>
                  <span className="text-gray-400 shrink-0">{a.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column — 3/5 */}
        <div className="lg:col-span-3 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Notes Created (Last 7 Days)</p>
            <div className="rounded-xl border p-4">
              <MiniBar values={notesPerDay} labels={weekDays} color="bg-violet-400" />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Active Users (Last 7 Days)</p>
            <div className="rounded-xl border p-4">
              <MiniBar values={activeUsersPerDay} labels={weekDays} color="bg-green-400" />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">30-Day Note Trend</p>
            <div className="rounded-xl border p-4">
              <MiniLine values={notesLast30} labels={last30Labels} />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Top Users</p>
            <div className="rounded-xl border divide-y">
              {topUsers.slice(0, 4).map((u, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-600">{i + 1}</span>
                  <span className="flex-1 font-medium text-gray-700">{u.name}</span>
                  <span className="text-gray-500">{u.notes} notes</span>
                  <span className="text-gray-400">{u.storage}</span>
                  <span className={`w-2 h-2 rounded-full ${u.active ? "bg-green-500" : "bg-gray-300"}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DashboardVisualPage() {
  const [selected, setSelected] = useState<string | null>(null)

  const options = [
    {
      id: "A",
      title: "Option A — Single Scroll",
      desc: "All content flows vertically. Best for desktop admin use. No cognitive overhead of tabs. Shows everything at once.",
      pros: ["Easiest to scan", "No hidden content", "Works on any screen"],
      cons: ["Long page on wide screens", "Charts may feel cramped"],
    },
    {
      id: "B",
      title: "Option B — Internal Tabs",
      desc: "Dashboard stays one page but content is organized into 3 tabs: Overview · Activity & Trends · User Breakdown.",
      pros: ["Focused view per topic", "Less overwhelming", "Clear separation"],
      cons: ["Charts hidden behind clicks", "Tab choice has learning curve"],
    },
    {
      id: "C",
      title: "Option C — Two Column",
      desc: "Left column = stats + live feed. Right column = charts + user table. Side-by-side at a glance.",
      pros: ["Dense, at-a-glance view", "Charts always visible", "Familiar admin UX"],
      cons: ["Tighter on smaller screens", "Less room for long tables"],
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard — Visual Options</h1>
        <p className="text-sm text-gray-500 mt-1">Brainstorming mockup · all data is placeholder · pick a layout direction below</p>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">

        {/* Option selector */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-4">Choose a layout direction</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {options.map((o) => (
              <button
                key={o.id}
                onClick={() => setSelected(o.id === selected ? null : o.id)}
                className={`text-left rounded-xl border-2 p-4 transition-all ${selected === o.id ? "border-violet-500 bg-violet-50 shadow-md" : "border-gray-200 bg-white hover:border-violet-300"}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm ${selected === o.id ? "bg-violet-600 text-white" : "bg-gray-100 text-gray-600"}`}>{o.id}</span>
                  <span className="font-semibold text-gray-800 text-sm">{o.title}</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed mb-3">{o.desc}</p>
                <div className="space-y-1">
                  {o.pros.map((p, i) => <p key={i} className="text-xs text-green-700">✓ {p}</p>)}
                  {o.cons.map((c, i) => <p key={i} className="text-xs text-red-500">✗ {c}</p>)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Metric categories */}
        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-4">Proposed Metric Categories</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="rounded-xl bg-violet-50 border border-violet-100 p-4">
              <p className="font-bold text-violet-800 mb-2">System Health (Top KPIs)</p>
              <ul className="space-y-1 text-violet-700 text-xs">
                <li>• Total users / new this week</li>
                <li>• Active today / active 7d</li>
                <li>• Total notes / folders</li>
                <li>• Storage used / cap</li>
                <li>• Trash items count</li>
              </ul>
            </div>
            <div className="rounded-xl bg-green-50 border border-green-100 p-4">
              <p className="font-bold text-green-800 mb-2">Activity Trends (Charts)</p>
              <ul className="space-y-1 text-green-700 text-xs">
                <li>• Notes created / day (bar)</li>
                <li>• Active users / day (bar)</li>
                <li>• 30-day note trend (line)</li>
                <li>• Storage growth (line)</li>
                <li>• Notes edited vs created</li>
              </ul>
            </div>
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
              <p className="font-bold text-blue-800 mb-2">User Breakdown (Table)</p>
              <ul className="space-y-1 text-blue-700 text-xs">
                <li>• Top users by note count</li>
                <li>• Per-user storage usage</li>
                <li>• Per-user last active date</li>
                <li>• Per-user folder count</li>
                <li>• Inactive users list</li>
              </ul>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
              <p className="font-bold text-amber-800 mb-2">Live Feed</p>
              <ul className="space-y-1 text-amber-700 text-xs">
                <li>• Recent note creates</li>
                <li>• Recent user sign-ins</li>
                <li>• Admin actions (user created, etc.)</li>
                <li>• Large file uploads</li>
                <li>• Exports / imports</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Live mockups */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-4">Live Mockups (mock data)</h2>
          <div className="space-y-8">
            <OptionA />
            <OptionB />
            <OptionC />
          </div>
        </div>

        {/* Decisions still needed */}
        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-4">Open Questions</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 font-bold flex items-center justify-center text-xs shrink-0">1</span>
              <span><strong>Time range selector?</strong> Should charts show Last 7 / 30 / 90 days with a toggle, or always fixed 7 days?</span>
            </div>
            <div className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 font-bold flex items-center justify-center text-xs shrink-0">2</span>
              <span><strong>Remove Analytics nav item?</strong> You said you want one dashboard. Should the Analytics nav item in the sidebar be removed entirely?</span>
            </div>
            <div className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 font-bold flex items-center justify-center text-xs shrink-0">3</span>
              <span><strong>Real-time vs. cached?</strong> Should dashboard stats refresh automatically every N seconds, or only on page load?</span>
            </div>
            <div className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 font-bold flex items-center justify-center text-xs shrink-0">4</span>
              <span><strong>Chart library?</strong> The project has no chart library yet. Options: Recharts (most popular, React), Chart.js via react-chartjs-2, or lightweight custom SVG (like this mockup). Which direction?</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
