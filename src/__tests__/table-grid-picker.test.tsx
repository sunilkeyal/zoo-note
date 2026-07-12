import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <button data-testid="table-picker-trigger" className={className}>{children}</button>
  ),
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="table-picker-content">{children}</div>
  ),
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children, render: renderProp }: { children: React.ReactNode; render?: React.ReactElement }) =>
    renderProp ? React.cloneElement(renderProp, {}, children) : <>{children}</>,
  TooltipContent: () => null,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('lucide-react', () => ({
  Table: (props: Record<string, unknown>) =>
    React.createElement('svg', { 'data-testid': 'icon-Table', ...props }),
}))

import { TableGridPicker } from '@/components/TableGridPicker'

function makeEditor(insertTableMock = vi.fn(() => ({ run: vi.fn() }))) {
  return {
    chain: vi.fn(() => ({ focus: vi.fn(() => ({ insertTable: insertTableMock })) })),
  } as unknown as import('@tiptap/react').Editor
}

describe('TableGridPicker', () => {
  it('renders 64 grid cells (8×8)', () => {
    render(<TableGridPicker editor={makeEditor()} />)
    for (let row = 1; row <= 8; row++) {
      for (let col = 1; col <= 8; col++) {
        expect(screen.getByTestId(`grid-cell-${row}-${col}`)).toBeInTheDocument()
      }
    }
  })

  it('shows "Insert Table" label by default', () => {
    render(<TableGridPicker editor={makeEditor()} />)
    expect(screen.getByText('Insert Table')).toBeInTheDocument()
  })

  it('shows size label on hover as "cols × rows"', () => {
    render(<TableGridPicker editor={makeEditor()} />)
    fireEvent.mouseEnter(screen.getByTestId('grid-cell-3-4'))
    expect(screen.getByText('4 \u00d7 3')).toBeInTheDocument()
  })

  it('resets label on mouse leave', () => {
    render(<TableGridPicker editor={makeEditor()} />)
    const grid = screen.getByTestId('grid-cell-2-2').parentElement!
    fireEvent.mouseEnter(screen.getByTestId('grid-cell-2-2'))
    fireEvent.mouseLeave(grid)
    expect(screen.getByText('Insert Table')).toBeInTheDocument()
  })

  it('calls insertTable with correct rows and cols on click', () => {
    const mockRun = vi.fn()
    const mockInsertTable = vi.fn(() => ({ run: mockRun }))
    render(<TableGridPicker editor={makeEditor(mockInsertTable)} />)
    fireEvent.click(screen.getByTestId('grid-cell-2-3'))
    expect(mockInsertTable).toHaveBeenCalledWith({ rows: 2, cols: 3, withHeaderRow: false })
    expect(mockRun).toHaveBeenCalled()
  })

  it('highlights cells up to hovered position', () => {
    render(<TableGridPicker editor={makeEditor()} />)
    fireEvent.mouseEnter(screen.getByTestId('grid-cell-2-3'))
    // cell (1,1) should be highlighted
    const cell11 = screen.getByTestId('grid-cell-1-1')
    expect(cell11.className).toContain('bg-primary')
    // cell (3,4) should NOT be highlighted
    const cell34 = screen.getByTestId('grid-cell-3-4')
    expect(cell34.className).not.toContain('bg-primary')
  })
})
