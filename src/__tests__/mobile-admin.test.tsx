import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MobileAdmin from '@/components/MobileAdmin'

describe('MobileAdmin', () => {
  const mockOnBack = vi.fn()

  const mockStats = {
    totalUsers: 24,
    activeToday: 12,
    totalNotes: 1247,
    newThisWeek: 89,
    storage: "2.3 GB",
    health: { status: "healthy", uptime: "12345", responseTime: "23", nodeVersion: "v20.0.0", environment: "production" },
    r2: { storageBytes: 5_000_000_000, totalObjects: 1500, cost: 0.42 },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all 9 KPI cards with R2 data', () => {
    render(<MobileAdmin stats={mockStats} onBack={mockOnBack} />)
    expect(screen.getByText('24')).toBeInTheDocument()
    expect(screen.getByText('1,247')).toBeInTheDocument()
    expect(screen.getByText('2.3 GB')).toBeInTheDocument()
    expect(screen.getByText('+89 this week')).toBeInTheDocument()
    expect(screen.getByText('Healthy')).toBeInTheDocument()
    expect(screen.getByText('23ms')).toBeInTheDocument()
    expect(screen.getByText('v20.0.0')).toBeInTheDocument()
    expect(screen.getByText('4.7 GB')).toBeInTheDocument()
    expect(screen.getByText('$0.42')).toBeInTheDocument()
  })

  it('does not show R2 cards when R2 data is null', () => {
    render(<MobileAdmin stats={{ ...mockStats, r2: null }} onBack={mockOnBack} />)
    expect(screen.queryByText('R2 Storage')).not.toBeInTheDocument()
    expect(screen.queryByText('R2 Cost')).not.toBeInTheDocument()
  })

  it('shows Issues when system is unhealthy', () => {
    const unhealthyStats = { ...mockStats, health: { ...mockStats.health, status: "unhealthy" } }
    render(<MobileAdmin stats={unhealthyStats} onBack={mockOnBack} />)
    expect(screen.getByText('Issues')).toBeInTheDocument()
  })

  it('calls onBack when back arrow is clicked', () => {
    render(<MobileAdmin stats={mockStats} onBack={mockOnBack} />)
    fireEvent.click(screen.getByText('\u2190'))
    expect(mockOnBack).toHaveBeenCalled()
  })
})
