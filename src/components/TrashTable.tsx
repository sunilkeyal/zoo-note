"use client"

import { cn } from "@/lib/utils"
import { useState, useCallback, useMemo } from "react"
import { Trash2, ArrowUp, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationEllipsis,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useIsMobile } from "@/hooks/use-mobile"


function FolderIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>
  )
}

function FileTextIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="14" y2="17"/></svg>
  )
}

function LockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
  )
}

interface TrashItem {
  id: string
  title: string
  type: "note" | "folder"
  folderId?: string
  folderName?: string
  userId?: string
  user?: string
  deletedAt: string
  notesCount?: number
}

interface Props {
  items: TrashItem[]
  isAdmin?: boolean
  loading?: boolean
  error?: string | null
  onRestore: (noteIds: string[], folderIds: string[]) => void
  onPermanentDelete: (noteIds: string[], folderIds: string[]) => void
  onRetry?: () => void
}

function Checkbox({
  checked, indeterminate, disabled, onChange,
}: {
  checked: boolean
  indeterminate?: boolean
  disabled?: boolean
  onChange: () => void
}) {
  return (
    <button
      onClick={disabled ? undefined : onChange}
      disabled={disabled}
      className={`size-4 rounded border flex items-center justify-center transition-colors ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      } ${
        checked || indeterminate
          ? "bg-primary border-primary text-primary-foreground"
          : "border-input hover:border-ring"
      }`}
      role="checkbox"
      aria-checked={checked}
      tabIndex={disabled ? -1 : 0}
    >
      {indeterminate ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
      ) : checked ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      ) : null}
    </button>
  )
}

function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const pages: (number | "ellipsis")[] = [1]
  if (current > 3) pages.push("ellipsis")
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (current < total - 2) pages.push("ellipsis")
  pages.push(total)
  return pages
}

