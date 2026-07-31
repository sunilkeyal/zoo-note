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
  it('wraps children in a rounded floating card when variant is floating', () => {
    renderSidebar('floating')
    const content = screen.getByTestId('content')
    const card = content.parentElement!
    const outer = card.parentElement!
    expect(card).toHaveClass('rounded-2xl', 'bg-sidebar', 'ring-1', 'ring-sidebar-border')
    expect(card).toHaveClass('shadow-[0_10px_28px_rgba(15,23,42,0.10)]')
    expect(card).toHaveClass('dark:shadow-[0_12px_32px_rgba(0,0,0,0.5)]')
    expect(outer).toHaveAttribute('data-slot', 'sidebar')
    expect(outer).toHaveClass('p-3.5')
  })

  it('keeps the flat layout when variant is not floating', () => {
    renderSidebar('sidebar')
    const content = screen.getByTestId('content')
    const outer = content.parentElement!
    expect(outer).toHaveAttribute('data-slot', 'sidebar')
    expect(outer).toHaveClass('bg-sidebar')
    expect(outer).not.toHaveClass('p-3.5')
  })
})
