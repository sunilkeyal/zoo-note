import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import NotesSidebar from '@/components/NotesSidebar'

// ---- shared mocks (same setup as notes-sidebar.test.tsx) ----

const mockRestoreItems = vi.fn()
const mockPermanentDeleteItems = vi.fn()

vi.mock('@/contexts/NoteContext', () => ({
  useNotes: vi.fn(),
  NoteProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/contexts/SidebarDensityContext', () => ({
  SidebarDensityProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSidebarDensity: vi.fn(() => ({ density: 'default', setDensity: vi.fn() })),
}))

vi.mock('@/contexts/ImportContext', () => ({
  ImportProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useImport: vi.fn(() => ({
    job: { jobId: null, status: 'idle', filename: null, progress: null, result: null, error: null },
    startImport: vi.fn(),
    resetJob: vi.fn(),
  })),
}))

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({ data: { user: { name: 'Test', email: 'test@test.com' } } })),
  signOut: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}))

vi.mock('@/components/AccountSheet', () => ({
  default: () => null,
}))

vi.mock('@/components/SettingsSheet', () => ({
  default: () => null,
}))

vi.mock('@/components/ImportExportSheet', () => ({
  default: () => null,
}))

vi.mock('@/components/DeleteConfirmDialog', () => ({
  default: () => null,
}))

vi.mock('@/components/DeleteFolderDialog', () => ({
  default: () => null,
}))

vi.mock('@/components/EmptyTrashDialog', () => ({
  default: ({ open, onConfirm, onCancel, noteCount, folderCount }: {
    open: boolean; onConfirm: () => void; onCancel: () => void; noteCount: number; folderCount: number
  }) =>
    open ? (
      <div data-testid="empty-trash-dialog">
        <span data-testid="etd-note-count">{noteCount}</span>
        <span data-testid="etd-folder-count">{folderCount}</span>
        <button onClick={onConfirm}>Confirm Empty</button>
        <button onClick={onCancel}>Cancel Empty</button>
      </div>
    ) : null,
}))

vi.mock('@/components/SearchDropdown', () => ({
  default: () => null,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, ...props }: {
    children: React.ReactNode; onClick?: () => void; variant?: string; size?: string
  }) => <button onClick={onClick} data-variant={variant} {...props}>{children}</button>,
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children, render, ...props }: { children: React.ReactNode; render?: React.ReactElement }) =>
    render ? React.cloneElement(render, props as object, children) : <button {...props}>{children}</button>,
}))

vi.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CollapsibleTrigger: ({ children, render }: { children: React.ReactNode; render?: React.ReactElement }) =>
    render ? React.cloneElement(render, null, children) : <button>{children}</button>,
}))

vi.mock('@/components/ui/context-menu', () => ({
  ContextMenu: ({ children }: { children: React.ReactNode }) => <div data-testid="context-menu">{children}</div>,
  ContextMenuTrigger: ({ children, render }: { children: React.ReactNode; render?: React.ReactElement }) =>
    render ? render : <div>{children}</div>,
  ContextMenuContent: ({ children }: { children: React.ReactNode }) =>
    <div data-testid="context-menu-content">{children}</div>,
  ContextMenuGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ContextMenuItem: ({ children, onClick, disabled }: {
    children: React.ReactNode; onClick?: () => void; disabled?: boolean
  }) => <button onClick={onClick} disabled={disabled}>{children}</button>,
  ContextMenuLabel: ({ children }: { children: React.ReactNode }) =>
    <span data-testid="context-menu-label">{children}</span>,
  ContextMenuSeparator: () => <hr />,
}))

