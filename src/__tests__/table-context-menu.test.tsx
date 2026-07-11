import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

import { TableContextMenu } from '@/components/TableContextMenu'

function makeEditor(inTable: boolean) {
  const runMock = vi.fn()
  const cmd = () => ({ run: runMock })
  return {
    isActive: vi.fn(() => inTable),
    state: {
      doc: { nodesBetween: vi.fn() },
      selection: { from: 0, to: 0 },
    },
    chain: vi.fn(() => ({
      focus: vi.fn(() => ({
        addRowBefore: vi.fn(cmd),
        addRowAfter: vi.fn(cmd),
        deleteRow: vi.fn(cmd),
        addColumnBefore: vi.fn(cmd),
        addColumnAfter: vi.fn(cmd),
        deleteColumn: vi.fn(cmd),
        toggleHeaderRow: vi.fn(cmd),
        deleteTable: vi.fn(cmd),
      })),
    })),
  } as unknown as import('@tiptap/react').Editor
}

describe('TableContextMenu', () => {
  let container: HTMLDivElement

  afterEach(() => {
    if (container?.parentNode) document.body.removeChild(container)
  })

  it('shows menu when contextmenu fired inside table', () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    const ref = { current: container }
    render(<TableContextMenu editor={makeEditor(true)} editorContainerRef={ref} />)

    const evt = new MouseEvent('contextmenu', { clientX: 100, clientY: 200, bubbles: true })
    const spy = vi.spyOn(evt, 'preventDefault')
    container.dispatchEvent(evt)

    expect(screen.getByTestId('table-context-menu')).toBeInTheDocument()
    expect(spy).toHaveBeenCalled()
  })

  it('does not show menu when contextmenu fired outside table', () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    const ref = { current: container }
    render(<TableContextMenu editor={makeEditor(false)} editorContainerRef={ref} />)

    const evt = new MouseEvent('contextmenu', { clientX: 100, clientY: 200, bubbles: true })
    const spy = vi.spyOn(evt, 'preventDefault')
    container.dispatchEvent(evt)

    expect(screen.queryByTestId('table-context-menu')).toBeNull()
    expect(spy).not.toHaveBeenCalled()
  })

  it('dismisses menu on outside click', () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    const ref = { current: container }
    render(<TableContextMenu editor={makeEditor(true)} editorContainerRef={ref} />)

    container.dispatchEvent(new MouseEvent('contextmenu', { clientX: 100, clientY: 200, bubbles: true }))
    expect(screen.getByTestId('table-context-menu')).toBeInTheDocument()

    fireEvent.click(document.body)
    expect(screen.queryByTestId('table-context-menu')).toBeNull()
  })

  it('dismisses menu on Escape key', () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    const ref = { current: container }
    render(<TableContextMenu editor={makeEditor(true)} editorContainerRef={ref} />)

    container.dispatchEvent(new MouseEvent('contextmenu', { clientX: 100, clientY: 200, bubbles: true }))
    expect(screen.getByTestId('table-context-menu')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByTestId('table-context-menu')).toBeNull()
  })

  it('calls deleteRow when Delete Row is clicked', () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    const editor = makeEditor(true)
    const ref = { current: container }
    render(<TableContextMenu editor={editor} editorContainerRef={ref} />)

    container.dispatchEvent(new MouseEvent('contextmenu', { clientX: 100, clientY: 200, bubbles: true }))
    fireEvent.click(screen.getByText('Delete Row'))

    // Retrieve the actual focus-result from the component's chain() call
    const chainMock = editor.chain as ReturnType<typeof vi.fn>
    const focusMock = chainMock.mock.results[0].value.focus.mock.results[0].value
    expect(focusMock.deleteRow).toHaveBeenCalled()
    expect(screen.queryByTestId('table-context-menu')).toBeNull()
  })
})
