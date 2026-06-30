"use client"

import React, { useState } from "react"
import { Geist } from "next/font/google"
import { cn } from "@/lib/utils"
import {
  House,
  Star,
  Trash2,
  StickyNote,
  Folder,
  Search,
  Clock,
  Tag,
  Archive,
  Calendar,
  FileText,
  Bookmark,
  History,
  Hash,
  Pin,
  Bell,
  Users,
  Globe,
  Lock,
  Sparkles,
  Lightbulb,
  Heart,
  ListChecks,
  Share2,
} from "lucide-react"

type NavStyle = "clean" | "compact" | "colorful" | "minimal"

interface NavItem {
  icon: React.ReactNode
  label: string
  badge?: string
  active?: boolean
}

const styleConfig: Record<NavStyle, {
  label: string
  desc: string
  sectionBg: string
  itemBg: string
  itemHover: string
  itemActive: string
  iconColor: string
  labelColor: string
  dividerColor: string
  badgeBg: string
  badgeText: string
}> = {
  clean: {
    label: "Clean",
    desc: "Current shadcn sidebar style — light gray bg, subtle borders",
    sectionBg: "bg-sidebar",
    itemBg: "bg-transparent",
    itemHover: "hover:bg-sidebar-accent",
    itemActive: "bg-sidebar-accent text-sidebar-accent-foreground",
    iconColor: "text-sidebar-foreground/60",
    labelColor: "text-sidebar-foreground",
    dividerColor: "bg-sidebar-border",
    badgeBg: "bg-sidebar-primary/10",
    badgeText: "text-sidebar-primary",
  },
  compact: {
    label: "Compact",
    desc: "Tighter spacing, smaller text, denser layout",
    sectionBg: "bg-sidebar",
    itemBg: "bg-transparent",
    itemHover: "hover:bg-sidebar-accent/60",
    itemActive: "bg-sidebar-accent/80 text-sidebar-accent-foreground",
    iconColor: "text-sidebar-foreground/50",
    labelColor: "text-sidebar-foreground",
    dividerColor: "bg-sidebar-border/50",
    badgeBg: "bg-sidebar-primary/10",
    badgeText: "text-sidebar-primary",
  },
  colorful: {
    label: "Colorful",
    desc: "Categorized items with vibrant icons and colored badges",
    sectionBg: "bg-sidebar",
    itemBg: "bg-transparent",
    itemHover: "hover:bg-sidebar-accent",
    itemActive: "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-l-2 border-blue-500",
    iconColor: "text-blue-600 dark:text-blue-400",
    labelColor: "text-sidebar-foreground",
    dividerColor: "bg-sidebar-border",
    badgeBg: "bg-blue-100 dark:bg-blue-900/40",
    badgeText: "text-blue-700 dark:text-blue-300",
  },
  minimal: {
    label: "Minimal",
    desc: "No dividers, minimal visual noise, maximum whitespace",
    sectionBg: "bg-sidebar",
    itemBg: "bg-transparent",
    itemHover: "hover:bg-sidebar-accent/40",
    itemActive: "bg-sidebar-accent/60 text-sidebar-accent-foreground shadow-sm",
    iconColor: "text-sidebar-foreground/40",
    labelColor: "text-sidebar-foreground",
    dividerColor: "bg-transparent",
    badgeBg: "bg-sidebar-accent",
    badgeText: "text-sidebar-accent-foreground",
  },
}

