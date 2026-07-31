import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

vi.mock('next-auth/react', () => ({ useSession: () => ({ data: null }) }))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  TableHeader: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  TableBody: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  TableHead: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  TableRow: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  TableCell: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => React.createElement('span', null, children),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) =>
    React.createElement('button', { onClick }, children),
}))

vi.mock('@/components/ui/pagination', () => ({
  Pagination: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  PaginationContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  PaginationItem: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  PaginationEllipsis: () => null,
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  SelectContent: () => null,
  SelectItem: () => null,
  SelectTrigger: () => null,
  SelectValue: () => null,
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: () => null,
  DialogContent: () => null,
  DialogDescription: () => null,
  DialogFooter: () => null,
  DialogHeader: () => null,
  DialogTitle: () => null,
}))

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => null,
}))

import ImportsPage from '@/app/admin/imports/page'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, data: { jobs: [], total: 0 } }),
  }))
})

afterEach(() => vi.unstubAllGlobals())

describe('ImportsPage', () => {
  it('renders the Import Jobs header with avatar and subtitle', () => {
    render(<ImportsPage />)
    expect(screen.getByRole('heading', { name: /import jobs/i })).toBeInTheDocument()
    expect(screen.getByText(/monitor notebook imports and clean up failed jobs/i)).toBeInTheDocument()
  })

  it('shows an empty state when there are no jobs', async () => {
    render(<ImportsPage />)
    expect(await screen.findByText(/no import jobs found/i)).toBeInTheDocument()
  })
})
