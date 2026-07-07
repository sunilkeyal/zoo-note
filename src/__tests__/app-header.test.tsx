import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import AppHeader from '@/components/AppHeader'

const { mockSetTheme, mockUseThemeSync } = vi.hoisted(() => {
  const mockSetTheme = vi.fn()
  const mockUseThemeSync = vi.fn(() => ({ theme: 'light', setTheme: mockSetTheme }))
  return { mockSetTheme, mockUseThemeSync }
})

vi.mock('@/contexts/ThemeSyncContext', () => ({
  useThemeSync: mockUseThemeSync,
}))

vi.mock('lucide-react', () => ({
  Sun: () => <svg data-testid="sun-icon" />,
  Moon: () => <svg data-testid="moon-icon" />,
  PanelLeftIcon: () => <svg data-testid="panel-left-icon" />,
}))

vi.mock('@/components/ui/sidebar', () => ({
  SidebarTrigger: ({ onClick, ...props }: { onClick?: () => void }) => (
    <button onClick={onClick} {...props} data-testid="sidebar-trigger" />
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, ...props }: { children: React.ReactNode; onClick?: () => void; variant?: string; size?: string }) => (
    <button onClick={onClick} data-variant={variant} data-size={size} {...props}>{children}</button>
  ),
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip">{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-content">{children}</div>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children, render, ...props }: { children: React.ReactNode; render?: React.ReactElement }) => {
    if (render) return React.cloneElement(render, { ...props, 'data-testid': 'tooltip-trigger' }, children)
    return <button data-testid="tooltip-trigger" {...props}>{children}</button>
  },
}))

describe('AppHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseThemeSync.mockImplementation(() => ({ theme: 'light', setTheme: mockSetTheme }))
  })

  it('renders theme toggle button', () => {
    render(<AppHeader />)
    expect(screen.getByTestId('sidebar-trigger')).toBeInTheDocument()
    expect(screen.getByTestId('moon-icon')).toBeInTheDocument()
  })

  it('shows Sun icon when theme is dark', () => {
    mockUseThemeSync.mockReturnValue({ theme: 'dark', setTheme: mockSetTheme })

    render(<AppHeader />)
    expect(screen.getByTestId('sun-icon')).toBeInTheDocument()
  })

  it('toggles theme on click', () => {
    render(<AppHeader />)
    const tooltipTrigger = screen.getByTestId('tooltip-trigger')
    fireEvent.click(tooltipTrigger)
    expect(mockSetTheme).toHaveBeenCalledWith('dark')
  })

  it('toggles from dark to light', () => {
    mockUseThemeSync.mockReturnValue({ theme: 'dark', setTheme: mockSetTheme })

    render(<AppHeader />)
    const tooltipTrigger = screen.getByTestId('tooltip-trigger')
    fireEvent.click(tooltipTrigger)
    expect(mockSetTheme).toHaveBeenCalledWith('light')
  })
})
