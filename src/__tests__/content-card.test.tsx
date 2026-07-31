import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import ContentCard from '@/components/ui/content-card'

describe('ContentCard', () => {
  it('renders its children inside the card', () => {
    render(<ContentCard><p>Hello</p></ContentCard>)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('wraps children in a rounded floating card with a p-3.5 outer gap', () => {
    const { container } = render(<ContentCard><p>Hi</p></ContentCard>)
    const card = container.querySelector('[data-slot="content-card"]')!
    const outer = card.parentElement!
    expect(card).toHaveClass('rounded-2xl', 'bg-card', 'text-card-foreground', 'ring-1', 'ring-sidebar-border')
    expect(card).toHaveClass('shadow-[0_10px_28px_rgba(15,23,42,0.10)]')
    expect(card).toHaveClass('dark:shadow-[0_12px_32px_rgba(0,0,0,0.5)]')
    expect(outer).toHaveClass('p-3.5')
  })

  it('merges an extra className onto the card', () => {
    const { container } = render(<ContentCard className="custom-class"><p>Hi</p></ContentCard>)
    const card = container.querySelector('[data-slot="content-card"]')!
    expect(card.className).toContain('custom-class')
  })
})
