import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { SidebarProvider, Sidebar } from '@/components/ui/sidebar'

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}))

function renderSidebar(variant: 'sidebar' | 'floating') {
  return render(
    <SidebarProvider>
      <Sidebar collapsible="none" variant={variant}>
        <div data-testid="content">content</div>
      </Sidebar>
    </SidebarProvider>
  )
}

describe('Sidebar floating variant', () => {
  it('wraps children in the shared floating card surface when variant is floating', () => {
    renderSidebar('floating')
    const content = screen.getByTestId('content')
    const card = content.parentElement!
    const outer = card.parentElement!
    expect(card).toHaveClass('floating-card-surface', 'bg-sidebar', 'ring-1', 'ring-sidebar-border')
    expect(card).not.toHaveClass('rounded-2xl')
    expect(outer).toHaveAttribute('data-slot', 'sidebar')
    expect(outer).toHaveClass('p-2')
  })

  it('keeps the flat layout when variant is not floating', () => {
    renderSidebar('sidebar')
    const content = screen.getByTestId('content')
    const outer = content.parentElement!
    expect(outer).toHaveAttribute('data-slot', 'sidebar')
    expect(outer).toHaveClass('bg-sidebar')
    expect(outer).not.toHaveClass('p-2')
  })
})