vi.mock('@/components/ui/sidebar', () => ({
  Sidebar: ({ children }: { children: React.ReactNode }) => <div data-testid="sidebar">{children}</div>,
  SidebarContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarGroupContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarMenu: ({ children }: { children: React.ReactNode }) => <ul>{children}</ul>,
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => <li>{children}</li>,
  SidebarMenuButton: ({ children, isActive, render: _render }: {
    children: React.ReactNode; isActive?: boolean; render?: React.ReactElement
  }) => <button data-active={String(isActive)}>{children}</button>,
  SidebarMenuAction: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) =>
    <button onClick={onClick}>{children}</button>,
  SidebarMenuSub: ({ children }: { children: React.ReactNode }) => <ul>{children}</ul>,
  SidebarMenuSubItem: ({ children }: { children: React.ReactNode }) => <li>{children}</li>,
  SidebarMenuSubButton: ({ children, isActive, onClick, onDoubleClick }: {
    children: React.ReactNode; isActive?: boolean; onClick?: () => void; onDoubleClick?: () => void
  }) => <button data-active={String(isActive)} onClick={onClick} onDoubleClick={onDoubleClick}>{children}</button>,
  SidebarSeparator: () => <hr />,
  SidebarInput: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}))

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) =>
    <button onClick={onClick}>{children}</button>,
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children, render, asChild }: {
    children: React.ReactNode; render?: React.ReactElement; asChild?: boolean
  }) => render ? render : <div>{children}</div>,
}))

// ---- helpers ----

import { useNotes } from '@/contexts/NoteContext'

