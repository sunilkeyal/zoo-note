import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

const tableMaxWidthKey = new PluginKey<null>('tableMaxWidth')

/**
 * Prevents table columns from being resized wider than the editor container.
 *
 * How it works: Tiptap's column-resize plugin dispatches a transaction for
 * every mouse-move during a drag, updating each cell's `colwidth` attribute.
 * This extension registers an `appendTransaction` hook that fires after each
 * such transaction. If the new total column width exceeds the container's
 * clientWidth, the extension emits a corrective transaction that clamps the
 * column that grew back to the maximum allowed width.
 *
 * Result: once the table fills the page width, dragging a resize handle to
 * the right is a no-op. Dragging left (reducing a column) always works.
 */
export const TableMaxWidth = Extension.create({
  name: 'tableMaxWidth',

  addProseMirrorPlugin() {
    // Captured at creation time; editor is guaranteed to be set by then.
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const ext = this

    return new Plugin({
      key: tableMaxWidthKey,

      appendTransaction(transactions, oldState, newState) {
        if (!transactions.some((tr) => tr.docChanged)) return null

        const view = ext.editor?.view
        if (!view?.dom) return null

        const containerWidth = view.dom.clientWidth
        if (containerWidth <= 0) return null

        const correctionTr = newState.tr
        let corrected = false

        newState.doc.forEach((tableNode, tablePos) => {
          if (tableNode.type.name !== 'table') return

          const firstRow = tableNode.firstChild
          if (!firstRow) return

          // Collect colwidths from the first row (each entry = one column's width)
          const newWidths: number[] = []
          firstRow.forEach((cell) => {
            newWidths.push(cell.attrs.colwidth?.[0] ?? 120)
          })
          const totalWidth = newWidths.reduce((sum, w) => sum + w, 0)

          if (totalWidth <= containerWidth) return // within bounds, nothing to do

          // Over the limit — compare with old state to find which column grew
          const oldTable = oldState.doc.nodeAt(tablePos)
          if (!oldTable || oldTable.type.name !== 'table') return
          const oldFirstRow = oldTable.firstChild
          if (!oldFirstRow) return

          const oldWidths: number[] = []
          oldFirstRow.forEach((cell) => {
            oldWidths.push(cell.attrs.colwidth?.[0] ?? 120)
          })

          // Clamp each column that increased
          for (let col = 0; col < newWidths.length; col++) {
            if (newWidths[col] <= (oldWidths[col] ?? 120)) continue // didn't grow

            // Maximum allowed width for this column:
            //   containerWidth  minus  the sum of every OTHER column
            const otherColsTotal = newWidths.reduce(
              (sum, w, i) => (i !== col ? sum + w : sum),
              0,
            )
            const maxAllowed = Math.max(80, containerWidth - otherColsTotal)

            if (maxAllowed >= newWidths[col]) continue // still fits

            // Apply the clamped width to all rows at this column position
            // Position arithmetic:
            //   tablePos + 1          = skip table's opening token
            //   + rowOffset           = offset of this row within table content
            //   + 1                   = skip row's opening token
            //   + cellOffset          = offset of this cell within row content
            tableNode.forEach((rowNode, rowOffset) => {
              if (
                rowNode.type.name !== 'tableRow' &&
                rowNode.type.name !== 'tableHeader'
              )
                return

              let colIdx = 0
              rowNode.forEach((cellNode, cellOffset) => {
                if (colIdx === col) {
                  const cwArr = cellNode.attrs.colwidth
                    ? [...cellNode.attrs.colwidth]
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
                // Advance past all columns this cell spans
                colIdx += cellNode.attrs.colspan ?? 1
              })
            })

            // Update our local copy so subsequent columns use the clamped value
            newWidths[col] = maxAllowed
          }
        })

        return corrected ? correctionTr : null
      },
    })
  },
})
