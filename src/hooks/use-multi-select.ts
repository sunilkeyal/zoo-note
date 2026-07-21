import { useState, useCallback, useRef } from "react"

interface UseMultiSelectReturn {
  selectedIds: Set<string>
  lastSelectedId: string | null
  isSelecting: boolean
  toggleSelect: (id: string) => void
  selectRange: (id: string, allIds: string[]) => void
  selectAll: (allIds: string[]) => void
  clearSelection: () => void
}

export function useMultiSelect(): UseMultiSelectReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)
  const selectedIdsRef = useRef(selectedIds)
  selectedIdsRef.current = selectedIds

  const isSelecting = selectedIds.size > 0

  const toggleSelect = useCallback((id: string) => {
    const isRemoving = selectedIdsRef.current.has(id)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    if (isRemoving) {
      setLastSelectedId((prev) => (prev === id ? null : prev))
    } else {
      setLastSelectedId(id)
    }
  }, [])

  const selectRange = useCallback((id: string, allIds: string[]) => {
    setLastSelectedId((prevLast) => {
      if (!prevLast) {
        setSelectedIds((prev) => {
          const next = new Set(prev)
          next.add(id)
          return next
        })
        return id
      }
      const startIdx = allIds.indexOf(prevLast)
      const endIdx = allIds.indexOf(id)
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
      const rangeIds = allIds.slice(from, to + 1)
      setSelectedIds((prev) => {
        const next = new Set(prev)
        rangeIds.forEach((rid) => next.add(rid))
        return next
      })
      return id
    })
  }, [])

  const selectAll = useCallback((allIds: string[]) => {
    setSelectedIds(new Set(allIds))
    setLastSelectedId(allIds[allIds.length - 1] ?? null)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setLastSelectedId(null)
  }, [])

  return {
    selectedIds,
    lastSelectedId,
    isSelecting,
    toggleSelect,
    selectRange,
    selectAll,
    clearSelection,
  }
}
