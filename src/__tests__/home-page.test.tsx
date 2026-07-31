import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

vi.mock('next/image', () => ({
  default: (props: { alt: string }) => React.createElement('img', { alt: props.alt }),
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

vi.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { name: 'Test' } } }) }))

vi.mock('@/contexts/NoteContext', () => ({ useNotes: vi.fn() }))

vi.mock('@/components/SearchDropdown', () => ({ default: () => null }))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) =>
    React.createElement('button', { onClick }, children),
}))

vi.mock('@/components/ui/input', () => ({
  Input: (p: React.InputHTMLAttributes<HTMLInputElement>) => React.createElement('input', p),
}))

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>()
  return { ...actual }
})

import { useNotes } from '@/contexts/NoteContext'
import HomePage from '@/components/HomePage'

const mockUseNotes = useNotes as ReturnType<typeof vi.fn>

function baseContext(overrides = {}) {
  return {
    notes: [],
    folders: [],
    loading: false,
    error: null,
    setActiveNoteId: vi.fn(),
    createNote: vi.fn(),
    fetchNotes: vi.fn(),
    expandedFolders: new Set<string>(),
    toggleFolder: vi.fn(),
    toggleFavorite: vi.fn(),
    favoriteNotes: [],
    ...overrides,
  }
}

beforeEach(() => {
  mockUseNotes.mockReturnValue(baseContext())
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, data: { count: 0 } }),
  }))
})

afterEach(() => vi.unstubAllGlobals())

describe('HomePage', () => {
  it('renders the welcome heading', () => {
    render(<HomePage />)
    expect(screen.getByRole('heading', { name: /welcome/i })).toBeInTheDocument()
  })

  it('renders a full-width responsive padded container without a width cap', () => {
    const { container } = render(<HomePage />)
    const content = container.querySelector('.space-y-6')
    expect(content).not.toBeNull()
    const inner = content?.parentElement
    expect(inner?.className).toContain('px-4')
    expect(inner?.className).toContain('w-full')
    expect(inner?.className).not.toContain('max-w-[1142px]')
  })
})
