import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MobileAdmin from '@/components/MobileAdmin'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

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
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Import Jobs')).toBeInTheDocument()
    expect(screen.getByText('User Management')).toBeInTheDocument()
    expect(screen.getByText('System Settings')).toBeInTheDocument()
  })

  it('navigates to admin routes on click', () => {
    render(<MobileAdmin stats={{ users: 24, notes: 1247, storage: "2.3 GB", imports: 89 }} onBack={mockOnBack} />)
    fireEvent.click(screen.getByText('User Management'))
    expect(mockPush).toHaveBeenCalledWith('/admin/users')
  })

  it('calls onBack when back arrow is clicked', () => {
    render(<MobileAdmin stats={{ users: 24, notes: 1247, storage: "2.3 GB", imports: 89 }} onBack={mockOnBack} />)
    fireEvent.click(screen.getByText('←'))
    expect(mockOnBack).toHaveBeenCalled()
  })

  it('renders correct number of management links', () => {
    render(<MobileAdmin stats={{ users: 24, notes: 1247, storage: "2.3 GB", imports: 89 }} onBack={mockOnBack} />)
    const links = screen.getAllByText('\u203A')
    expect(links).toHaveLength(4)
  })
})
