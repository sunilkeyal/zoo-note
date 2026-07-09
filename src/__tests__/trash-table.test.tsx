import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import TrashTable from '@/components/TrashTable'

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, ...props }: { children: React.ReactNode; onClick?: () => void; variant?: string; size?: string }) => (
    <button onClick={onClick} data-variant={variant} data-size={size} {...props}>{children}</button>
  ),
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-title">{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-description">{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: { children: React.ReactNode; value: string; onValueChange: (value: string) => void }) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)} data-testid="select">{children}</select>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectValue: () => <></>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
}))

const baseItems = [
  { id: 'n1', title: 'Note 1', type: 'note' as const, folderId: 'f1', folderName: 'Folder 1', deletedAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 'n2', title: 'Note 2', type: 'note' as const, deletedAt: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: 'f1', title: 'Folder 1', type: 'folder' as const, notesCount: 2, deletedAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 'f2', title: 'Empty Folder', type: 'folder' as const, notesCount: 0, deletedAt: new Date(Date.now() - 86400000).toISOString() },
]

describe('TrashTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading skeleton when loading is true', () => {
    const { container } = render(
      <TrashTable items={[]} loading={true} onRestore={vi.fn()} onPermanentDelete={vi.fn()} />
    )
    const skeletonDivs = container.querySelectorAll('.animate-pulse')
    expect(skeletonDivs.length).toBeGreaterThan(0)
  })

  it('shows error message when error is provided', () => {
    render(
      <TrashTable items={[]} error="Failed to load trash" onRestore={vi.fn()} onPermanentDelete={vi.fn()} onRetry={vi.fn()} />
    )
    expect(screen.getByText('Failed to load trash')).toBeInTheDocument()
  })

  it('shows Retry button when error and onRetry provided', () => {
    const onRetry = vi.fn()
    render(
      <TrashTable items={[]} error="Error" onRestore={vi.fn()} onPermanentDelete={vi.fn()} onRetry={onRetry} />
    )
    fireEvent.click(screen.getByText('Retry'))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('shows empty state when items is empty', () => {
    render(
      <TrashTable items={[]} onRestore={vi.fn()} onPermanentDelete={vi.fn()} />
    )
    expect(screen.getByText('Nothing here')).toBeInTheDocument()
  })

  it('renders items in a table', () => {
    render(
      <TrashTable items={baseItems} onRestore={vi.fn()} onPermanentDelete={vi.fn()} />
    )
    expect(screen.getByText('Note 1')).toBeInTheDocument()
    expect(screen.getByText('Note 2')).toBeInTheDocument()
    expect(screen.getByText('Empty Folder')).toBeInTheDocument()
    const folderTexts = screen.getAllByText('Folder 1')
    expect(folderTexts.length).toBeGreaterThanOrEqual(2)
  })

  it('shows pagination controls when items exceed page size', () => {
    const manyItems = Array.from({ length: 25 }, (_, i) => ({
      id: `n${i}`,
      title: `Note ${i}`,
      type: 'note' as const,
      deletedAt: new Date(Date.now() - i * 86400000).toISOString(),
    }))
    render(
      <TrashTable items={manyItems} onRestore={vi.fn()} onPermanentDelete={vi.fn()} />
    )
    expect(screen.getByText('Page 1 of 3 (25 total)')).toBeInTheDocument()
    expect(screen.getByText('Next')).toBeInTheDocument()
  })

  it('sorts items when clicking column header', () => {
    const items = [
      { id: 'n1', title: 'Beta', type: 'note' as const, deletedAt: new Date(Date.now() - 86400000).toISOString() },
      { id: 'n2', title: 'Alpha', type: 'note' as const, deletedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
    ]
    render(
      <TrashTable items={items} onRestore={vi.fn()} onPermanentDelete={vi.fn()} />
    )

    const rows = screen.getAllByRole('row')
    // Default sort is deletedAt desc, so Beta (newer) should appear first
    expect(rows[1]).toHaveTextContent('Beta')

    const nameHeader = screen.getByText('Name')
    fireEvent.click(nameHeader)
    // Now sorted by name asc: Alpha first, Beta second
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('Alpha')
  })

  it('shows folder badge for notes with folderId', () => {
    render(
      <TrashTable items={baseItems} onRestore={vi.fn()} onPermanentDelete={vi.fn()} />
    )
    const badges = screen.getAllByText('Folder 1').filter(
      (el) => el.classList.contains('rounded-full')
    )
    expect(badges.length).toBeGreaterThanOrEqual(1)
  })

  it('shows notes count for folders', () => {
    render(
      <TrashTable items={baseItems} onRestore={vi.fn()} onPermanentDelete={vi.fn()} />
    )
    expect(screen.getByText('2 notes')).toBeInTheDocument()
  })

  it('shows admin column when isAdmin is true', () => {
    const itemsWithUser = [
      { id: 'n1', title: 'Note', type: 'note' as const, user: 'admin@test.com', deletedAt: new Date().toISOString() },
    ]
    render(
      <TrashTable items={itemsWithUser} isAdmin={true} onRestore={vi.fn()} onPermanentDelete={vi.fn()} />
    )
    expect(screen.getByText('admin@test.com')).toBeInTheDocument()
  })

  it('toggles individual item checkbox', () => {
    render(
      <TrashTable items={baseItems} onRestore={vi.fn()} onPermanentDelete={vi.fn()} />
    )
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(baseItems.length + 1)

    fireEvent.click(checkboxes[1])
    expect(checkboxes[1]).toHaveAttribute('aria-checked', 'true')
  })

  it('select all checkbox toggles all items', () => {
    const items = [
      { id: 'n1', title: 'Note 1', type: 'note' as const, deletedAt: new Date().toISOString() },
      { id: 'n2', title: 'Note 2', type: 'note' as const, deletedAt: new Date().toISOString() },
    ]
    render(
      <TrashTable items={items} onRestore={vi.fn()} onPermanentDelete={vi.fn()} />
    )
    const checkboxes = screen.getAllByRole('checkbox')
    const selectAll = checkboxes[0]

    fireEvent.click(selectAll)
    expect(checkboxes[1]).toHaveAttribute('aria-checked', 'true')
    expect(checkboxes[2]).toHaveAttribute('aria-checked', 'true')

    fireEvent.click(selectAll)
    expect(checkboxes[1]).toHaveAttribute('aria-checked', 'false')
    expect(checkboxes[2]).toHaveAttribute('aria-checked', 'false')
  })

  it('shows selection bar when items selected', () => {
    const items = [
      { id: 'n1', title: 'Note 1', type: 'note' as const, deletedAt: new Date().toISOString() },
      { id: 'n2', title: 'Note 2', type: 'note' as const, deletedAt: new Date().toISOString() },
    ]
    render(
      <TrashTable items={items} onRestore={vi.fn()} onPermanentDelete={vi.fn()} />
    )
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[1])

    expect(screen.getByText(/1 note selected/)).toBeInTheDocument()
  })

  it('calls onRestore with correct ids when Restore button clicked', () => {
    const onRestore = vi.fn()
    const items = [
      { id: 'n1', title: 'Note 1', type: 'note' as const, deletedAt: new Date().toISOString() },
    ]
    render(
      <TrashTable items={items} onRestore={onRestore} onPermanentDelete={vi.fn()} />
    )
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[1])

    fireEvent.click(screen.getByText('Restore Selected'))
    expect(onRestore).toHaveBeenCalledWith(['n1'], [])
  })

  it('calls onPermanentDelete with correct ids when Delete Forever clicked', () => {
    const onPermanentDelete = vi.fn()
    const items = [
      { id: 'n1', title: 'Note 1', type: 'note' as const, deletedAt: new Date().toISOString() },
    ]
    render(
      <TrashTable items={items} onRestore={vi.fn()} onPermanentDelete={onPermanentDelete} />
    )
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[1])

    fireEvent.click(screen.getByText('Delete Forever'))
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('Delete forever?')

    const dialogDeleteBtns = screen.getAllByText('Delete Forever')
    fireEvent.click(dialogDeleteBtns[dialogDeleteBtns.length - 1])
    expect(onPermanentDelete).toHaveBeenCalledWith(['n1'], [])
  })

  it('restore button on item row calls onRestore', () => {
    const onRestore = vi.fn()
    const items = [
      { id: 'n1', title: 'Note 1', type: 'note' as const, deletedAt: new Date().toISOString() },
    ]
    render(
      <TrashTable items={items} onRestore={onRestore} onPermanentDelete={vi.fn()} />
    )
    const restoreButtons = screen.getAllByText('Restore')
    fireEvent.click(restoreButtons[0])
    expect(onRestore).toHaveBeenCalledWith(['n1'], [])
  })

  it('delete button on item row opens confirmation dialog', () => {
    const items = [
      { id: 'n1', title: 'Note 1', type: 'note' as const, deletedAt: new Date().toISOString() },
    ]
    render(
      <TrashTable items={items} onRestore={vi.fn()} onPermanentDelete={vi.fn()} />
    )
    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('Delete forever?')
  })

  it('selecting a folder selects its notes', () => {
    const items = [
      { id: 'f1', title: 'Folder', type: 'folder' as const, notesCount: 2, deletedAt: new Date().toISOString() },
      { id: 'n1', title: 'Note 1', type: 'note' as const, folderId: 'f1', deletedAt: new Date().toISOString() },
      { id: 'n2', title: 'Note 2', type: 'note' as const, folderId: 'f1', deletedAt: new Date().toISOString() },
    ]
    render(
      <TrashTable items={items} onRestore={vi.fn()} onPermanentDelete={vi.fn()} />
    )
    const checkboxes = screen.getAllByRole('checkbox')

    fireEvent.click(checkboxes[1])
    expect(checkboxes[1]).toHaveAttribute('aria-checked', 'true')
    expect(checkboxes[2]).toHaveAttribute('aria-checked', 'true')
    expect(checkboxes[3]).toHaveAttribute('aria-checked', 'true')
  })

  it('selecting a note in a folder also selects the parent folder', () => {
    const items = [
      { id: 'f1', title: 'Folder', type: 'folder' as const, notesCount: 2, deletedAt: new Date().toISOString() },
      { id: 'n1', title: 'Note 1', type: 'note' as const, folderId: 'f1', deletedAt: new Date().toISOString() },
      { id: 'n2', title: 'Note 2', type: 'note' as const, folderId: 'f1', deletedAt: new Date().toISOString() },
    ]
    render(
      <TrashTable items={items} onRestore={vi.fn()} onPermanentDelete={vi.fn()} />
    )
    const checkboxes = screen.getAllByRole('checkbox')

    fireEvent.click(checkboxes[3])
    expect(checkboxes[3]).toHaveAttribute('aria-checked', 'true')
    expect(checkboxes[1]).toHaveAttribute('aria-checked', 'true')
  })

  it('shows correct selection count in selection bar', () => {
    const items = [
      { id: 'f1', title: 'Folder', type: 'folder' as const, notesCount: 2, deletedAt: new Date().toISOString() },
      { id: 'n1', title: 'Note 1', type: 'note' as const, folderId: 'f1', deletedAt: new Date().toISOString() },
    ]
    render(
      <TrashTable items={items} onRestore={vi.fn()} onPermanentDelete={vi.fn()} />
    )
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[2])
    expect(screen.getByText(/1 folder/)).toBeInTheDocument()
    expect(screen.getByText(/1 note/)).toBeInTheDocument()
  })

  it('computeDaysLeft returns correct values', () => {
    const now = Date.now()

    const today = new Date(now).toISOString()
    const oneDayAgo = new Date(now - 86400000).toISOString()
    const sixDaysAgo = new Date(now - 6 * 86400000).toISOString()
    const sevenDaysAgo = new Date(now - 7 * 86400000).toISOString()

    const items = [
      { id: 'n1', title: 'Today', type: 'note' as const, deletedAt: today },
      { id: 'n2', title: 'One day', type: 'note' as const, deletedAt: oneDayAgo },
      { id: 'n3', title: 'Six days', type: 'note' as const, deletedAt: sixDaysAgo },
      { id: 'n4', title: 'Expiring', type: 'note' as const, deletedAt: sevenDaysAgo },
    ]

    render(
      <TrashTable items={items} onRestore={vi.fn()} onPermanentDelete={vi.fn()} />
    )

    expect(screen.getByText('7 days')).toBeInTheDocument()
    expect(screen.getByText('6 days')).toBeInTheDocument()
    expect(screen.getByText('1 day')).toBeInTheDocument()
    expect(screen.getByText('Expiring today')).toBeInTheDocument()
  })
})
