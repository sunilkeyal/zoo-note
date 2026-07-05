import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockRouterPush }) }))

const mockRouterPush = vi.fn()

vi.mock('@/contexts/NoteContext', () => ({ useNotes: vi.fn() }))

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>()
  return { ...actual }
})

vi.mock('@/components/ui/input', () => ({
  Input: (p: React.InputHTMLAttributes<HTMLInputElement>) => React.createElement('input', p),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) =>
    React.createElement('button', { onClick, disabled }, children),
}))

vi.mock('@/components/ui/context-menu', () => ({
  ContextMenu: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  ContextMenuTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => React.createElement(React.Fragment, null, children),
  ContextMenuContent: ({ children }: { children: React.ReactNode }) => null,
  ContextMenuItem: ({ children }: { children: React.ReactNode; onClick?: () => void }) => null,
  ContextMenuSeparator: () => null,
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? React.createElement(React.Fragment, null, children) : null,
  DialogContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'dialog-content' }, children),
  DialogHeader: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  DialogTitle: ({ children }: { children: React.ReactNode }) => React.createElement('h2', null, children),
  DialogFooter: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
}))

vi.mock('@/components/DeleteConfirmDialog', () => ({
  default: ({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) =>
    open ? React.createElement('div', { 'data-testid': 'delete-dialog' },
      React.createElement('button', { onClick: onConfirm }, 'Delete'),
      React.createElement('button', { onClick: onClose }, 'Cancel'),
    ) : null,
}))

import { useNotes } from '@/contexts/NoteContext'
import RecentPage from '@/app/recent/page'

const mockUseNotes = useNotes as ReturnType<typeof vi.fn>

const FOLDER_WORK = { _id: 'f1', name: 'Work', position: 0, createdAt: '', updatedAt: '' }

const NOTE_A = {
  _id: '1', title: 'Alpha Note', content: '<p>Alpha content</p>',
  folderId: 'f1', folderName: 'Work',
  updatedAt: new Date(Date.now() - 60_000).toISOString(),
  position: 0, createdAt: '', isDeleted: false,
}
const NOTE_B = {
  _id: '2', title: 'Beta Note', content: '<p>Beta content</p>',
  folderId: undefined, folderName: undefined,
  updatedAt: new Date(Date.now() - 3_600_000).toISOString(),
  position: 1, createdAt: '', isDeleted: false,
}

function baseContext(overrides = {}) {
  return {
    notes: [NOTE_B, NOTE_A], // intentionally unsorted — page must sort
    folders: [FOLDER_WORK],
    loading: false,
    error: null,
    setActiveNoteId: vi.fn(),
    expandedFolders: new Set<string>(),
    toggleFolder: vi.fn(),
    fetchNotes: vi.fn(),
    updateNote: vi.fn().mockResolvedValue(null),
    deleteNote: vi.fn().mockResolvedValue(true),
    ...overrides,
  }
}

beforeEach(() => {
  mockUseNotes.mockReturnValue(baseContext())
  mockRouterPush.mockClear()
})

describe('RecentPage', () => {
  it('renders the page heading', () => {
    render(<RecentPage />)
    expect(screen.getByRole('heading', { name: /recent/i })).toBeInTheDocument()
  })

  it('shows the most recently edited note as the hero card', () => {
    render(<RecentPage />)
    // NOTE_A has a more recent updatedAt — it should be the hero
    const headings = screen.getAllByText('Alpha Note')
    expect(headings.length).toBeGreaterThan(0)
  })

  it('shows remaining notes in the grid', () => {
    render(<RecentPage />)
    expect(screen.getByText('Beta Note')).toBeInTheDocument()
  })

  it('shows the folder name in the card footer', () => {
    render(<RecentPage />)
    // NOTE_A has folderId 'f1' which maps to 'Work'
    expect(screen.getAllByText('Work').length).toBeGreaterThan(0)
  })

  it('strips HTML from content previews', () => {
    render(<RecentPage />)
    expect(screen.getByText('Alpha content')).toBeInTheDocument()
  })

  it('calls setActiveNoteId and navigates to / when a note card is clicked', () => {
    const setActiveNoteId = vi.fn()
    mockUseNotes.mockReturnValue(baseContext({ setActiveNoteId }))
    render(<RecentPage />)
    fireEvent.click(screen.getAllByText('Alpha Note')[0])
    expect(setActiveNoteId).toHaveBeenCalledWith('1')
    expect(mockRouterPush).toHaveBeenCalledWith('/notes/1')
  })

  it('expands the folder when clicking a note whose folder is collapsed', () => {
    const toggleFolder = vi.fn()
    mockUseNotes.mockReturnValue(baseContext({ toggleFolder, expandedFolders: new Set() }))
    render(<RecentPage />)
    fireEvent.click(screen.getAllByText('Alpha Note')[0])
    expect(toggleFolder).toHaveBeenCalledWith('f1')
  })

  it('shows the empty state when there are no notes', () => {
    mockUseNotes.mockReturnValue(baseContext({ notes: [] }))
    render(<RecentPage />)
    expect(screen.getByText(/no notes yet/i)).toBeInTheDocument()
  })

  it('filters notes by title when filter input is used', () => {
    render(<RecentPage />)
    const input = screen.getByPlaceholderText(/filter notes/i)
    fireEvent.change(input, { target: { value: 'alpha' } })
    expect(screen.getByText('Alpha Note')).toBeInTheDocument()
    expect(screen.queryByText('Beta Note')).not.toBeInTheDocument()
  })

  it('shows no-match message when filter finds nothing', () => {
    render(<RecentPage />)
    const input = screen.getByPlaceholderText(/filter notes/i)
    fireEvent.change(input, { target: { value: 'zzznomatch' } })
    expect(screen.getByText(/no notes match/i)).toBeInTheDocument()
  })

  it('shows a loading state', () => {
    mockUseNotes.mockReturnValue(baseContext({ loading: true, notes: [] }))
    render(<RecentPage />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows an error state with a retry button', () => {
    const fetchNotes = vi.fn()
    mockUseNotes.mockReturnValue(baseContext({ error: 'Failed to load', notes: [], fetchNotes }))
    render(<RecentPage />)
    expect(screen.getByText('Failed to load')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(fetchNotes).toHaveBeenCalled()
  })
})
