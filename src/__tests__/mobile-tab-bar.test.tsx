import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MobileTabBar from '@/components/MobileTabBar'

describe('MobileTabBar', () => {
  const mockOnTabChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all four tabs', () => {
    render(<MobileTabBar activeTab="home" onTabChange={mockOnTabChange} />)
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Favorites')).toBeInTheDocument()
    expect(screen.getByText('Recent')).toBeInTheDocument()
    expect(screen.getByText('More')).toBeInTheDocument()
  })

  it('calls onTabChange when a tab is clicked', () => {
    render(<MobileTabBar activeTab="home" onTabChange={mockOnTabChange} />)
    fireEvent.click(screen.getByText('Favorites'))
    expect(mockOnTabChange).toHaveBeenCalledWith('favorites')
  })

  it('highlights the active tab', () => {
    render(<MobileTabBar activeTab="recent" onTabChange={mockOnTabChange} />)
    const recentTab = screen.getByText('Recent').closest('div')!
    expect(recentTab.className).toContain('text-blue-600')
  })

  it('does not highlight inactive tabs', () => {
    render(<MobileTabBar activeTab="home" onTabChange={mockOnTabChange} />)
    const favoritesTab = screen.getByText('Favorites').closest('div')!
    expect(favoritesTab.className).not.toContain('text-blue-600')
  })
})
