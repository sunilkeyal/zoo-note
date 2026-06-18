"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"


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

export default function TrashTable({ items, isAdmin, loading, error, onRestore, onPermanentDelete, onRetry }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [locked, setLocked] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState<{ noteIds: string[]; folderIds: string[] } | null>(null)

  const notesByFolder = new Map<string, TrashItem[]>()
  for (const item of items) {
    if (item.type === "note" && item.folderId) {
      const list = notesByFolder.get(item.folderId) || []
      list.push(item)
      notesByFolder.set(item.folderId, list)
    }
  }

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
      } else {
        next.add(id)
        if (item.type === "note" && item.folderId) {
          const folder = items.find((i) => i.id === item.folderId)
          if (folder) {
            next.add(item.folderId)
            lock.add(item.folderId)
          }
        }
      }
      setLocked(lock)
      return next
    })
  }, [items, locked, notesByFolder])

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      const allCheckable = items.filter((i) => !locked.has(i.id))
      const allSel = allCheckable.length > 0 && allCheckable.every((i) => prev.has(i.id))
      if (allSel) {
        const next = new Set(prev)
        for (const i of items) if (!locked.has(i.id)) next.delete(i.id)
        return next
      } else {
        const next = new Set(prev)
        for (const item of items) {
          if (!next.has(item.id)) {
            next.add(item.id)
            if (item.type === "note" && item.folderId) {
              const folder = items.find((f) => f.id === item.folderId)
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
  }, [items, locked])

  const allCheckable = items.filter((i) => !locked.has(i.id))
  const allSelected = allCheckable.length > 0 && allCheckable.every((i) => selected.has(i.id))

  const selectedNoteIds = items.filter((i) => selected.has(i.id) && i.type === "note").map((i) => i.id)
  const selectedFolderIds = items.filter((i) => selected.has(i.id) && i.type === "folder").map((i) => i.id)

  if (loading) {
    return (
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 w-10" /><th className="p-3 w-8" /><th className="p-3 font-medium text-left">Name</th>
              <th className="p-3 font-medium text-left">Type</th>
              {isAdmin && <th className="p-3 font-medium text-left">Deleted By</th>}
              <th className="p-3 font-medium text-left">Deleted At</th>
              <th className="p-3 font-medium text-left">Auto-purge</th>
              <th className="p-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(3)].map((_, i) => (
              <tr key={i} className="border-b last:border-0">
                {[...Array(isAdmin ? 8 : 7)].map((_, j) => (
                  <td key={j} className="p-3"><div className="h-4 bg-muted rounded animate-pulse" style={{ width: j === 2 ? "60%" : "80%" }} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
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
      <div className="text-center py-16 text-muted-foreground">
        <p>Trash is empty</p>
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
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 w-10"><Checkbox checked={allSelected} onChange={toggleAll} /></th>
              <th className="p-3 w-8"><span className="sr-only">Type</span></th>
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Type</th>
              {isAdmin && <th className="text-left p-3 font-medium">Deleted By</th>}
              <th className="text-left p-3 font-medium">Deleted At</th>
              <th className="text-left p-3 font-medium">Auto-purge</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const isLocked = locked.has(item.id)
              const isSelected = selected.has(item.id)
              const folderNotes = notesByFolder.get(item.id)
              const isIndet = item.type === "folder" && folderNotes != null &&
                folderNotes.some((n) => selected.has(n.id)) &&
                !folderNotes.every((n) => selected.has(n.id))

              return (
                <tr key={item.id} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${isSelected ? "bg-muted/20" : ""}`}>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <Checkbox checked={isSelected} indeterminate={isIndet} disabled={isLocked} onChange={() => toggle(item.id)} />
                      {isLocked && <span className="text-muted-foreground" title="Required — parent folder of a selected note"><LockIcon /></span>}
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {item.type === "folder" ? <FolderIcon /> : <FileTextIcon />}
                  </td>
                  <td className="p-3">
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
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
                      item.type === "folder"
                        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
                    }`}>
                      {item.type === "folder" ? "Folder" : "Note"}
                    </span>
                  </td>
                  {isAdmin && <td className="p-3 text-muted-foreground">{item.user || "-"}</td>}
                  <td className="p-3 text-muted-foreground whitespace-nowrap">{item.deletedAt}</td>
                  <td className="p-3">
                    <span className={`text-xs ${computeDaysLeft(item.deletedAt) === "Expiring today" ? "text-destructive" : "text-muted-foreground"}`}>
                      {computeDaysLeft(item.deletedAt)}
                    </span>
                  </td>
                  <td className="p-3 text-right">
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
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={confirmDelete !== null} onOpenChange={(open) => { if (!open) setConfirmDelete(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete forever?</DialogTitle>
            <DialogDescription>
              {confirmDelete && (() => {
                const a: string[] = []
                if (confirmDelete.folderIds.length > 0) a.push(`${confirmDelete.folderIds.length} folder${confirmDelete.folderIds.length > 1 ? "s" : ""}`)
                if (confirmDelete.noteIds.length > 0) a.push(`${confirmDelete.noteIds.length} note${confirmDelete.noteIds.length > 1 ? "s" : ""}`)
                return <>This will permanently delete {a.join(" and ")}. This action cannot be undone.</>
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