function makeUseNotesMock(trashNotes: number, trashFolders: number) {
  const notes = Array.from({ length: trashNotes }, (_, i) => ({ _id: `note-${i}` }))
  const folders = Array.from({ length: trashFolders }, (_, i) => ({ _id: `folder-${i}` }))
  ;(useNotes as ReturnType<typeof vi.fn>).mockReturnValue({
    notes: [],
    folders: [],
    expandedFolders: new Set(),
    createNote: vi.fn(),
    deleteNote: vi.fn(),
    updateNote: vi.fn(),
    activeNoteId: null,
    setActiveNoteId: vi.fn(),
    createFolder: vi.fn(),
    renameFolder: vi.fn(),
    deleteFolder: vi.fn(),
    moveNote: vi.fn(),
    moveFolder: vi.fn(),
    toggleFolder: vi.fn(),
    favoriteNotes: [],
    toggleFavorite: vi.fn(),
    trashItems: { notes, folders },
    restoreItems: mockRestoreItems,
    permanentDeleteItems: mockPermanentDeleteItems,
    trashLoading: false,
    trashError: null,
    fetchTrash: vi.fn(),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  makeUseNotesMock(0, 0)
})

// ---- tests ----

describe('Trash context menu', () => {
  it('shows "Trash is empty" label when trash has no items', () => {
    makeUseNotesMock(0, 0)
    render(<NotesSidebar />)
    const labels = screen.getAllByTestId('context-menu-label')
    const countLabel = labels.find(el => el.textContent === 'Trash is empty')
    expect(countLabel).toBeTruthy()
  })

  it('shows correct note count in label', () => {
    makeUseNotesMock(3, 0)
    render(<NotesSidebar />)
    const labels = screen.getAllByTestId('context-menu-label')
    const countLabel = labels.find(el => el.textContent?.includes('3 notes'))
    expect(countLabel).toBeTruthy()
  })

  it('shows correct folder count in label', () => {
    makeUseNotesMock(0, 2)
    render(<NotesSidebar />)
    const labels = screen.getAllByTestId('context-menu-label')
    const countLabel = labels.find(el => el.textContent?.includes('2 folders'))
    expect(countLabel).toBeTruthy()
  })

  it('shows both note and folder counts in label', () => {
    makeUseNotesMock(2, 1)
    render(<NotesSidebar />)
    const labels = screen.getAllByTestId('context-menu-label')
    const countLabel = labels.find(el => el.textContent?.includes('2 notes') && el.textContent?.includes('1 folder'))
    expect(countLabel).toBeTruthy()
  })

  it('uses singular "1 note" in count label', () => {
    makeUseNotesMock(1, 0)
    render(<NotesSidebar />)
    const labels = screen.getAllByTestId('context-menu-label')
    const countLabel = labels.find(el => el.textContent === '1 note')
    expect(countLabel).toBeTruthy()
  })

  it('"Restore All" button is disabled when trash is empty', () => {
    makeUseNotesMock(0, 0)
    render(<NotesSidebar />)
    const restoreBtn = screen.getByText('Restore All')
    expect(restoreBtn).toBeDisabled()
  })

  it('"Empty Trash" button is disabled when trash is empty', () => {
    makeUseNotesMock(0, 0)
    render(<NotesSidebar />)
    const emptyBtn = screen.getByText('Empty Trash')
    expect(emptyBtn).toBeDisabled()
  })

  it('"Restore All" is enabled when trash has items', () => {
    makeUseNotesMock(2, 0)
    render(<NotesSidebar />)
    const restoreBtn = screen.getByText('Restore All')
    expect(restoreBtn).not.toBeDisabled()
  })

  it('"Empty Trash" is enabled when trash has items', () => {
    makeUseNotesMock(2, 0)
    render(<NotesSidebar />)
    const emptyBtn = screen.getByText('Empty Trash')
    expect(emptyBtn).not.toBeDisabled()
  })

  it('clicking "Restore All" calls restoreItems with all IDs', () => {
    makeUseNotesMock(2, 1)
    render(<NotesSidebar />)
    fireEvent.click(screen.getByText('Restore All'))
    expect(mockRestoreItems).toHaveBeenCalledWith(
      ['note-0', 'note-1'],
      ['folder-0']
    )
  })

  it('clicking "Empty Trash" opens EmptyTrashDialog', () => {
    makeUseNotesMock(1, 1)
    render(<NotesSidebar />)
    expect(screen.queryByTestId('empty-trash-dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Empty Trash'))
    expect(screen.getByTestId('empty-trash-dialog')).toBeInTheDocument()
  })

  it('confirming EmptyTrashDialog calls permanentDeleteItems with all IDs', () => {
    makeUseNotesMock(2, 1)
    render(<NotesSidebar />)
    fireEvent.click(screen.getByText('Empty Trash'))
    fireEvent.click(screen.getByText('Confirm Empty'))
    expect(mockPermanentDeleteItems).toHaveBeenCalledWith(
      ['note-0', 'note-1'],
      ['folder-0']
    )
  })

  it('cancelling EmptyTrashDialog does not call permanentDeleteItems', () => {
    makeUseNotesMock(1, 0)
    render(<NotesSidebar />)
    fireEvent.click(screen.getByText('Empty Trash'))
    fireEvent.click(screen.getByText('Cancel Empty'))
    expect(mockPermanentDeleteItems).not.toHaveBeenCalled()
  })

  it('cancelling EmptyTrashDialog closes the dialog', () => {
    makeUseNotesMock(1, 0)
    render(<NotesSidebar />)
    fireEvent.click(screen.getByText('Empty Trash'))
    expect(screen.getByTestId('empty-trash-dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Cancel Empty'))
    expect(screen.queryByTestId('empty-trash-dialog')).not.toBeInTheDocument()
  })

  it('shows auto-purge info label', () => {
    makeUseNotesMock(0, 0)
    render(<NotesSidebar />)
    const labels = screen.getAllByTestId('context-menu-label')
    const purgeLabel = labels.find(el => el.textContent?.includes('Auto-purges after 7 days'))
    expect(purgeLabel).toBeTruthy()
  })

  it('EmptyTrashDialog receives correct note and folder counts', () => {
    makeUseNotesMock(3, 2)
    render(<NotesSidebar />)
    fireEvent.click(screen.getByText('Empty Trash'))
    expect(screen.getByTestId('etd-note-count')).toHaveTextContent('3')
    expect(screen.getByTestId('etd-folder-count')).toHaveTextContent('2')
  })
})
