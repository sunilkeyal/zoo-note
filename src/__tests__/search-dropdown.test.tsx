import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import SearchDropdown from '@/components/SearchDropdown'
import type { Note } from '@/types'

vi.mock('@/components/ui/command', () => ({
  Command: ({ children, ...props }: any) => <div data-testid="command" {...props}>{children}</div>,
  CommandList: ({ children }: any) => <div data-testid="command-list">{children}</div>,
  CommandItem: ({ children, onSelect, value, ...props }: any) => (
    <div data-testid="command-item" data-value={value} onClick={() => onSelect?.(value)} {...props}>{children}</div>
  ),
  CommandEmpty: ({ children }: any) => <div data-testid="command-empty">{children}</div>,
}))

function createNote(overrides: Partial<Note> = {}): Note {
  return {
    _id: 'note-1',
    title: 'Test Note',
    content: '<p>Hello world</p>',
    position: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-15T00:00:00.000Z',
    ...overrides,
  }
}

function renderDropdown(props: Partial<React.ComponentProps<typeof SearchDropdown>> = {}) {
  const defaultProps: React.ComponentProps<typeof SearchDropdown> = {
    open: true,
    query: 'test',
    results: [],
    onSelect: vi.fn(),
    onClose: vi.fn(),
    ...props,
  }
  return render(<SearchDropdown {...defaultProps} />)
}

describe('SearchDropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows nothing when open is false', () => {
    const { container } = renderDropdown({ open: false })
    expect(container.innerHTML).toBe('')
  })

  it('shows nothing when query is empty', () => {
    const { container } = renderDropdown({ query: '' })
    expect(container.innerHTML).toBe('')
  })

  it('shows nothing when query is whitespace only', () => {
    const { container } = renderDropdown({ query: '   ' })
    expect(container.innerHTML).toBe('')
  })

  it('shows "X notes found" header with results', () => {
    const results = [createNote()]
    renderDropdown({ results })
    expect(screen.getByText('1 note found')).toBeInTheDocument()
  })

  it('shows "X notes found" header with multiple results', () => {
    const results = [
      createNote({ _id: '1', title: 'One' }),
      createNote({ _id: '2', title: 'Two' }),
    ]
    renderDropdown({ results })
    expect(screen.getByText('2 notes found')).toBeInTheDocument()
  })

  it('shows "No notes match your search" when query has no matches', () => {
    renderDropdown({ results: [] })
    expect(screen.getByText('No notes match your search.')).toBeInTheDocument()
  })

  it('renders result items with title and content preview', () => {
    const results = [createNote({ title: 'My Note', content: '<p>My content</p>' })]
    renderDropdown({ results })
    expect(screen.getByText('My Note')).toBeInTheDocument()
    expect(screen.getByText('My content')).toBeInTheDocument()
  })

  it('calls onSelect when a result is clicked', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const onClose = vi.fn()
    const results = [createNote({ _id: 'note-1' })]
    renderDropdown({ results, onSelect, onClose })

    const item = screen.getByTestId('command-item')
    await user.click(item)

    expect(onSelect).toHaveBeenCalledWith('note-1')
    expect(onClose).toHaveBeenCalled()
  })

  it('respects maxItems prop', () => {
    const results = Array.from({ length: 10 }, (_, i) => createNote({ _id: `note-${i}`, title: `Note ${i}` }))
    renderDropdown({ results, maxItems: 3 })
    const items = screen.getAllByTestId('command-item')
    expect(items).toHaveLength(3)
  })

  it('renders with sidebar variant without error', () => {
    const results = [createNote()]
    renderDropdown({ variant: 'sidebar', results })
    expect(screen.getByText('1 note found')).toBeInTheDocument()
    expect(screen.getByText('Hello world')).toBeInTheDocument()
  })

  it('shows "Untitled" when note has no title', () => {
    const results = [createNote({ title: '' })]
    renderDropdown({ results })
    expect(screen.getByText('Untitled')).toBeInTheDocument()
  })

  it('shows "No content" when note has no content', () => {
    const results = [createNote({ content: '' })]
    renderDropdown({ results })
    expect(screen.getByText('No content')).toBeInTheDocument()
  })
})
