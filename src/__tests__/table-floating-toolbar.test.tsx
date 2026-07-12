import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import React from 'react'

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children, render: r }: { children: React.ReactNode; render?: React.ReactElement }) =>
    r ? React.cloneElement(r, {}, children) : <>{children}</>,
  TooltipContent: () => null,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/ui/separator', () => ({
  Separator: ({ orientation }: { orientation?: string }) => (
    <hr data-testid="separator" data-orientation={orientation} />
  ),
}))

vi.mock('lucide-react', () => ({
  Trash2: () => React.createElement('svg', { 'data-testid': 'icon-Trash2' }),
}))

import { TableFloatingToolbar } from '@/components/TableFloatingToolbar'

type Handler = () => void

function makeEditor(inTable: boolean) {
  const handlers: Record<string, Handler> = {}
  const runMock = vi.fn()
  const cmd = () => ({ run: runMock })
  // Stable focus chain so that chain().focus() always returns the same mock object,
  // allowing post-click assertions on the same vi.fn instances.
  const focusChain = {
    addRowBefore: vi.fn(cmd),
    addRowAfter: vi.fn(cmd),
    deleteRow: vi.fn(cmd),
    addColumnBefore: vi.fn(cmd),
    addColumnAfter: vi.fn(cmd),
    deleteColumn: vi.fn(cmd),
    toggleHeaderRow: vi.fn(cmd),
    deleteTable: vi.fn(cmd),
  }
  const editor = {
    isActive: vi.fn((t: string) => t === 'table' && inTable),
    on: vi.fn((event: string, h: Handler) => { handlers[event] = h }),
    off: vi.fn(),
    state: { selection: { from: 0 } },
    view: { domAtPos: vi.fn(() => ({ node: document.createElement('td') })) },
    chain: vi.fn(() => ({
      focus: vi.fn(() => focusChain),
    })),
    _fire: (event: string) => handlers[event]?.(),
  }
  return editor as unknown as import('@tiptap/react').Editor & { _fire: (e: string) => void }
}

describe('TableFloatingToolbar', () => {
  it('does not render when not in table', () => {
    const editor = makeEditor(false)
    const ref = { current: document.createElement('div') }
    render(<TableFloatingToolbar editor={editor} editorContainerRef={ref} />)
    expect(screen.queryByTestId('table-floating-toolbar')).toBeNull()
  })

  it('renders after transaction event when in table', async () => {
    const editor = makeEditor(true)
    const ref = { current: document.createElement('div') }
    render(<TableFloatingToolbar editor={editor} editorContainerRef={ref} />)
    await act(async () => { editor._fire('transaction') })
    expect(screen.getByTestId('table-floating-toolbar')).toBeInTheDocument()
  })

  it('hides after transaction event when not in table', async () => {
    const editor = makeEditor(true)
    const ref = { current: document.createElement('div') }
    render(<TableFloatingToolbar editor={editor} editorContainerRef={ref} />)
    await act(async () => { editor._fire('transaction') })
    expect(screen.getByTestId('table-floating-toolbar')).toBeInTheDocument()
    // now pretend we left the table
    ;(editor.isActive as ReturnType<typeof vi.fn>).mockReturnValue(false)
    await act(async () => { editor._fire('transaction') })
    expect(screen.queryByTestId('table-floating-toolbar')).toBeNull()
  })

  it('calls addRowBefore when Add Row Above button is clicked', async () => {
    const editor = makeEditor(true)
    const ref = { current: document.createElement('div') }
    render(<TableFloatingToolbar editor={editor} editorContainerRef={ref} />)
    await act(async () => { editor._fire('transaction') })
    const btn = screen.getByTitle('Add row above')
    btn.click()
    const focusMock = (editor.chain as ReturnType<typeof vi.fn>)().focus()
    expect(focusMock.addRowBefore).toHaveBeenCalled()
  })
})
