"use client"
import React, { useEffect, useState } from "react"
import { flushSync } from "react-dom"
import { Editor } from "@tiptap/react"
import {
  ArrowUpToLine,
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  TableProperties,
  Trash2,
} from "lucide-react"

interface Props {
  editor: Editor
  editorContainerRef: React.RefObject<HTMLElement | null>
}

interface MenuPosition { x: number; y: number }

interface Action {
  label: string
  icon: React.ElementType
  onClick: () => void
  destructive?: boolean
  disabled?: boolean
}

type MenuItem = Action | null

/** Returns true when the table containing the current selection already has a header row. */
function tableHasHeaderRow(editor: Editor): boolean {
  const { doc, selection } = editor.state
  let hasHeader = false
  doc.nodesBetween(selection.from, selection.to, (node) => {
    if (node.type.name === "table") {
      const firstCell = node.firstChild?.firstChild
      if (firstCell?.type.name === "tableHeader") hasHeader = true
      return false
    }
  })
  return hasHeader
}

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

  // "Add Row Above" is disabled when cursor is in the header row — adding above would
  // push the header down to row 2 while leaving it styled as header.
  const inHeaderRow = editor.isActive("tableHeader")
  const hasHeader = tableHasHeaderRow(editor)

  const items: MenuItem[] = [
    { label: "Add Row Above", icon: ArrowUpToLine, onClick: () => editor.chain().focus().addRowBefore().run(), disabled: inHeaderRow },
    { label: "Add Row Below", icon: ArrowDownToLine, onClick: () => editor.chain().focus().addRowAfter().run() },
    { label: "Delete Row", icon: Trash2, onClick: () => editor.chain().focus().deleteRow().run(), destructive: true },
    null,
    { label: "Add Column Left", icon: ArrowLeftToLine, onClick: () => editor.chain().focus().addColumnBefore().run() },
    { label: "Add Column Right", icon: ArrowRightToLine, onClick: () => editor.chain().focus().addColumnAfter().run() },
    { label: "Delete Column", icon: Trash2, onClick: () => editor.chain().focus().deleteColumn().run(), destructive: true },
    null,
    { label: "Set as Header Row", icon: TableProperties, onClick: () => editor.chain().focus().toggleHeaderRow().run(), disabled: hasHeader },
    { label: "Delete Table", icon: Trash2, onClick: () => editor.chain().focus().deleteTable().run(), destructive: true },
  ]

  return (
    <div
      data-testid="table-context-menu"
      className="fixed z-50 w-max origin-top-left rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
      style={{ top: position.y, left: position.x }}
    >
      {items.map((item, i) =>
        item === null ? (
          <div key={i} className="my-1 border-t border-border" />
        ) : (
          <button
            key={item.label}
            disabled={item.disabled}
            className={`flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-none
              ${item.disabled ? "cursor-default opacity-50" : "cursor-default hover:bg-accent hover:text-accent-foreground"}
              ${item.destructive ? "text-destructive hover:bg-destructive/10 hover:text-destructive" : ""}
              [&_svg]:size-4 [&_svg]:shrink-0`}
            onClick={() => { if (!item.disabled) { item.onClick(); setPosition(null) } }}
          >
            <item.icon />
            {item.label}
          </button>
        )
      )}
    </div>
  )
}

