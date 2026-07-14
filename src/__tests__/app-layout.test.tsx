import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(),
}))

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({ data: { user: { role: 'user' } }, status: 'authenticated' })),
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
  usePathname: vi.fn(() => '/notes'),
}))

vi.mock('@/components/NotesSidebar', () => ({
  default: () => <div data-testid="notes-sidebar">Sidebar</div>,
}))

vi.mock('@/components/AppHeader', () => ({
  default: () => <div data-testid="app-header">Header</div>,
}))

vi.mock('@/contexts/SidebarDensityContext', () => ({
  SidebarDensityProvider: ({ children }: { children: React.ReactNode }) => children,
  useSidebarDensity: vi.fn(() => ({ density: 'default', setDensity: vi.fn() })),
}))

vi.mock('@/contexts/NoteContext', () => ({
  useNotes: vi.fn(() => ({
    notes: [],
    folders: [],
    trashItems: { notes: [], folders: [] },
    fetchNotes: vi.fn(),
    fetchFolders: vi.fn(),
    fetchTrash: vi.fn(),
    createNote: vi.fn(),
    createFolder: vi.fn(),
  })),
}))

import AppLayout from '@/components/AppLayout'
import { useIsMobile } from '@/hooks/use-mobile'

describe('AppLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows sidebar on desktop', () => {
    vi.mocked(useIsMobile).mockReturnValue(false)
    render(<AppLayout><div>Content</div></AppLayout>)
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('shows tab bar on mobile', () => {
    vi.mocked(useIsMobile).mockReturnValue(true)
    render(<AppLayout><div>Content</div></AppLayout>)
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Folders')).toBeInTheDocument()
    expect(screen.getByText('Favorites')).toBeInTheDocument()
    expect(screen.getByText('More')).toBeInTheDocument()
  })
})
