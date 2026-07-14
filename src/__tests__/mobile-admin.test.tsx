import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MobileAdmin from '@/components/MobileAdmin'

describe('MobileAdmin', () => {
  const mockOnBack = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders stats cards', () => {
    render(<MobileAdmin stats={{ users: 24, notes: 1247, storage: "2.3 GB", imports: 89 }} onBack={mockOnBack} />)
    expect(screen.getByText('24')).toBeInTheDocument()
    expect(screen.getByText('1,247')).toBeInTheDocument()
    expect(screen.getByText('2.3 GB')).toBeInTheDocument()
    expect(screen.getByText('89')).toBeInTheDocument()
  })

  it('renders management links', () => {
    render(<MobileAdmin stats={{ users: 24, notes: 1247, storage: "2.3 GB", imports: 89 }} onBack={mockOnBack} />)
    expect(screen.getByText('User Management')).toBeInTheDocument()
    expect(screen.getByText('All Notes')).toBeInTheDocument()
    expect(screen.getByText('Folder Management')).toBeInTheDocument()
    expect(screen.getByText('System Settings')).toBeInTheDocument()
    expect(screen.getByText('Audit Logs')).toBeInTheDocument()
  })

  it('calls onBack when back arrow is clicked', () => {
    render(<MobileAdmin stats={{ users: 24, notes: 1247, storage: "2.3 GB", imports: 89 }} onBack={mockOnBack} />)
    fireEvent.click(screen.getByText('←'))
    expect(mockOnBack).toHaveBeenCalled()
  })
})
