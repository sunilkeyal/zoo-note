"use client"

import { useEffect, useRef, useCallback } from "react"

const FOCUS_BG_CLASSES = "bg-sidebar-accent"

function getFocusableItems(sidebarEl: HTMLElement): HTMLElement[] {
  const items = sidebarEl.querySelectorAll<HTMLElement>("[data-sidebar-nav-item]")
  return Array.from(items).filter((el) => {
    if (el.offsetParent === null) return false
    const collapsibleContent = el.closest("[data-slot='collapsible-content']")
    if (collapsibleContent && collapsibleContent.getAttribute("data-state") === "closed") {
      return false
    }
    return true
  })
}

function applyFocusStyles(el: Element | null) {
  if (!el) return
  el.classList.add(...FOCUS_BG_CLASSES.split(" "))
  const h = el as HTMLElement
  h.style.outline = "none"
  h.style.boxShadow = "none"
}

function removeFocusStyles(el: Element | null) {
  if (!el) return
  el.classList.remove(...FOCUS_BG_CLASSES.split(" "))
  const h = el as HTMLElement
  h.style.outline = ""
  h.style.boxShadow = ""
}

export function useSidebarKeyboardNav(sidebarRef: React.RefObject<HTMLDivElement | null>) {
  const focusedIndexRef = useRef(-1)
  const lastFocusedIdRef = useRef<string | null>(null)

  const syncFocus = useCallback((items: Element[], index: number) => {
    items.forEach((item, i) => {
      const el = item as HTMLElement
      if (i === index) {
        el.tabIndex = 0
        applyFocusStyles(el)
        el.focus()
        el.scrollIntoView({ block: "nearest" })
      } else {
        el.tabIndex = -1
        removeFocusStyles(el)
      }
    })
  }, [])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!sidebarRef.current) return

      const active = document.activeElement as HTMLElement | null
      if (!active) return
      if (active.tagName === "INPUT" || active.tagName === "TEXTAREA") return
      if (active.isContentEditable) return

      const sidebar = sidebarRef.current.closest("[data-slot='sidebar']") as HTMLElement | null
      if (!sidebar) return

      const items = getFocusableItems(sidebar)
      if (items.length === 0) return

      const inSidebar = sidebar.contains(active)

      if (!inSidebar) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault()
          let reentryIndex = focusedIndexRef.current
          if (reentryIndex < 0) {
            const noteMatch = window.location.pathname.match(/\/notes\/([^/]+)/)
            if (noteMatch) {
              const noteEl = sidebar.querySelector<HTMLElement>(`[data-sidebar-nav-item="note-${noteMatch[1]}"]`)
              if (noteEl) reentryIndex = items.indexOf(noteEl)
            }
            if (reentryIndex < 0) {
              const activePage = sidebar.querySelector<HTMLElement>('[aria-current="page"]')
              reentryIndex = activePage ? items.indexOf(activePage) : 0
            }
            if (reentryIndex < 0) reentryIndex = 0
          }
          focusedIndexRef.current = reentryIndex
          syncFocus(items, reentryIndex)
        }
        return
      }

      let currentIndex = items.indexOf(active)
      if (currentIndex === -1) {
        currentIndex = focusedIndexRef.current >= 0 ? focusedIndexRef.current : 0
      }

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault()
          const nextIndex = Math.min(currentIndex + 1, items.length - 1)
          focusedIndexRef.current = nextIndex
          syncFocus(items, nextIndex)
          break
        }
        case "ArrowUp": {
          e.preventDefault()
          const prevIndex = Math.max(currentIndex - 1, 0)
          focusedIndexRef.current = prevIndex
          syncFocus(items, prevIndex)
          break
        }
        case "Enter": {
          e.preventDefault()
          const target = items[currentIndex] as HTMLElement
          if (target) {
            target.click()
            lastFocusedIdRef.current = target.getAttribute("data-sidebar-nav-item") ?? null
          }
          break
        }
        case "Escape": {
          e.preventDefault()
          removeFocusStyles(items[currentIndex] ?? null)
          items.forEach((item) => {
            ;(item as HTMLElement).tabIndex = -1
          })
          focusedIndexRef.current = -1
          const main = document.querySelector("main")
          if (main) {
            main.tabIndex = -1
            main.focus()
          }
          break
        }
        case "F10": {
          if (e.shiftKey) {
            e.preventDefault()
            const target = items[currentIndex] as HTMLElement
            if (target) {
              const contextMenuTrigger = target.closest("[data-slot='context-menu-trigger']")
              if (contextMenuTrigger) {
                const contextMenuEvent = new MouseEvent("contextmenu", {
                  bubbles: true,
                  cancelable: true,
                  button: 2,
                })
                target.dispatchEvent(contextMenuEvent)
              }
            }
          }
          break
        }
      }
    },
    [sidebarRef, syncFocus]
  )

  const handleClick = useCallback(
    (e: MouseEvent) => {
      if (!sidebarRef.current) return

      const target = e.target as HTMLElement
      const sidebar = sidebarRef.current.closest("[data-slot='sidebar']") as HTMLElement | null
      if (!sidebar) return

      const clickedItem = target.closest("[data-sidebar-nav-item]") as HTMLElement | null
      if (!clickedItem || !sidebar.contains(clickedItem)) return

      const items = getFocusableItems(sidebar)
      const index = items.indexOf(clickedItem)
      if (index === -1) return

      focusedIndexRef.current = index

      items.forEach((item, i) => {
        const el = item as HTMLElement
        if (i === index) {
          el.tabIndex = 0
          applyFocusStyles(el)
        } else {
          el.tabIndex = -1
          removeFocusStyles(el)
        }
      })
    },
    [sidebarRef]
  )

  useEffect(() => {
    const sidebar = sidebarRef.current?.closest("[data-slot='sidebar']") as HTMLElement | null
    if (!sidebar) return

    const sidebarContent = sidebar.querySelector<HTMLElement>("[data-slot='sidebar-content']")
    if (!sidebarContent) return

    document.addEventListener("keydown", handleKeyDown, true)
    sidebarContent.addEventListener("click", handleClick)

    const observer = new MutationObserver((mutations) => {
      if (focusedIndexRef.current < 0) return

      const items = getFocusableItems(sidebar)
      const currentIndex = focusedIndexRef.current
      if (currentIndex >= items.length) {
        focusedIndexRef.current = items.length > 0 ? items.length - 1 : -1
      }

      const idx = focusedIndexRef.current
      if (idx < 0 || idx >= items.length) return

      const el = items[idx] as HTMLElement
      const hasStyles = el.classList.contains("bg-sidebar-accent")

      if (!hasStyles) {
        el.tabIndex = 0
        applyFocusStyles(el)
      }
    })

    observer.observe(sidebarContent, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] })

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true)
      sidebarContent.removeEventListener("click", handleClick)
      observer.disconnect()
    }
  }, [sidebarRef, handleKeyDown, handleClick])
}