export default function TrashTable({ items, isAdmin, loading, error, onRestore, onPermanentDelete, onRetry }: Props) {
  const isMobile = useIsMobile()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [locked, setLocked] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState<{ noteIds: string[]; folderIds: string[] } | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [sortField, setSortField] = useState("deletedAt")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  const notesByFolder = new Map<string, TrashItem[]>()
  for (const item of items) {
    if (item.type === "note" && item.folderId) {
      const list = notesByFolder.get(item.folderId) || []
      list.push(item)
      notesByFolder.set(item.folderId, list)
    }
  }

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      let cmp = 0
      if (sortField === "title") {
        cmp = a.title.localeCompare(b.title)
      } else if (sortField === "type") {
        cmp = a.type.localeCompare(b.type)
      } else if (sortField === "deletedAt") {
        cmp = new Date(a.deletedAt).getTime() - new Date(b.deletedAt).getTime()
      }
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [items, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / limit))
  const safePage = Math.min(page, totalPages)
  const displayItems = sortedItems.slice((safePage - 1) * limit, safePage * limit)

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      const lock = new Set(locked)
      const item = items.find((i) => i.id === id)
      if (!item) return prev

      if (next.has(id)) {
        next.delete(id)
        lock.delete(id)
        if (item.folderId) {
          const others = notesByFolder.get(item.folderId) || []
          const hasOther = others.some((n) => n.id !== id && next.has(n.id))
          if (!hasOther) {
            next.delete(item.folderId)
            lock.delete(item.folderId)
          }
        }
        if (item.type === "folder") {
          const folderNotes = notesByFolder.get(item.id) || []
          for (const n of folderNotes) {
            next.delete(n.id)
            lock.delete(n.id)
          }
        }
      } else {
        next.add(id)
        if (item.type === "note" && item.folderId) {
          const folder = items.find((i) => i.id === item.folderId)
          if (folder) {
            next.add(item.folderId)
            lock.add(item.folderId)
          }
        }
        if (item.type === "folder") {
          const folderNotes = notesByFolder.get(item.id) || []
          for (const n of folderNotes) {
            next.add(n.id)
          }
        }
      }
      setLocked(lock)
      return next
    })
  }, [items, locked, notesByFolder])

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      const allCheckable = displayItems.filter((i) => !locked.has(i.id))
      const allSel = allCheckable.length > 0 && allCheckable.every((i) => prev.has(i.id))
      if (allSel) {
        const next = new Set(prev)
        for (const i of displayItems) if (!locked.has(i.id)) next.delete(i.id)
        return next
      } else {
        const next = new Set(prev)
        for (const item of displayItems) {
          if (!next.has(item.id)) {
            next.add(item.id)
            if (item.type === "note" && item.folderId) {
              const folder = displayItems.find((f) => f.id === item.folderId)
              if (folder) {
                next.add(item.folderId)
                locked.add(item.folderId)
              }
            }
          }
        }
        return next
      }
    })
  }, [displayItems, locked])

  if (isMobile) {
    return (
      <div className="grid grid-cols-2 gap-2 p-3">
        {items.map((item) => (
          <div key={item.id} className="border border-border rounded-[10px] p-3 flex flex-col">
            <div className="text-[13px] font-bold mb-1 line-clamp-2">{item.title}</div>
            <div className="text-[11px] text-muted-foreground mb-2">
              {item.folderName || "No folder"} · {item.deletedAt ? new Date(item.deletedAt).toLocaleDateString() : ""}
            </div>
            <div className="mt-auto flex gap-2 pt-2 border-t border-border/50">
              <button onClick={() => item.type === "note" ? onRestore([item.id], []) : onRestore([], [item.id])} className="flex-1 text-xs text-blue-600 py-1">Restore</button>
              <button onClick={() => item.type === "note" ? onPermanentDelete([item.id], []) : onPermanentDelete([], [item.id])} className="flex-1 text-xs text-destructive py-1">Delete</button>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const allCheckable = displayItems.filter((i) => !locked.has(i.id))
  const allSelected = allCheckable.length > 0 && allCheckable.every((i) => selected.has(i.id))

  const selectedNoteIds = items.filter((i) => selected.has(i.id) && i.type === "note").map((i) => i.id)
  const selectedFolderIds = items.filter((i) => selected.has(i.id) && i.type === "folder").map((i) => i.id)

  if (loading) {
    return (
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-10" /><TableHead className="w-8" /><TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              {isAdmin && <TableHead>Deleted By</TableHead>}
              <TableHead>Deleted At</TableHead>
              <TableHead>Auto-purge</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(3)].map((_, i) => (
              <TableRow key={i}>
                {[...Array(isAdmin ? 8 : 7)].map((_, j) => (
                  <TableCell><div className="h-4 bg-muted rounded animate-pulse" style={{ width: j === 2 ? "60%" : "80%" }} /></TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
        <p className="text-sm text-destructive mb-3">{error}</p>
        {onRetry && <Button variant="outline" size="sm" onClick={onRetry}>Retry</Button>}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/30 p-10 text-center flex flex-col items-center gap-3 mx-auto max-w-xs">
        <div className="size-12 rounded-full bg-muted flex items-center justify-center">
          <Trash2 className="size-6 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-sm">Nothing here</h3>
      </div>
    )
  }

  function computeDaysLeft(deletedAt: string): string {
    const diff = Date.now() - new Date(deletedAt).getTime()
    const daysLeft = Math.max(0, 7 - Math.floor(diff / 86400000))
    if (daysLeft === 0) return "Expiring today"
    if (daysLeft === 1) return "1 day"
    return `${daysLeft} days`
  }

  function handleSort(field: string) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir("asc")
    }
    setPage(1)
  }

  return (
    <div>
      {selected.size > 0 && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-muted/50 rounded-lg border">
          <span className="text-sm text-muted-foreground mr-auto">
            {selectedFolderIds.length > 0 && `${selectedFolderIds.length} folder${selectedFolderIds.length > 1 ? "s" : ""}`}
            {selectedFolderIds.length > 0 && selectedNoteIds.length > 0 && " + "}
            {selectedNoteIds.length > 0 && `${selectedNoteIds.length} note${selectedNoteIds.length > 1 ? "s" : ""}`}
            {" "}selected
          </span>
          <Button variant="outline" size="sm" onClick={() => onRestore(selectedNoteIds, selectedFolderIds)}>
            Restore Selected
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setConfirmDelete({ noteIds: selectedNoteIds, folderIds: selectedFolderIds })}>
            Delete Forever
          </Button>
        </div>
      )}

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-10"><Checkbox checked={allSelected} onChange={toggleAll} /></TableHead>
              <TableHead className="w-8"><span className="sr-only">Type</span></TableHead>
              <TableHead className="cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort("title")}>
                <div className="flex items-center gap-1">
                  Name
                  {sortField === "title" && (
                    <ArrowUp className={`size-3 transition-transform ${sortDir === "desc" ? "rotate-180" : ""}`} />
                  )}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort("type")}>
                <div className="flex items-center gap-1">
                  Type
                  {sortField === "type" && (
                    <ArrowUp className={`size-3 transition-transform ${sortDir === "desc" ? "rotate-180" : ""}`} />
                  )}
                </div>
              </TableHead>
              {isAdmin && <TableHead>Deleted By</TableHead>}
              <TableHead className="cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort("deletedAt")}>
                <div className="flex items-center gap-1">
                  Deleted At
                  {sortField === "deletedAt" && (
                    <ArrowUp className={`size-3 transition-transform ${sortDir === "desc" ? "rotate-180" : ""}`} />
                  )}
                </div>
              </TableHead>
              <TableHead>Auto-purge</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayItems.map((item) => {
              const isLocked = locked.has(item.id)
              const isSelected = selected.has(item.id)
              const folderNotes = notesByFolder.get(item.id)
              const isIndet = item.type === "folder" && folderNotes != null &&
                folderNotes.some((n) => selected.has(n.id)) &&
                !folderNotes.every((n) => selected.has(n.id))

              return (
                <TableRow key={item.id} className={`${isSelected ? "bg-muted/20 hover:bg-muted/30" : ""}`}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Checkbox checked={isSelected} indeterminate={isIndet} disabled={isLocked} onChange={() => toggle(item.id)} />
                      {isLocked && <span className="text-muted-foreground" title="Required — parent folder of a selected note"><LockIcon /></span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.type === "folder" ? <FolderIcon /> : <FileTextIcon />}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={item.type === "folder" ? "font-medium" : ""}>{item.title}</span>
                      {item.type === "folder" && item.notesCount && (
                        <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{item.notesCount} notes</span>
                      )}
                      {item.type === "note" && item.folderName && (
                        <span className="inline-flex items-center text-[11px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800">
                          {item.folderName}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
                      item.type === "folder"
                        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
                    }`}>
                      {item.type === "folder" ? "Folder" : "Note"}
                    </span>
                  </TableCell>
                  {isAdmin && <TableCell className="text-muted-foreground">{item.user || "-"}</TableCell>}
                  <TableCell className="text-muted-foreground whitespace-nowrap">{item.deletedAt}</TableCell>
                  <TableCell>
                    <span className={`text-xs ${computeDaysLeft(item.deletedAt) === "Expiring today" ? "text-destructive" : "text-muted-foreground"}`}>
                      {computeDaysLeft(item.deletedAt)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="xs" onClick={() => onRestore(
                        item.type === "note" ? [item.id] : [],
                        item.type === "folder" ? [item.id] : []
                      )}>Restore</Button>
                      <Button variant="ghost" size="xs" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete({
                        noteIds: item.type === "note" ? [item.id] : [],
                        folderIds: item.type === "folder" ? [item.id] : []
                      })}>Delete</Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between mt-4 text-muted-foreground">
        <div className="flex items-center gap-2 text-sm">
          <span>Rows</span>
          <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1) }}>
            <SelectTrigger className="w-16 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Pagination className="w-auto mx-0">
          <PaginationContent>
            <PaginationItem>
              <Button
                variant="ghost"
                size="default"
                className={cn("pl-1.5! hover:text-muted-foreground", safePage <= 1 && "pointer-events-none opacity-50")}
                onClick={() => setPage(Math.max(1, safePage - 1))}
                aria-label="Go to previous page"
              >
                <ChevronLeftIcon data-icon="inline-start" />
                <span className="hidden sm:block">Previous</span>
              </Button>
            </PaginationItem>
            {getPageNumbers(safePage, totalPages).map((p, i) =>
              p === "ellipsis" ? (
                <PaginationItem key={`e${i}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={p}>
                  <Button
                    variant={p === safePage ? "outline" : "ghost"}
                    size="icon"
                    className="h-8 w-8 hover:text-muted-foreground"
                    aria-current={p === safePage ? "page" : undefined}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                </PaginationItem>
              )
            )}
            <PaginationItem>
              <Button
                variant="ghost"
                size="default"
                className={cn("pr-1.5! hover:text-muted-foreground", safePage >= totalPages && "pointer-events-none opacity-50")}
                onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                aria-label="Go to next page"
              >
                <span className="hidden sm:block">Next</span>
                <ChevronRightIcon data-icon="inline-end" />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
        <span className="text-sm">
          Page {safePage} of {totalPages} ({sortedItems.length} total)
        </span>
      </div>

      <Dialog open={confirmDelete !== null} onOpenChange={(open) => { if (!open) setConfirmDelete(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete forever?</DialogTitle>
            <DialogDescription>
              {confirmDelete && (() => {
                const parts: string[] = []
                if (confirmDelete.folderIds.length > 0) {
                  const folderNotes = items.filter((i) => i.type === "note" && confirmDelete.folderIds.includes(i.folderId || "")).length
                  parts.push(`${confirmDelete.folderIds.length} folder${confirmDelete.folderIds.length > 1 ? "s" : ""}`)
                  if (folderNotes > 0) parts[parts.length - 1] += ` with ${folderNotes} note${folderNotes > 1 ? "s" : ""} inside`
                }
                if (confirmDelete.noteIds.length > 0) parts.push(`${confirmDelete.noteIds.length} note${confirmDelete.noteIds.length > 1 ? "s" : ""}`)
                return <>This will permanently delete {parts.join(" and ")}. This action cannot be undone.</>
              })()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              if (confirmDelete) {
                onPermanentDelete(confirmDelete.noteIds, confirmDelete.folderIds)
                setSelected(new Set())
                setLocked(new Set())
                setConfirmDelete(null)
              }
            }}>Delete Forever</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
