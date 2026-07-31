import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import PageContainer from '@/components/PageContainer'

describe('PageContainer', () => {
  it('renders its children', () => {
    render(<PageContainer><p>Hello</p></PageContainer>)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('applies the scroll container and responsive max-width', () => {
    const { container } = render(<PageContainer><p>Hi</p></PageContainer>)
    const outer = container.firstElementChild
    expect(outer?.className).toContain('overflow-auto')
    const inner = outer?.firstElementChild
    expect(inner?.className).toContain('md:max-w-[900px]')
    expect(inner?.className).toContain('lg:max-w-[1142px]')
    expect(inner?.className).toContain('px-4')
  })

  it('merges an extra className onto the inner container', () => {
    const { container } = render(<PageContainer className="custom-class"><p>Hi</p></PageContainer>)
    const inner = container.firstElementChild?.firstElementChild
    expect(inner?.className).toContain('custom-class')
  })

  it('lets an extra className override a conflicting default', () => {
    const { container } = render(<PageContainer className="lg:max-w-xl"><p>Hi</p></PageContainer>)
    const inner = container.firstElementChild?.firstElementChild
    expect(inner?.className).toContain('lg:max-w-xl')
    expect(inner?.className).not.toContain('lg:max-w-[1142px]')
  })
})
