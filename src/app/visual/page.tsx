"use client"

import React, { useState, useRef, useCallback } from "react"
import {
  StickyNote,
  Folder,
  FolderOpen,
  Star,
  Trash2,
  ChevronRight,
  ChevronDown,
  X,
} from "lucide-react"

interface SidebarItem {
  id: string
  title: string
  type: "folder" | "note"
  folderId?: string
  isFavorite?: boolean
  isTrash?: boolean
}

const ITEMS: SidebarItem[] = [
  { id: "f1", title: "Work Projects", type: "folder" },
  { id: "n1", title: "Q3 Planning", type: "note", folderId: "f1", isFavorite: true },
  { id: "n2", title: "Sprint Retro", type: "note", folderId: "f1" },
  { id: "n3", title: "Budget Draft", type: "note", folderId: "f1" },
  { id: "f2", title: "Personal", type: "folder" },
  { id: "n4", title: "Grocery List", type: "note", folderId: "f2" },
  { id: "n5", title: "Travel Ideas", type: "note", folderId: "f2", isFavorite: true },
  { id: "n6", title: "Meeting Notes", type: "note" },
  { id: "n7", title: "Quick Jot", type: "note" },
  { id: "n8", title: "Research Links", type: "note" },
]

function useMultiSelectDemo() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)
  const preSelectIdRef = useRef<string | null>(null)
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["f1", "f2"]))

  const allSidebarIds = [
    ...ITEMS.filter((i) => i.type === "folder").flatMap((f) => [
      f.id,
      ...ITEMS.filter((n) => n.type === "note" && n.folderId === f.id).map((n) => n.id),
    ]),
    ...ITEMS.filter((i) => i.type === "note" && !i.folderId).map((n) => n.id),
  ]

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setLastSelectedId(id)
  }, [])

  const selectRange = useCallback(
    (id: string) => {
      setLastSelectedId((prevLast) => {
        if (!prevLast) {
          setSelectedIds((prev) => {
            const next = new Set(prev)
            next.add(id)
            return next
          })
          return id
        }
        const startIdx = allSidebarIds.indexOf(prevLast)
        const endIdx = allSidebarIds.indexOf(id)
        if (startIdx === -1 || endIdx === -1) {
          setSelectedIds((prev) => {
            const next = new Set(prev)
            next.add(id)
            return next
          })
          return id
        }
        const from = Math.min(startIdx, endIdx)
        const to = Math.max(startIdx, endIdx)
        const rangeIds = allSidebarIds.slice(from, to + 1)
        setSelectedIds((prev) => {
          const next = new Set(prev)
          rangeIds.forEach((rid) => next.add(rid))
          return next
        })
        return id
      })
    },
    [allSidebarIds]
  )

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setLastSelectedId(null)
    preSelectIdRef.current = null
  }, [])

  const handleItemClick = useCallback(
    (id: string, e: React.MouseEvent) => {
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        e.preventDefault()
        if (preSelectIdRef.current && preSelectIdRef.current !== id) {
          toggleSelect(preSelectIdRef.current)
        }
        preSelectIdRef.current = null
        if (e.shiftKey) {
          selectRange(id)
        } else {
          toggleSelect(id)
        }
      } else {
        preSelectIdRef.current = id
        setActiveNoteId(id)
      }
    },
    [toggleSelect, selectRange]
  )

  const toggleFolder = useCallback((id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  return {
    selectedIds,
    lastSelectedId,
    activeNoteId,
    expandedFolders,
    clearSelection,
    handleItemClick,
    toggleFolder,
    allSidebarIds,
  }
}

export default function VisualPage() {
  const {
    selectedIds,
    lastSelectedId,
    activeNoteId,
    expandedFolders,
    clearSelection,
    handleItemClick,
    toggleFolder,
  } = useMultiSelectDemo()

  const [activeTab, setActiveTab] = useState<"demo" | "rules">("demo")

  const folders = ITEMS.filter((i) => i.type === "folder")
  const rootNotes = ITEMS.filter((i) => i.type === "note" && !i.folderId)

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-1 text-stone-900 dark:text-stone-100">
        Sidebar Multi-Select Visual
      </h1>
      <p className="text-sm text-stone-500 mb-6">
        Demo of selection behavior for sidebar notes and folders
      </p>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("demo")}
          className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
            activeTab === "demo"
              ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
              : "bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400 hover:bg-stone-300 dark:hover:bg-stone-700"
          }`}
        >
          Interactive Demo
        </button>
        <button
          onClick={() => setActiveTab("rules")}
          className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
            activeTab === "rules"
              ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
              : "bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400 hover:bg-stone-300 dark:hover:bg-stone-700"
          }`}
        >
          Selection Rules
        </button>
      </div>

      {activeTab === "demo" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-800 shadow-sm">
            <div className="px-3 py-2 border-b border-stone-200 dark:border-stone-800">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Sidebar
              </span>
            </div>

            {selectedIds.size > 0 && (
              <div className="flex items-center justify-between px-3 py-1.5 bg-blue-600 text-white text-xs mx-1 mt-1 rounded-md">
                <span className="font-medium">{selectedIds.size} selected</span>
                <button
                  onClick={clearSelection}
                  className="flex items-center gap-1 hover:bg-blue-700 px-1.5 py-0.5 rounded text-xs"
                >
                  <X className="h-3 w-3" />
                  Clear
                </button>
              </div>
            )}

            <div className="p-1">
              {folders.map((folder) => {
                const isExpanded = expandedFolders.has(folder.id)
                const folderNotes = ITEMS.filter(
                  (i) => i.type === "note" && i.folderId === folder.id
                )
                const FolderIcon = isExpanded ? FolderOpen : Folder
                return (
                  <div key={folder.id}>
                    <div
                      onClick={(e) => handleItemClick(folder.id, e)}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm transition-colors ${
                        selectedIds.has(folder.id)
                          ? "bg-blue-100 dark:bg-blue-900/30 border-l-2 border-l-blue-500"
                          : "hover:bg-stone-100 dark:hover:bg-stone-800"
                      }`}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFolder(folder.id)
                        }}
                        className="p-0.5 hover:bg-stone-200 dark:hover:bg-stone-700 rounded"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3 text-stone-400" />
                        ) : (
                          <ChevronRight className="h-3 w-3 text-stone-400" />
                        )}
                      </button>
                      <FolderIcon className="h-4 w-4 text-amber-500" />
                      <span className="truncate">{folder.title}</span>
                    </div>
                    {isExpanded && (
                      <div className="ml-5">
                        {folderNotes.map((note) => (
                          <div
                            key={note.id}
                            onClick={(e) => handleItemClick(note.id, e)}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm transition-colors ${
                              selectedIds.has(note.id)
                                ? "bg-blue-100 dark:bg-blue-900/30 border-l-2 border-l-blue-500"
                                : activeNoteId === note.id
                                ? "bg-stone-100 dark:bg-stone-800"
                                : "hover:bg-stone-100 dark:hover:bg-stone-800"
                            }`}
                          >
                            <StickyNote className="h-4 w-4 text-stone-400 shrink-0" />
                            <span className="truncate">{note.title}</span>
                            {note.isFavorite && (
                              <Star className="h-3 w-3 text-amber-500 fill-amber-500 ml-auto" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              {rootNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={(e) => handleItemClick(note.id, e)}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm transition-colors ${
                    selectedIds.has(note.id)
                      ? "bg-blue-100 dark:bg-blue-900/30 border-l-2 border-l-blue-500"
                      : activeNoteId === note.id
                      ? "bg-stone-100 dark:bg-stone-800"
                      : "hover:bg-stone-100 dark:hover:bg-stone-800"
                  }`}
                >
                  <StickyNote className="h-4 w-4 text-stone-400 shrink-0" />
                  <span className="truncate">{note.title}</span>
                  {note.isFavorite && (
                    <Star className="h-3 w-3 text-amber-500 fill-amber-500 ml-auto" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-800 shadow-sm p-4">
              <h3 className="text-sm font-semibold mb-3 text-stone-700 dark:text-stone-300">
                Selection State
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-stone-500">Selected IDs:</span>
                  <span className="font-mono text-stone-700 dark:text-stone-300">
                    {selectedIds.size > 0
                      ? `[${[...selectedIds].join(", ")}]`
                      : "none"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Anchor (last):</span>
                  <span className="font-mono text-stone-700 dark:text-stone-300">
                    {lastSelectedId ?? "none"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Active note:</span>
                  <span className="font-mono text-stone-700 dark:text-stone-300">
                    {activeNoteId ?? "none"}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-800 shadow-sm p-4">
              <h3 className="text-sm font-semibold mb-3 text-stone-700 dark:text-stone-300">
                How to Use
              </h3>
              <ul className="space-y-2 text-xs text-stone-600 dark:text-stone-400">
                <li className="flex gap-2">
                  <kbd className="px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 rounded text-[10px] font-mono border border-stone-200 dark:border-stone-700 shrink-0">
                    Click
                  </kbd>
                  <span>
                    Select note + set anchor (no highlight until next CTRL/SHIFT)
                  </span>
                </li>
                <li className="flex gap-2">
                  <kbd className="px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 rounded text-[10px] font-mono border border-stone-200 dark:border-stone-700 shrink-0">
                    Ctrl+Click
                  </kbd>
                  <span>Toggle individual note. First click sets anchor.</span>
                </li>
                <li className="flex gap-2">
                  <kbd className="px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 rounded text-[10px] font-mono border border-stone-200 dark:border-stone-700 shrink-0">
                    Shift+Click
                  </kbd>
                  <span>Select range from anchor to clicked item</span>
                </li>
                <li className="flex gap-2">
                  <kbd className="px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 rounded text-[10px] font-mono border border-stone-200 dark:border-stone-700 shrink-0">
                    Escape
                  </kbd>
                  <span>Clear all selection</span>
                </li>
              </ul>
            </div>

            <div className="bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-800 shadow-sm p-4">
              <h3 className="text-sm font-semibold mb-3 text-stone-700 dark:text-stone-300">
                Bulk Operations (Right-click)
              </h3>
              <ul className="space-y-1.5 text-xs text-stone-600 dark:text-stone-400">
                <li className="flex items-center gap-2">
                  <Star className="h-3 w-3 text-amber-500" />
                  Add to Favorites (notes only)
                </li>
                <li className="flex items-center gap-2">
                  <Trash2 className="h-3 w-3 text-red-500" />
                  Move to Trash (notes + folders)
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {activeTab === "rules" && (
        <div className="bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50">
                <th className="text-left px-4 py-2 font-semibold text-stone-600 dark:text-stone-400 text-xs uppercase tracking-wider">
                  State
                </th>
                <th className="text-left px-4 py-2 font-semibold text-stone-600 dark:text-stone-400 text-xs uppercase tracking-wider">
                  Action
                </th>
                <th className="text-left px-4 py-2 font-semibold text-stone-600 dark:text-stone-400 text-xs uppercase tracking-wider">
                  Result
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              <tr>
                <td className="px-4 py-2 text-stone-500">No selection</td>
                <td className="px-4 py-2">
                  <kbd className="px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 rounded text-[10px] font-mono border border-stone-200 dark:border-stone-700">
                    Click
                  </kbd>
                </td>
                <td className="px-4 py-2">Navigate to note, set anchor (no highlight)</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-stone-500">No selection</td>
                <td className="px-4 py-2">
                  <kbd className="px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 rounded text-[10px] font-mono border border-stone-200 dark:border-stone-700">
                    Ctrl+Click
                  </kbd>
                </td>
                <td className="px-4 py-2">Select note + anchor</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-stone-500">No selection</td>
                <td className="px-4 py-2">
                  <kbd className="px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 rounded text-[10px] font-mono border border-stone-200 dark:border-stone-700">
                    Shift+Click
                  </kbd>
                </td>
                <td className="px-4 py-2">Select just that note</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-stone-500">Selection active</td>
                <td className="px-4 py-2">
                  <kbd className="px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 rounded text-[10px] font-mono border border-stone-200 dark:border-stone-700">
                    Click
                  </kbd>
                </td>
                <td className="px-4 py-2">Navigate to note, set new anchor</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-stone-500">Selection active</td>
                <td className="px-4 py-2">
                  <kbd className="px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 rounded text-[10px] font-mono border border-stone-200 dark:border-stone-700">
                    Ctrl+Click
                  </kbd>
                </td>
                <td className="px-4 py-2">Toggle note in/out of selection</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-stone-500">Selection active</td>
                <td className="px-4 py-2">
                  <kbd className="px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 rounded text-[10px] font-mono border border-stone-200 dark:border-stone-700">
                    Shift+Click
                  </kbd>
                </td>
                <td className="px-4 py-2">Range select from anchor to clicked</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-stone-500">Any</td>
                <td className="px-4 py-2">
                  <kbd className="px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 rounded text-[10px] font-mono border border-stone-200 dark:border-stone-700">
                    Escape
                  </kbd>
                </td>
                <td className="px-4 py-2">Clear all selection</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-stone-500">Any</td>
                <td className="px-4 py-2">
                  <kbd className="px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 rounded text-[10px] font-mono border border-stone-200 dark:border-stone-700">
                    Ctrl+A
                  </kbd>
                </td>
                <td className="px-4 py-2">Select all items</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-stone-500">Selection active</td>
                <td className="px-4 py-2">
                  <kbd className="px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 rounded text-[10px] font-mono border border-stone-200 dark:border-stone-700">
                    Right-click
                  </kbd>
                </td>
                <td className="px-4 py-2">Bulk context menu (Favorites, Trash)</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-stone-500">No selection</td>
                <td className="px-4 py-2">
                  <kbd className="px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 rounded text-[10px] font-mono border border-stone-200 dark:border-stone-700">
                    Right-click
                  </kbd>
                </td>
                <td className="px-4 py-2">Single-item context menu (Rename, etc.)</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
