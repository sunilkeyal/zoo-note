import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import ContentCard from '@/components/ui/content-card'

describe('ContentCard', () => {
  it('renders its children inside the card', () => {
    render(<ContentCard><p>Hello</p></ContentCard>)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('wraps children in a floating card with a p-2 outer gap', () => {
    const { container } = render(<ContentCard><p>Hi</p></ContentCard>)
    const card = container.querySelector('[data-slot="content-card"]')!
    const outer = card.parentElement!
    expect(card).toHaveClass('floating-card-surface', 'bg-card', 'text-card-foreground', 'ring-1', 'ring-sidebar-border')
    expect(card).toHaveClass('max-w-[1142px]')
    expect(card).not.toHaveClass('rounded-2xl')
    expect(outer).toHaveClass('p-2')
  })

  it('grows (no internal clip) by default and fills height when fill is set', () => {
    const { container, rerender } = render(<ContentCard><p>Hi</p></ContentCard>)
    const grow = container.querySelector('[data-slot="content-card"]')!
    expect(grow).toHaveClass('min-h-full')
    expect(grow).not.toHaveClass('overflow-hidden')

    rerender(<ContentCard fill><p>Hi</p></ContentCard>)
    const fill = container.querySelector('[data-slot="content-card"]')!
    expect(fill).toHaveClass('h-full', 'overflow-hidden')
  })

  it('merges an extra className onto the card', () => {
    const { container } = render(<ContentCard className="custom-class"><p>Hi</p></ContentCard>)
    const card = container.querySelector('[data-slot="content-card"]')!
    expect(card.className).toContain('custom-class')
  })
})
