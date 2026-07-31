import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

vi.mock('@/contexts/NoteContext', () => ({ useNotes: vi.fn() }))

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>()
  return { ...actual }
})

vi.mock('@/components/ui/input', () => ({
  Input: (p: React.InputHTMLAttributes<HTMLInputElement>) => React.createElement('input', p),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) =>
    React.createElement('button', { onClick }, children),
}))

vi.mock('@/components/ui/context-menu', () => ({
  ContextMenu: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  ContextMenuTrigger: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  ContextMenuContent: () => null,
  ContextMenuItem: () => null,
  ContextMenuSeparator: () => null,
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? React.createElement(React.Fragment, null, children) : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  DialogHeader: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  DialogTitle: ({ children }: { children: React.ReactNode }) => React.createElement('h2', null, children),
  DialogFooter: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
}))

vi.mock('@/components/DeleteConfirmDialog', () => ({
  default: () => null,
}))

import { useNotes } from '@/contexts/NoteContext'
import FavoritesPage from '@/app/favorites/page'

const mockUseNotes = useNotes as ReturnType<typeof vi.fn>

function baseContext(overrides = {}) {
  return {
    notes: [],
    folders: [],
    loading: false,
    error: null,
    setActiveNoteId: vi.fn(),
    expandedFolders: new Set<string>(),
    toggleFolder: vi.fn(),
    fetchNotes: vi.fn(),
    updateNote: vi.fn().mockResolvedValue(null),
    deleteNote: vi.fn().mockResolvedValue(true),
    toggleFavorite: vi.fn(),
    favoriteNotes: [],
    ...overrides,
  }
}

const FAVORITE = {
  _id: '1',
  title: 'Starred Note',
  content: '<p>Star content</p>',
  folderId: undefined,
  position: 0,
  isFavorite: true,
  favoritedAt: new Date(Date.now() - 60_000).toISOString(),
  createdAt: '',
  updatedAt: new Date(Date.now() - 60_000).toISOString(),
  isDeleted: false,
}

beforeEach(() => mockUseNotes.mockReturnValue(baseContext()))

describe('FavoritesPage', () => {
  it('renders the page heading', () => {
    render(<FavoritesPage />)
    expect(screen.getByRole('heading', { name: /favorites/i })).toBeInTheDocument()
  })

  it('wraps content in the scroll container', () => {
    const { container } = render(<FavoritesPage />)
    expect(container.querySelector('.overflow-auto')).not.toBeNull()
  })

  it('renders favorite notes', () => {
    mockUseNotes.mockReturnValue(baseContext({ favoriteNotes: [FAVORITE], notes: [FAVORITE] }))
    render(<FavoritesPage />)
    expect(screen.getByText('Starred Note')).toBeInTheDocument()
    expect(screen.getByText('Star content')).toBeInTheDocument()
  })

  it('shows the empty state when there are no favorites', () => {
    render(<FavoritesPage />)
    expect(screen.getByText(/no favorites yet/i)).toBeInTheDocument()
  })
})
