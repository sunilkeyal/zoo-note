import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { Node } from '@tiptap/pm/model'
import { columnResizingPluginKey } from '@tiptap/pm/tables'

const tableResizeConstraintKey = new PluginKey('tableResizeConstraint')

/**
 * Prevents column resize from making the table wider than the editor.
 *
 * Root cause of previous failures:
 * - prosemirror-tables calls displayColumnWidth() inside `move()`, which is
 *   a window-level bubble-phase listener registered during mousedown.
 * - A window capture-phase listener fires too early (before view.dom handlers),
 *   but stopImmediatePropagation there still leaves the event reachable by
 *   view.dom handlers which can re-trigger resize logic indirectly.
 *
 * Correct approach: intercept via handleDOMEvents.mousemove, which fires
 * at view.dom in the BUBBLE phase. Calling stopImmediatePropagation() there
 * prevents propagation to window bubble — where move() lives — so
 * displayColumnWidth() is never called with an out-of-bounds width.
 *
 * The ProseMirror doc state is unchanged during a drag (only the DOM is
 * manipulated by displayColumnWidth), so `colwidth` attrs in the doc give
 * us the pre-drag totals, which is exactly what we need for the cap math.
 */
export const TableResizeConstraint = Extension.create({
  name: 'tableResizeConstraint',

  addProseMirrorPlugin() {
    return new Plugin({
      key: tableResizeConstraintKey,

      props: {
        handleDOMEvents: {
          mousemove(view, event) {
            // Only act when a column resize drag is in progress.
            const resizeState = columnResizingPluginKey.getState(view.state)
            if (!resizeState?.dragging) return false

            const { startX } = resizeState.dragging
            const containerWidth = view.dom.clientWidth
            if (!containerWidth) return false

            // Sum colwidths from the ProseMirror doc (unchanged during drag).
            let totalWidth = 0
            try {
              const $cell = view.state.doc.resolve(resizeState.activeHandle)
              const tableNode = $cell.node(-1)
              if (!tableNode || tableNode.type.name !== 'table') return false

              const firstRow = tableNode.firstChild
              if (!firstRow) return false

              firstRow.forEach((cell: Node) => {
                totalWidth += (cell.attrs.colwidth as number[] | undefined)?.[0] ?? 120
              })
            } catch {
              return false
            }

            // Maximum clientX the mouse can reach before the table would
            // exceed containerWidth.
            const maxAllowedX = startX + Math.max(0, containerWidth - totalWidth)

            if (event.clientX > maxAllowedX) {
              // Stop here — the event will not reach window bubble where
              // prosemirror-tables' move() → displayColumnWidth() lives.
              event.stopImmediatePropagation()
              return true
            }

            return false
          },
        },
      },
    })
  },
})
