import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import React from "react"
import { useSidebarKeyboardNav } from "@/hooks/use-sidebar-keyboard-nav"

function createSidebarHTML(): HTMLDivElement {
  const sidebar = document.createElement("div")
  sidebar.setAttribute("data-slot", "sidebar")
  sidebar.innerHTML = `
    <div data-slot="sidebar-content">
      <button data-sidebar-nav-item="home" tabindex="-1">Home</button>
      <button data-sidebar-nav-item="favorites" tabindex="-1">Favorites</button>
      <button data-sidebar-nav-item="note-1" tabindex="-1">Note 1</button>
      <button data-sidebar-nav-item="note-2" tabindex="-1">Note 2</button>
      <button data-sidebar-nav-item="trash" tabindex="-1">Trash</button>
    </div>
  `
  return sidebar
}

function createSidebarWithCollapsible(): HTMLDivElement {
  const sidebar = document.createElement("div")
  sidebar.setAttribute("data-slot", "sidebar")
  sidebar.innerHTML = `
    <div data-slot="sidebar-content">
      <button data-sidebar-nav-item="home" tabindex="-1">Home</button>
      <div data-slot="collapsible-content" data-state="open">
        <button data-sidebar-nav-item="folder-1" tabindex="-1" aria-expanded="true">Folder 1</button>
        <button data-sidebar-nav-item="note-1" tabindex="-1">Note 1</button>
      </div>
      <div data-slot="collapsible-content" data-state="closed">
        <button data-sidebar-nav-item="folder-2" tabindex="-1" aria-expanded="false">Folder 2</button>
        <button data-sidebar-nav-item="note-2" tabindex="-1" style="display:none">Note 2</button>
      </div>
      <button data-sidebar-nav-item="trash" tabindex="-1">Trash</button>
    </div>
  `
  return sidebar
}

function createContextMenuItemSidebar(): HTMLDivElement {
  const sidebar = document.createElement("div")
  sidebar.setAttribute("data-slot", "sidebar")
  sidebar.innerHTML = `
    <div data-slot="sidebar-content">
      <div data-slot="context-menu-trigger">
        <button data-sidebar-nav-item="note-1" tabindex="-1">Note 1</button>
      </div>
      <div data-slot="context-menu-trigger">
        <button data-sidebar-nav-item="note-2" tabindex="-1">Note 2</button>
      </div>
    </div>
  `
  return sidebar
}

