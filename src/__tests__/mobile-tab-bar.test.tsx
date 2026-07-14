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
    expect(screen.getByText('Folders')).toBeInTheDocument()
    expect(screen.getByText('Favorites')).toBeInTheDocument()
    expect(screen.getByText('More')).toBeInTheDocument()
  })

  it('calls onTabChange when a tab is clicked', () => {
    render(<MobileTabBar activeTab="home" onTabChange={mockOnTabChange} />)
    fireEvent.click(screen.getByText('Folders'))
    expect(mockOnTabChange).toHaveBeenCalledWith('folders')
  })

  it('highlights the active tab', () => {
    render(<MobileTabBar activeTab="folders" onTabChange={mockOnTabChange} />)
    const foldersTab = screen.getByText('Folders').closest('div')!
    expect(foldersTab.className).toContain('text-blue-600')
  })

  it('does not highlight inactive tabs', () => {
    render(<MobileTabBar activeTab="home" onTabChange={mockOnTabChange} />)
    const foldersTab = screen.getByText('Folders').closest('div')!
    expect(foldersTab.className).not.toContain('text-blue-600')
  })
})
