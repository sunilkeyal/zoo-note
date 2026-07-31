import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'
import { SidebarProvider, Sidebar } from '@/components/ui/sidebar'

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    value: vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
    writable: true,
    configurable: true,
  })
})

describe('floating Sidebar surface', () => {
  it('uses the shared floating-card-surface, not the old rounded-2xl shadow', () => {
    const { container } = render(
      <SidebarProvider>
        <Sidebar collapsible="none" variant="floating">
          <div>content</div>
        </Sidebar>
      </SidebarProvider>
    )
    const outer = container.querySelector('[data-slot="sidebar"]')!
    const surface = outer.querySelector(':scope > div')!
    expect(surface).toHaveClass('floating-card-surface', 'bg-sidebar', 'ring-1', 'ring-sidebar-border')
    expect(surface).not.toHaveClass('rounded-2xl')
    expect(outer).toHaveClass('p-2')
  })
})
