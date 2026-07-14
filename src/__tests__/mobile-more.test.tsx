import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MobileMore from '@/components/MobileMore'

describe('MobileMore', () => {
  const mockOnSettings = vi.fn()
  const mockOnAdmin = vi.fn()
  const mockOnSignOut = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all menu items', () => {
    render(<MobileMore isAdmin={false} userName="test@example.com" onSettings={mockOnSettings} onAdmin={mockOnAdmin} onSignOut={mockOnSignOut} />)
    expect(screen.getByText('Profile')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    expect(screen.getByText('Appearance')).toBeInTheDocument()
    expect(screen.getByText('Import')).toBeInTheDocument()
    expect(screen.getByText('Export')).toBeInTheDocument()
    expect(screen.getByText('Sign Out')).toBeInTheDocument()
  })

  it('shows Admin Dashboard for admin users', () => {
    render(<MobileMore isAdmin={true} userName="test@example.com" onSettings={mockOnSettings} onAdmin={mockOnAdmin} onSignOut={mockOnSignOut} />)
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
  })

  it('hides Admin Dashboard for non-admin users', () => {
    render(<MobileMore isAdmin={false} userName="test@example.com" onSettings={mockOnSettings} onAdmin={mockOnAdmin} onSignOut={mockOnSignOut} />)
    expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument()
  })

  it('calls onSettings when Appearance is clicked', () => {
    render(<MobileMore isAdmin={false} userName="test@example.com" onSettings={mockOnSettings} onAdmin={mockOnAdmin} onSignOut={mockOnSignOut} />)
    fireEvent.click(screen.getByText('Appearance'))
    expect(mockOnSettings).toHaveBeenCalled()
  })

  it('calls onAdmin when Admin Dashboard is clicked', () => {
    render(<MobileMore isAdmin={true} userName="test@example.com" onSettings={mockOnSettings} onAdmin={mockOnAdmin} onSignOut={mockOnSignOut} />)
    fireEvent.click(screen.getByText('Admin Dashboard'))
    expect(mockOnAdmin).toHaveBeenCalled()
  })

  it('calls onSignOut when Sign Out is clicked', () => {
    render(<MobileMore isAdmin={false} userName="test@example.com" onSettings={mockOnSettings} onAdmin={mockOnAdmin} onSignOut={mockOnSignOut} />)
    fireEvent.click(screen.getByText('Sign Out'))
    expect(mockOnSignOut).toHaveBeenCalled()
  })
})
