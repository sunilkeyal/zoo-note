import { renderHook, act } from "@testing-library/react"
import { useMultiSelect } from "@/hooks/use-multi-select"

describe("useMultiSelect", () => {
  const ids = ["a", "b", "c", "d", "e"]

  it("starts with empty selection", () => {
    const { result } = renderHook(() => useMultiSelect())
    expect(result.current.selectedIds.size).toBe(0)
    expect(result.current.isSelecting).toBe(false)
    expect(result.current.lastSelectedId).toBeNull()
  })

  it("toggleSelect adds and removes items", () => {
    const { result } = renderHook(() => useMultiSelect())
    act(() => result.current.toggleSelect("a"))
    expect(result.current.selectedIds.has("a")).toBe(true)
    expect(result.current.isSelecting).toBe(true)
    expect(result.current.lastSelectedId).toBe("a")

    act(() => result.current.toggleSelect("a"))
    expect(result.current.selectedIds.has("a")).toBe(false)
    expect(result.current.isSelecting).toBe(false)
    expect(result.current.lastSelectedId).toBeNull()
  })

  it("selectRange selects contiguous items", () => {
    const { result } = renderHook(() => useMultiSelect())
    act(() => result.current.toggleSelect("b"))
    act(() => result.current.selectRange("d", ids))
    expect(result.current.selectedIds.size).toBe(3)
    expect(result.current.selectedIds.has("b")).toBe(true)
    expect(result.current.selectedIds.has("c")).toBe(true)
    expect(result.current.selectedIds.has("d")).toBe(true)
  })

  it("selectRange works in reverse order", () => {
    const { result } = renderHook(() => useMultiSelect())
    act(() => result.current.toggleSelect("d"))
    act(() => result.current.selectRange("b", ids))
    expect(result.current.selectedIds.size).toBe(3)
    expect(result.current.selectedIds.has("b")).toBe(true)
    expect(result.current.selectedIds.has("c")).toBe(true)
    expect(result.current.selectedIds.has("d")).toBe(true)
  })

  it("selectRange without lastSelectedId falls back to toggleSelect", () => {
    const { result } = renderHook(() => useMultiSelect())
    act(() => result.current.selectRange("c", ids))
    expect(result.current.selectedIds.size).toBe(1)
    expect(result.current.selectedIds.has("c")).toBe(true)
  })

  it("selectAll selects all provided ids", () => {
    const { result } = renderHook(() => useMultiSelect())
    act(() => result.current.selectAll(ids))
    expect(result.current.selectedIds.size).toBe(5)
    expect(result.current.isSelecting).toBe(true)
  })

  it("clearSelection resets everything", () => {
    const { result } = renderHook(() => useMultiSelect())
    act(() => result.current.selectAll(ids))
    act(() => result.current.clearSelection())
    expect(result.current.selectedIds.size).toBe(0)
    expect(result.current.isSelecting).toBe(false)
    expect(result.current.lastSelectedId).toBeNull()
  })
})
