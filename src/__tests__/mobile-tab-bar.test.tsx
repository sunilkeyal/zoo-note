import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MobileTabBar from '@/components/MobileTabBar'

describe('MobileTabBar', () => {
  const mockOnTabChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all five tabs', () => {
    render(<MobileTabBar activeTab="home" onTabChange={mockOnTabChange} />)
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Folders')).toBeInTheDocument()
    expect(screen.getByText('Search')).toBeInTheDocument()
    expect(screen.getByText('Favorites')).toBeInTheDocument()
    expect(screen.getByText('More')).toBeInTheDocument()
  })

  it('calls onTabChange when a tab is clicked', () => {
    render(<MobileTabBar activeTab="home" onTabChange={mockOnTabChange} />)
    fireEvent.click(screen.getByText('Search'))
    expect(mockOnTabChange).toHaveBeenCalledWith('search')
  })

  it('highlights the active tab', () => {
    render(<MobileTabBar activeTab="search" onTabChange={mockOnTabChange} />)
    const searchTab = screen.getByText('Search').closest('div')!
    expect(searchTab.className).toContain('text-blue-600')
  })

  it('does not highlight inactive tabs', () => {
    render(<MobileTabBar activeTab="home" onTabChange={mockOnTabChange} />)
    const searchTab = screen.getByText('Search').closest('div')!
    expect(searchTab.className).not.toContain('text-blue-600')
  })
})