describe("useSidebarKeyboardNav", () => {
  let sidebarEl: HTMLDivElement

  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn()
    sidebarEl = createSidebarHTML()
    document.body.appendChild(sidebarEl)

    Object.defineProperty(sidebarEl, "offsetParent", { value: document.body, configurable: true })
    sidebarEl.querySelectorAll("[data-sidebar-nav-item]").forEach((el) => {
      Object.defineProperty(el, "offsetParent", { value: sidebarEl, configurable: true })
    })
  })

  afterEach(() => {
    document.body.removeChild(sidebarEl)
    document.body.innerHTML = ""
  })

  function createRef(): React.RefObject<HTMLElement> {
    return { current: sidebarEl } as React.RefObject<HTMLElement>
  }

  function getContent() {
    return sidebarEl.querySelector("[data-slot='sidebar-content']")!
  }

  describe("ArrowDown navigation", () => {
    it("should focus the next item when ArrowDown is pressed", () => {
      const ref = createRef()
      renderHook(() => useSidebarKeyboardNav(ref))

      const homeItem = sidebarEl.querySelector("[data-sidebar-nav-item='home']") as HTMLElement
      homeItem.focus()

      act(() => {
        getContent().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }))
      })

      expect(document.activeElement?.getAttribute("data-sidebar-nav-item")).toBe("favorites")
    })

    it("should move focus down through items sequentially", () => {
      const ref = createRef()
      renderHook(() => useSidebarKeyboardNav(ref))

      const homeItem = sidebarEl.querySelector("[data-sidebar-nav-item='home']") as HTMLElement
      homeItem.focus()

      act(() => {
        getContent().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }))
      })
      expect(document.activeElement?.getAttribute("data-sidebar-nav-item")).toBe("favorites")

      act(() => {
        getContent().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }))
      })
      expect(document.activeElement?.getAttribute("data-sidebar-nav-item")).toBe("note-1")
    })

    it("should not wrap past the last item", () => {
      const ref = createRef()
      renderHook(() => useSidebarKeyboardNav(ref))

      const trashItem = sidebarEl.querySelector("[data-sidebar-nav-item='trash']") as HTMLElement
      trashItem.focus()

      act(() => {
        getContent().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }))
      })

      expect(document.activeElement?.getAttribute("data-sidebar-nav-item")).toBe("trash")
    })
  })

  describe("ArrowUp navigation", () => {
    it("should move focus up through items", () => {
      const ref = createRef()
      renderHook(() => useSidebarKeyboardNav(ref))

      const note1 = sidebarEl.querySelector("[data-sidebar-nav-item='note-1']") as HTMLElement
      note1.focus()

      act(() => {
        getContent().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }))
      })

      expect(document.activeElement?.getAttribute("data-sidebar-nav-item")).toBe("favorites")
    })

    it("should not wrap past the first item", () => {
      const ref = createRef()
      renderHook(() => useSidebarKeyboardNav(ref))

      const homeItem = sidebarEl.querySelector("[data-sidebar-nav-item='home']") as HTMLElement
      homeItem.focus()

      act(() => {
        getContent().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }))
      })

      expect(document.activeElement?.getAttribute("data-sidebar-nav-item")).toBe("home")
    })
  })

  describe("Collapsed sections", () => {
    it("should skip items inside collapsed CollapsibleContent", () => {
      document.body.removeChild(sidebarEl)
      sidebarEl = createSidebarWithCollapsible()
      document.body.appendChild(sidebarEl)

      sidebarEl.querySelectorAll("[data-sidebar-nav-item]").forEach((el) => {
        Object.defineProperty(el, "offsetParent", { value: sidebarEl, configurable: true })
      })

      const ref = createRef()
      renderHook(() => useSidebarKeyboardNav(ref))

      const homeItem = sidebarEl.querySelector("[data-sidebar-nav-item='home']") as HTMLElement
      homeItem.focus()

      const content = sidebarEl.querySelector("[data-slot='sidebar-content']")!

      act(() => {
        content.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }))
      })
      expect(document.activeElement?.getAttribute("data-sidebar-nav-item")).toBe("folder-1")

      act(() => {
        content.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }))
      })
      expect(document.activeElement?.getAttribute("data-sidebar-nav-item")).toBe("note-1")

      act(() => {
        content.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }))
      })
      expect(document.activeElement?.getAttribute("data-sidebar-nav-item")).toBe("trash")
    })
  })

  describe("Enter key", () => {
    it("should click the focused item when Enter is pressed", () => {
      const ref = createRef()
      renderHook(() => useSidebarKeyboardNav(ref))

      const note1 = sidebarEl.querySelector("[data-sidebar-nav-item='note-1']") as HTMLElement
      const clickSpy = vi.spyOn(note1, "click")
      note1.focus()

      act(() => {
        getContent().dispatchEvent(
          new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })
        )
      })

      expect(clickSpy).toHaveBeenCalled()
    })
  })

  describe("Escape key", () => {
    it("should move focus to main element and reset state", () => {
      const main = document.createElement("main")
      document.body.appendChild(main)

      const ref = createRef()
      renderHook(() => useSidebarKeyboardNav(ref))

      const note1 = sidebarEl.querySelector("[data-sidebar-nav-item='note-1']") as HTMLElement
      note1.focus()

      act(() => {
        getContent().dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
        )
      })

      expect(document.activeElement).toBe(main)

      document.body.removeChild(main)
    })
  })

  describe("Focus styles", () => {
    it("should apply focus classes to the focused item", () => {
      const ref = createRef()
      renderHook(() => useSidebarKeyboardNav(ref))

      const homeItem = sidebarEl.querySelector("[data-sidebar-nav-item='home']") as HTMLElement
      homeItem.focus()

      act(() => {
        getContent().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }))
      })

      const favorites = sidebarEl.querySelector("[data-sidebar-nav-item='favorites']")!
      expect(favorites.classList.contains("bg-sidebar-accent")).toBe(true)
    })

    it("should remove focus classes from the previously focused item", () => {
      const ref = createRef()
      renderHook(() => useSidebarKeyboardNav(ref))

      const homeItem = sidebarEl.querySelector("[data-sidebar-nav-item='home']") as HTMLElement
      homeItem.focus()

      act(() => {
        getContent().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }))
      })

      expect(homeItem.classList.contains("bg-sidebar-accent")).toBe(false)
    })
  })

  describe("tabIndex management", () => {
    it("should set tabIndex=0 on the focused item and tabIndex=-1 on others", () => {
      const ref = createRef()
      renderHook(() => useSidebarKeyboardNav(ref))

      const homeItem = sidebarEl.querySelector("[data-sidebar-nav-item='home']") as HTMLElement
      homeItem.focus()

      act(() => {
        getContent().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }))
      })

      const favorites = sidebarEl.querySelector("[data-sidebar-nav-item='favorites']") as HTMLElement
      expect(favorites.tabIndex).toBe(0)
      expect(homeItem.tabIndex).toBe(-1)
    })
  })

  describe("Input/Textarea bypass", () => {
    it("should not intercept keyboard events when an input is focused", () => {
      const input = document.createElement("input")
      sidebarEl.querySelector("[data-slot='sidebar-content']")!.appendChild(input)
      input.focus()

      const ref = createRef()
      renderHook(() => useSidebarKeyboardNav(ref))

      act(() => {
        getContent().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }))
      })

      expect(document.activeElement).toBe(input)
    })
  })

  describe("Click handling", () => {
    it("should focus the clicked item and apply styles", () => {
      const ref = createRef()
      renderHook(() => useSidebarKeyboardNav(ref))

      const note1 = sidebarEl.querySelector("[data-sidebar-nav-item='note-1']") as HTMLElement

      act(() => {
        note1.click()
      })

      expect(note1.classList.contains("bg-sidebar-accent")).toBe(true)
      expect(note1.tabIndex).toBe(0)
    })
  })

  describe("Context menu (Shift+F10)", () => {
    it("should dispatch contextmenu event when Shift+F10 is pressed", () => {
      document.body.removeChild(sidebarEl)
      sidebarEl = createContextMenuItemSidebar()
      document.body.appendChild(sidebarEl)

      sidebarEl.querySelectorAll("[data-sidebar-nav-item]").forEach((el) => {
        Object.defineProperty(el, "offsetParent", { value: sidebarEl, configurable: true })
      })

      const ref = createRef()
      renderHook(() => useSidebarKeyboardNav(ref))

      const note1 = sidebarEl.querySelector("[data-sidebar-nav-item='note-1']") as HTMLElement
      note1.focus()

      const contextMenuHandler = vi.fn()
      note1.addEventListener("contextmenu", contextMenuHandler)

      const content = sidebarEl.querySelector("[data-slot='sidebar-content']")!

      act(() => {
        content.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "F10",
            shiftKey: true,
            bubbles: true,
            cancelable: true,
          })
        )
      })

      expect(contextMenuHandler).toHaveBeenCalled()
    })

    it("should not dispatch contextmenu when item is not inside a ContextMenuTrigger", () => {
      const ref = createRef()
      renderHook(() => useSidebarKeyboardNav(ref))

      const note1 = sidebarEl.querySelector("[data-sidebar-nav-item='note-1']") as HTMLElement
      note1.focus()

      const contextMenuHandler = vi.fn()
      note1.addEventListener("contextmenu", contextMenuHandler)

      act(() => {
        getContent().dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "F10",
            shiftKey: true,
            bubbles: true,
            cancelable: true,
          })
        )
      })

      expect(contextMenuHandler).not.toHaveBeenCalled()
    })
  })
})
