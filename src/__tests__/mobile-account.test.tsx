import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import MobileAccount from '@/components/MobileAccount'

describe('MobileAccount', () => {
  const mockOnBack = vi.fn()
  const defaultProps = {
    name: 'Test User',
    email: 'test@example.com',
    onBack: mockOnBack,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with user info', () => {
    render(<MobileAccount {...defaultProps} />)
    expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument()
  })

  it('calls onBack when back arrow is clicked', () => {
    render(<MobileAccount {...defaultProps} />)
    fireEvent.click(screen.getByText('←'))
    expect(mockOnBack).toHaveBeenCalled()
  })

  it('shows validation error for empty name', async () => {
    render(<MobileAccount {...defaultProps} />)
    const nameInput = screen.getByDisplayValue('Test User')
    fireEvent.change(nameInput, { target: { value: '' } })
    fireEvent.click(screen.getByText('Save changes'))
    expect(await screen.findByText('Name is required.')).toBeInTheDocument()
  })

  it('shows validation error for invalid email', async () => {
    render(<MobileAccount {...defaultProps} />)
    const emailInput = screen.getByDisplayValue('test@example.com')
    fireEvent.change(emailInput, { target: { value: 'bad-email' } })
    fireEvent.click(screen.getByText('Save changes'))
    expect(await screen.findByText('Invalid email format.')).toBeInTheDocument()
  })

  it('shows password mismatch error', async () => {
    render(<MobileAccount {...defaultProps} />)
    const passwordInput = screen.getByPlaceholderText('New password (at least 8 characters)')
    const confirmInput = screen.getByPlaceholderText('Repeat new password')
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmInput, { target: { value: 'different' } })
    fireEvent.click(screen.getByText('Save changes'))
    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument()
  })

  it('calls onSave with name and email on valid submit', async () => {
    const onSave = vi.fn(() => Promise.resolve({ changed: ['name'] }))
    render(<MobileAccount {...defaultProps} onSave={onSave} />)
    fireEvent.click(screen.getByText('Save changes'))
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ name: 'Test User', email: 'test@example.com' })
    })
  })
})