function SidebarPreview({ style, active }: { style: NavStyle; active: boolean }) {
  const cfg = styleConfig[style]

  const primaryItems: NavItem[] = [
    { icon: <House className="size-4" />, label: "Home", active: style === "clean" },
    { icon: <Star className="size-4" />, label: "Favorites", badge: "3" },
    { icon: <Clock className="size-4" />, label: "Recent" },
    { icon: <Trash2 className="size-4" />, label: "Trash" },
  ]

  const secondaryItems: NavItem[] = [
    { icon: <Tag className="size-4" />, label: "Tags" },
    { icon: <Archive className="size-4" />, label: "Archive" },
  ]

  return (
    <div
      className={cn(
        "w-64 rounded-xl border shadow-sm overflow-hidden transition-all duration-300",
        active ? "ring-2 ring-blue-500 shadow-md scale-[1.02]" : "opacity-80 hover:opacity-100"
      )}
      style={{ backgroundColor: "var(--sidebar)", borderColor: "var(--sidebar-border)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "var(--sidebar-border)" }}>
        <div className="size-6 rounded bg-sidebar-primary flex items-center justify-center text-[10px] font-bold text-sidebar-primary-foreground">Z</div>
        <span className="text-sm font-semibold" style={{ color: "var(--sidebar-foreground)" }}>ZooNote</span>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-1 px-3 py-2">
        <button className={cn("flex items-center justify-center size-7 rounded-md", cfg.itemHover)}>
          <Folder className="size-3.5" style={{ color: "var(--sidebar-foreground)" }} />
        </button>
        <button className={cn("flex items-center justify-center size-7 rounded-md", cfg.itemHover)}>
          <Search className="size-3.5" style={{ color: "var(--sidebar-foreground)" }} />
        </button>
      </div>

      {/* Primary nav */}
      <div className="px-3 py-1">
        {primaryItems.map((item) => (
          <div
            key={item.label}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-all",
              item.active ? cfg.itemActive : cfg.itemHover,
              style === "compact" ? "py-1.5 text-xs" : "text-sm"
            )}
          >
            <span className={cn("shrink-0", cfg.iconColor)}>{item.icon}</span>
            <span className={cn("flex-1 truncate", cfg.labelColor)}>{item.label}</span>
            {item.badge && (
              <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", cfg.badgeBg, cfg.badgeText)}>
                {item.badge}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className={cn("mx-4 my-1 h-px", cfg.dividerColor)} />

      {/* Notes section (no label) */}
      <div className="px-3 pb-2">
        {[
          { icon: <StickyNote className="size-4" />, label: "Meeting Notes", active: true },
          { icon: <StickyNote className="size-4" />, label: "Project Ideas" },
          { icon: <StickyNote className="size-4" />, label: "Shopping List" },
        ].map((item, i) => (
          <div
            key={item.label}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-all",
              item.active ? cfg.itemActive : cfg.itemHover,
              style === "compact" ? "py-1.5 text-xs" : "text-sm"
            )}
          >
            <span className={cn("shrink-0", cfg.iconColor)}>{item.icon}</span>
            <span className={cn("flex-1 truncate", cfg.labelColor)}>{item.label}</span>
          </div>
        ))}
      </div>

      <div className={cn("mx-4 my-1 h-px", cfg.dividerColor)} />

      {/* Secondary items */}
      <div className="px-3 pb-2">
        {secondaryItems.map((item) => (
          <div
            key={item.label}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-all",
              cfg.itemHover,
              style === "compact" ? "py-1.5 text-xs" : "text-sm"
            )}
          >
            <span className={cn("shrink-0", cfg.iconColor)}>{item.icon}</span>
            <span className={cn("flex-1 truncate", cfg.labelColor)}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Footer / User */}
      <div className="border-t px-3 py-2" style={{ borderColor: "var(--sidebar-border)" }}>
        <div className={cn("flex items-center gap-3 px-3 py-2 rounded-md", cfg.itemHover)}>
          <div className="size-7 rounded-md bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center text-xs font-bold">
            S
          </div>
          <div className="flex-1 min-w-0">
            <div className={cn("truncate font-medium", style === "compact" ? "text-xs" : "text-sm")} style={{ color: "var(--sidebar-foreground)" }}>Sunil</div>
            <div className="truncate text-[10px]" style={{ color: "var(--sidebar-foreground)" }}>sunil@example.com</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function IdeaCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl border bg-card hover:shadow-sm transition-shadow cursor-pointer">
      <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <h4 className="text-sm font-medium text-card-foreground">{title}</h4>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </div>
  )
}

export default function LeftNavStyles() {
  const [activeStyle, setActiveStyle] = useState<NavStyle>("clean")

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Left Nav Styles</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Visual design exploration for ZooNote sidebar</p>
          </div>
          <a
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
          >
            Back to app
          </a>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-12">
        {/* Final Design: Chosen layout */}
        <section>
          <div className="flex items-center gap-3 mb-2">
            <div className="size-7 rounded-lg bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 flex items-center justify-center">
              <ListChecks className="size-4" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Final Design — Clean Style</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Home → Favorites → Recent → Calendar → divider → Trash → divider → Notes (no label, flat)
          </p>

          <div className="flex justify-center">
            <div
              className="w-72 rounded-xl border shadow-md overflow-hidden"
              style={{ backgroundColor: "var(--sidebar)", borderColor: "var(--sidebar-border)" }}
            >
              {/* Header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "var(--sidebar-border)" }}>
                <div className="size-6 rounded bg-sidebar-primary flex items-center justify-center text-[10px] font-bold text-sidebar-primary-foreground">Z</div>
                <span className="text-sm font-semibold" style={{ color: "var(--sidebar-foreground)" }}>ZooNote</span>
              </div>

              {/* Action bar */}
              <div className="flex items-center gap-1 px-3 py-2">
                <button className="flex items-center justify-center size-7 rounded-md hover:bg-sidebar-accent">
                  <Folder className="size-3.5" style={{ color: "var(--sidebar-foreground)" }} />
                </button>
                <button className="flex items-center justify-center size-7 rounded-md hover:bg-sidebar-accent">
                  <Search className="size-3.5" style={{ color: "var(--sidebar-foreground)" }} />
                </button>
              </div>

              {/* Home */}
              <div className="px-3 pb-1">
                <div className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent cursor-pointer transition-all">
                  <House className="size-4 shrink-0" style={{ color: "var(--sidebar-foreground)" }} />
                  <span className="flex-1 truncate" style={{ color: "var(--sidebar-foreground)" }}>Home</span>
                </div>

                {/* Favorites */}
                <div className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent cursor-pointer transition-all">
                  <Star className="size-4 shrink-0" style={{ color: "var(--sidebar-foreground)" }} />
                  <span className="flex-1 truncate" style={{ color: "var(--sidebar-foreground)" }}>Favorites</span>
                </div>

                {/* Recent */}
                <div className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent cursor-pointer transition-all">
                  <Clock className="size-4 shrink-0" style={{ color: "var(--sidebar-foreground)" }} />
                  <span className="flex-1 truncate" style={{ color: "var(--sidebar-foreground)" }}>Recent</span>
                </div>

                {/* Calendar */}
                <div className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent cursor-pointer transition-all">
                  <Calendar className="size-4 shrink-0" style={{ color: "var(--sidebar-foreground)" }} />
                  <span className="flex-1 truncate" style={{ color: "var(--sidebar-foreground)" }}>Calendar</span>
                </div>
              </div>

              {/* Divider */}
              <div className="mx-4 my-1 h-px bg-sidebar-border" />

              {/* Trash */}
              <div className="px-3 pb-1">
                <div className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent cursor-pointer transition-all">
                  <Trash2 className="size-4 shrink-0" style={{ color: "var(--sidebar-foreground)" }} />
                  <span className="flex-1 truncate" style={{ color: "var(--sidebar-foreground)" }}>Trash</span>
                </div>
              </div>

              {/* Divider */}
              <div className="mx-4 my-1 h-px bg-sidebar-border" />

              {/* Notes (no label, flat list) */}
              <div className="px-3 pb-2">
                {["Meeting Notes", "Project Ideas", "Shopping List", "Reading List"].map((label) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent cursor-pointer transition-all"
                  >
                    <StickyNote className="size-4 shrink-0" style={{ color: "var(--sidebar-foreground)" }} />
                    <span className="flex-1 truncate" style={{ color: "var(--sidebar-foreground)" }}>{label}</span>
                  </div>
                ))}
              </div>

              {/* Footer / User */}
              <div className="border-t px-3 py-2" style={{ borderColor: "var(--sidebar-border)" }}>
                <div className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-sidebar-accent cursor-pointer transition-all">
                  <div className="size-7 rounded-md bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center text-xs font-bold">S</div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-medium" style={{ color: "var(--sidebar-foreground)" }}>Sunil</div>
                    <div className="truncate text-[10px]" style={{ color: "var(--sidebar-foreground)" }}>sunil@example.com</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Option 1: Nav bar layout options */}
        <section>
          <div className="flex items-center gap-3 mb-2">
            <div className="size-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Sparkles className="size-4" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Sidebar Visual Styles</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">Click a style to preview — each uses the same items with different visual treatment</p>

          <div className="flex flex-wrap gap-8 justify-center">
            {(Object.keys(styleConfig) as NavStyle[]).map((style) => (
              <div key={style} className="flex flex-col items-center gap-3" onClick={() => setActiveStyle(style)}>
                <SidebarPreview style={style} active={activeStyle === style} />
                <div className="text-center">
                  <div className="text-sm font-medium text-foreground">{styleConfig[style].label}</div>
                  <div className="text-[11px] text-muted-foreground max-w-48">{styleConfig[style].desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Option 2: Proposed nav item order */}
        <section>
          <div className="flex items-center gap-3 mb-2">
            <div className="size-7 rounded-lg bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 flex items-center justify-center">
              <ListChecks className="size-4" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Proposed Item Order</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">The updated left nav structure with Home, Favorites, and Trash above notes</p>

          <div className="flex flex-wrap gap-6 justify-center">
            <div className="w-72 rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold text-card-foreground mb-4 flex items-center gap-2">
                <House className="size-4" />
                Primary Navigation
              </h3>
              <div className="space-y-1">
                {[
                  { icon: <House className="size-4" />, label: "Home", color: "text-sky-600" },
                  { icon: <Star className="size-4" />, label: "Favorites", color: "text-amber-500" },
                  { icon: <Clock className="size-4" />, label: "Recent", color: "text-violet-500" },
                  { icon: <Trash2 className="size-4" />, label: "Trash", color: "text-red-500" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent text-sm">
                    <span className={item.color}>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>

              <div className="my-3 border-t" />

              <h3 className="text-sm font-semibold text-card-foreground mb-3 flex items-center gap-2">
                <StickyNote className="size-4" />
                Notes
              </h3>
              <div className="space-y-1">
                {["Meeting Notes", "Project Ideas", "Shopping List", "Reading List"].map((label) => (
                  <div key={label} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent text-sm">
                    <StickyNote className="size-4 text-muted-foreground" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Option 3: Ideas for additional nav items */}
        <section>
          <div className="flex items-center gap-3 mb-2">
            <div className="size-7 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Lightbulb className="size-4" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Ideas for Additional Nav Items</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">What else could go in the left nav for a regular user</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <IdeaCard
              icon={<Clock className="size-4" />}
              title="Recent"
              desc="Quick access to recently viewed/edited notes"
            />
            <IdeaCard
              icon={<Tag className="size-4" />}
              title="Tags"
              desc="Browse and filter notes by tags/labels"
            />
            <IdeaCard
              icon={<Archive className="size-4" />}
              title="Archive"
              desc="Archive notes instead of deleting — hide from main view"
            />
            <IdeaCard
              icon={<Calendar className="size-4" />}
              title="Calendar"
              desc="View notes by creation/modification date on a calendar"
            />
            <IdeaCard
              icon={<Bookmark className="size-4" />}
              title="Notebooks"
              desc="Group notes into higher-level notebooks or collections"
            />
            <IdeaCard
              icon={<History className="size-4" />}
              title="Version History"
              desc="View and restore previous versions of notes"
            />
            <IdeaCard
              icon={<Hash className="size-4" />}
              title="Quick Notes"
              desc="A scratchpad for temporary, quick-capture notes"
            />
            <IdeaCard
              icon={<Pin className="size-4" />}
              title="Pinned"
              desc="Pin important notes to the top for quick access"
            />
            <IdeaCard
              icon={<Bell className="size-4" />}
              title="Reminders"
              desc="Notes with due dates and reminders"
            />
            <IdeaCard
              icon={<Share2 className="size-4" />}
              title="Shared"
              desc="Notes shared with other users or publicly"
            />
            <IdeaCard
              icon={<Heart className="size-4" />}
              title="Templates"
              desc="Reusable note templates for common formats"
            />
            <IdeaCard
              icon={<Users className="size-4" />}
              title="Collaboration"
              desc="Team notes and collaborative editing"
            />
          </div>
        </section>

        {/* Option 4: Nav item comparison */}
        <section>
          <div className="flex items-center gap-3 mb-2">
            <div className="size-7 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Share2 className="size-4" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Nav Item Grouping Concepts</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">Different ways to organize the sidebar sections</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Concept 1: Flat */}
            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold text-card-foreground mb-3">Flat</h3>
              <div className="space-y-1">
                {["Home", "Favorites", "Recent", "Trash", "Meeting Notes", "Project Ideas"].map((label) => (
                  <div key={label} className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-accent text-sm">
                    <StickyNote className="size-3.5 text-muted-foreground" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">All items in one list, simple but unstructured</p>
            </div>

            {/* Concept 2: Grouped with section headers */}
            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold text-card-foreground mb-3">Grouped</h3>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1 px-3">Navigate</div>
              {["Home", "Favorites", "Recent"].map((label) => (
                <div key={label} className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-accent text-sm">
                  <StickyNote className="size-3.5 text-muted-foreground" />
                  <span>{label}</span>
                </div>
              ))}
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mt-2 mb-1 px-3">Manage</div>
              {["Trash", "Archive", "Tags"].map((label) => (
                <div key={label} className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-accent text-sm">
                  <StickyNote className="size-3.5 text-muted-foreground" />
                  <span>{label}</span>
                </div>
              ))}
              <p className="text-xs text-muted-foreground mt-3">Section headers organize by purpose</p>
            </div>

            {/* Concept 3: Pinned */}
            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold text-card-foreground mb-3">Pinned + Scroll</h3>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1 px-3">Pinned</div>
              {["Home", "Favorites"].map((label) => (
                <div key={label} className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-accent/60 text-sm font-medium">
                  <StickyNote className="size-3.5" />
                  <span>{label}</span>
                </div>
              ))}
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mt-2 mb-1 px-3">All Notes</div>
              {["Meeting Notes", "Project Ideas", "Shopping List"].map((label) => (
                <div key={label} className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-accent text-sm">
                  <StickyNote className="size-3.5 text-muted-foreground" />
                  <span>{label}</span>
                </div>
              ))}
              <p className="text-xs text-muted-foreground mt-3">Top items always visible, rest scroll below</p>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="max-w-6xl mx-auto px-6 py-4 text-center text-xs text-muted-foreground">
          ZooNote Left Nav Style Exploration
        </div>
      </footer>
    </div>
  )
}
