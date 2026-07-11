"use client"
import React, { useEffect, useState } from "react"
import { flushSync } from "react-dom"
import { Editor } from "@tiptap/react"

interface Props {
  editor: Editor
  editorContainerRef: React.RefObject<HTMLElement | null>
}

interface MenuPosition { x: number; y: number }

interface Action {
  label: string
  onClick: () => void
  destructive?: boolean
}

type MenuItem = Action | null

export function TableContextMenu({ editor, editorContainerRef }: Props) {
  const [position, setPosition] = useState<MenuPosition | null>(null)

  // Effect 1: container contextmenu listener (always active)
  useEffect(() => {
    const el = editorContainerRef.current
    if (!el) return

    const onContextMenu = (e: MouseEvent) => {
      if (!editor.isActive("table")) return
      e.preventDefault()
      // flushSync needed: native listeners (not JSX) bypass React 18 auto-batching in tests
      flushSync(() => setPosition({ x: e.clientX, y: e.clientY }))
    }

    el.addEventListener("contextmenu", onContextMenu)
    return () => { el.removeEventListener("contextmenu", onContextMenu) }
  }, [editor, editorContainerRef])

  // Effect 2: dismiss listeners — only when menu is open
  useEffect(() => {
    if (!position) return
    // flushSync needed: native listeners (not JSX) bypass React 18 auto-batching in tests
    const onDismiss = () => flushSync(() => setPosition(null))
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") flushSync(() => setPosition(null)) }
    document.addEventListener("click", onDismiss)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("click", onDismiss)
      document.removeEventListener("keydown", onKey)
    }
  }, [position])

  if (!position) return null

  const items: MenuItem[] = [
    { label: "Add Row Above", onClick: () => editor.chain().focus().addRowBefore().run() },
    { label: "Add Row Below", onClick: () => editor.chain().focus().addRowAfter().run() },
    { label: "Delete Row", onClick: () => editor.chain().focus().deleteRow().run(), destructive: true },
    null,
    { label: "Add Column Left", onClick: () => editor.chain().focus().addColumnBefore().run() },
    { label: "Add Column Right", onClick: () => editor.chain().focus().addColumnAfter().run() },
    { label: "Delete Column", onClick: () => editor.chain().focus().deleteColumn().run(), destructive: true },
    null,
    { label: "Toggle Header Row", onClick: () => editor.chain().focus().toggleHeaderRow().run() },
    { label: "Delete Table", onClick: () => editor.chain().focus().deleteTable().run(), destructive: true },
  ]

  return (
    <div
      data-testid="table-context-menu"
      className="fixed z-50 min-w-[180px] border rounded-lg bg-popover text-popover-foreground shadow-lg py-1"
      style={{ top: position.y, left: position.x }}
    >
      {items.map((item, i) =>
        item === null ? (
          <div key={i} className="my-1 border-t border-border" />
        ) : (
          <button
            key={item.label}
            className={`w-full text-left px-3 py-1.5 text-sm hover:bg-accent ${item.destructive ? "text-destructive" : ""}`}
            onClick={() => { item.onClick(); setPosition(null) }}
          >
            {item.label}
          </button>
        )
      )}
    </div>
  )
}
