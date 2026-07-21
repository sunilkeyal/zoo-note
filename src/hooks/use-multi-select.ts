import { useReducer, useCallback } from "react"

interface SelectionState {
  selectedIds: Set<string>
  lastSelectedId: string | null
}

type SelectionAction =
  | { type: "TOGGLE"; id: string }
  | { type: "RANGE"; id: string; allIds: string[] }
  | { type: "SELECT_ALL"; allIds: string[] }
  | { type: "CLEAR" }

function selectionReducer(state: SelectionState, action: SelectionAction): SelectionState {
  switch (action.type) {
    case "TOGGLE": {
      const next = new Set(state.selectedIds)
      const isRemoving = next.has(action.id)
      if (isRemoving) {
        next.delete(action.id)
      } else {
        next.add(action.id)
      }
      return {
        selectedIds: next,
        lastSelectedId: isRemoving
          ? (state.lastSelectedId === action.id ? null : state.lastSelectedId)
          : action.id,
      }
    }
    case "RANGE": {
      if (!state.lastSelectedId) {
        const next = new Set(state.selectedIds)
        next.add(action.id)
        return { selectedIds: next, lastSelectedId: action.id }
      }
      const startIdx = action.allIds.indexOf(state.lastSelectedId)
      const endIdx = action.allIds.indexOf(action.id)
      if (startIdx === -1 || endIdx === -1) {
        const next = new Set(state.selectedIds)
        next.add(action.id)
        return { selectedIds: next, lastSelectedId: action.id }
      }
      const from = Math.min(startIdx, endIdx)
      const to = Math.max(startIdx, endIdx)
      const rangeIds = action.allIds.slice(from, to + 1)
      const next = new Set(state.selectedIds)
      rangeIds.forEach((rid) => next.add(rid))
      return { selectedIds: next, lastSelectedId: action.id }
    }
    case "SELECT_ALL": {
      return {
        selectedIds: new Set(action.allIds),
        lastSelectedId: action.allIds[action.allIds.length - 1] ?? null,
      }
    }
    case "CLEAR": {
      return { selectedIds: new Set(), lastSelectedId: null }
    }
  }
}

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
  const [state, dispatch] = useReducer(selectionReducer, {
    selectedIds: new Set<string>(),
    lastSelectedId: null,
  })

  const toggleSelect = useCallback((id: string) => {
    dispatch({ type: "TOGGLE", id })
  }, [])

  const selectRange = useCallback((id: string, allIds: string[]) => {
    dispatch({ type: "RANGE", id, allIds })
  }, [])

  const selectAll = useCallback((allIds: string[]) => {
    dispatch({ type: "SELECT_ALL", allIds })
  }, [])

  const clearSelection = useCallback(() => {
    dispatch({ type: "CLEAR" })
  }, [])

  return {
    selectedIds: state.selectedIds,
    lastSelectedId: state.lastSelectedId,
    isSelecting: state.selectedIds.size > 0,
    toggleSelect,
    selectRange,
    selectAll,
    clearSelection,
  }
}
