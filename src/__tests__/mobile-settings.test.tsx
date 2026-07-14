import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MobileSettings from '@/components/MobileSettings'

describe('MobileSettings', () => {
  const mockOnBack = vi.fn()
  const mockOnThemeChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders theme options', () => {
    render(<MobileSettings currentTheme="light" onBack={mockOnBack} onThemeChange={mockOnThemeChange} />)
    expect(screen.getByText('Light')).toBeInTheDocument()
    expect(screen.getByText('Dark')).toBeInTheDocument()
    expect(screen.getByText('System')).toBeInTheDocument()
  })

  it('calls onThemeChange when a theme is clicked', () => {
    render(<MobileSettings currentTheme="light" onBack={mockOnBack} onThemeChange={mockOnThemeChange} />)
    fireEvent.click(screen.getByText('Dark'))
    expect(mockOnThemeChange).toHaveBeenCalledWith('dark')
  })

  it('calls onBack when back arrow is clicked', () => {
    render(<MobileSettings currentTheme="light" onBack={mockOnBack} onThemeChange={mockOnThemeChange} />)
    fireEvent.click(screen.getByText('←'))
    expect(mockOnBack).toHaveBeenCalled()
  })
})
