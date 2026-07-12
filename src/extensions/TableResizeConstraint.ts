import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { Node } from '@tiptap/pm/model'
import { columnResizingPluginKey } from '@tiptap/pm/tables'

const tableResizeConstraintKey = new PluginKey('tableResizeConstraint')

/**
 * Two-part constraint preventing tables from exceeding the editor width.
 *
 * Part 1 — live visual (handleDOMEvents.mousemove):
 *   Intercepts mousemove at view.dom level (bubble phase, before window).
 *   stopImmediatePropagation() prevents the event reaching window bubble
 *   where prosemirror-tables' move() → displayColumnWidth() lives.
 *   Limitation: only works when the mouse is INSIDE view.dom. When the
 *   mouse drifts outside the editor during a fast drag, this part misses.
 *
 * Part 2 — final commit correction (appendTransaction):
 *   Fires after every doc-changing transaction, including the one that
 *   updateColumnWidth() dispatches on mouseup. Compares new colwidths
 *   against the pre-transaction widths; if any column grew beyond what the
 *   container allows, it clamps it back and emits a corrective transaction.
 *   This is the authoritative fix — Part 1 is a UX enhancement only.
 *
 * CSS note: the table must NOT have max-width:100% or min-width:0 !important.
 * Those overrides cause table-layout:fixed to proportionally redistribute all
 * columns when the table is wider than max-width, producing the "all columns
 * shrink" symptom. The current CSS is correct: width:auto, no max-width.
 */
export const TableResizeConstraint = Extension.create({
  name: 'tableResizeConstraint',

  addProseMirrorPlugin() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const ext = this

    return new Plugin({
      key: tableResizeConstraintKey,

      // ── Part 1: live visual interception ────────────────────────────────
      props: {
        handleDOMEvents: {
          mousemove(view, event) {
            const resizeState = columnResizingPluginKey.getState(view.state)
            if (!resizeState?.dragging) return false

            const { startX } = resizeState.dragging
            const containerWidth = view.dom.clientWidth
            if (!containerWidth) return false

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

            if (event.clientX > startX + Math.max(0, containerWidth - totalWidth)) {
              event.stopImmediatePropagation()
              return true
            }
            return false
          },
        },
      },

      // ── Part 2: final colwidth correction ───────────────────────────────
      appendTransaction(transactions, oldState, newState) {
        if (!transactions.some((tr) => tr.docChanged)) return null

        const view = ext.editor?.view
        if (!view?.dom) return null
        const containerWidth = view.dom.clientWidth
        if (!containerWidth) return null

        const correctionTr = newState.tr
        let corrected = false

        newState.doc.forEach((tableNode: Node, tablePos: number) => {
          if (tableNode.type.name !== 'table') return

          const firstRow = tableNode.firstChild
          if (!firstRow) return

          // Colwidths in the NEW state (post-transaction)
          const newWidths: number[] = []
          firstRow.forEach((cell: Node) => {
            newWidths.push((cell.attrs.colwidth as number[] | undefined)?.[0] ?? 120)
          })
          const totalWidth = newWidths.reduce((sum, w) => sum + w, 0)
          if (totalWidth <= containerWidth) return

          // Old state colwidths — used to identify which column grew
          const oldTable = oldState.doc.nodeAt(tablePos)
          if (!oldTable || oldTable.type.name !== 'table') return
          const oldFirstRow = oldTable.firstChild
          if (!oldFirstRow) return

          const oldWidths: number[] = []
          oldFirstRow.forEach((cell: Node) => {
            oldWidths.push((cell.attrs.colwidth as number[] | undefined)?.[0] ?? 120)
          })

          for (let col = 0; col < newWidths.length; col++) {
            if (newWidths[col] <= (oldWidths[col] ?? 120)) continue // didn't grow

            const otherTotal = newWidths.reduce((sum, w, i) => i !== col ? sum + w : sum, 0)
            const maxAllowed = Math.max(80, containerWidth - otherTotal)
            if (maxAllowed >= newWidths[col]) continue // still fits

            // Clamp this column in every row
            tableNode.forEach((rowNode: Node, rowOffset: number) => {
              if (rowNode.type.name !== 'tableRow') return
              let colIdx = 0
              rowNode.forEach((cellNode: Node, cellOffset: number) => {
                if (colIdx === col) {
                  const cwArr: number[] = Array.isArray(cellNode.attrs.colwidth)
                    ? [...(cellNode.attrs.colwidth as number[])]
                    : [120]
                  if (cwArr[0] !== maxAllowed) {
                    cwArr[0] = maxAllowed
                    correctionTr.setNodeMarkup(
                      tablePos + 1 + rowOffset + 1 + cellOffset,
                      undefined,
                      { ...cellNode.attrs, colwidth: cwArr },
                    )
                    corrected = true
                  }
                }
                colIdx += (cellNode.attrs.colspan as number | undefined) ?? 1
              })
            })

            newWidths[col] = maxAllowed // keep accounting correct for next cols
          }
        })

        return corrected ? correctionTr : null
      },
    })
  },
})

