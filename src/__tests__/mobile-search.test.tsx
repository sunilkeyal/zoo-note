import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MobileSearch from '@/components/MobileSearch'

const mockNotes = [
  { _id: "1", title: "React Hooks", content: "<p>useState, useEffect</p>", folderId: "f1", folderName: "Work", position: 0, createdAt: "2026-07-14T10:00:00Z", updatedAt: "2026-07-14T12:00:00Z" },
  { _id: "2", title: "Recipe", content: "<p>Pasta with garlic</p>", folderId: "f2", folderName: "Personal", position: 1, createdAt: "2026-07-13T10:00:00Z", updatedAt: "2026-07-13T10:00:00Z" },
]

describe('MobileSearch', () => {
  const mockOnBack = vi.fn()
  const mockOnNoteClick = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders search input and back button', () => {
    render(<MobileSearch notes={mockNotes} onBack={mockOnBack} onNoteClick={mockOnNoteClick} />)
    expect(screen.getByPlaceholderText('Search notes...')).toBeInTheDocument()
    expect(screen.getByText('←')).toBeInTheDocument()
  })

  it('calls onBack when back arrow is clicked', () => {
    render(<MobileSearch notes={mockNotes} onBack={mockOnBack} onNoteClick={mockOnNoteClick} />)
    fireEvent.click(screen.getByText('←'))
    expect(mockOnBack).toHaveBeenCalled()
  })

  it('shows empty state when no query', () => {
    render(<MobileSearch notes={mockNotes} onBack={mockOnBack} onNoteClick={mockOnNoteClick} />)
    expect(screen.getByText('Type to search across all notes')).toBeInTheDocument()
  })

  it('filters notes by title', () => {
    render(<MobileSearch notes={mockNotes} onBack={mockOnBack} onNoteClick={mockOnNoteClick} />)
    fireEvent.change(screen.getByPlaceholderText('Search notes...'), { target: { value: 'React' } })
    expect(screen.getByText('React Hooks')).toBeInTheDocument()
    expect(screen.queryByText('Recipe')).not.toBeInTheDocument()
  })

  it('filters notes by content', () => {
    render(<MobileSearch notes={mockNotes} onBack={mockOnBack} onNoteClick={mockOnNoteClick} />)
    fireEvent.change(screen.getByPlaceholderText('Search notes...'), { target: { value: 'garlic' } })
    expect(screen.getByText('Recipe')).toBeInTheDocument()
    expect(screen.queryByText('React Hooks')).not.toBeInTheDocument()
  })

  it('shows no results message', () => {
    render(<MobileSearch notes={mockNotes} onBack={mockOnBack} onNoteClick={mockOnNoteClick} />)
    fireEvent.change(screen.getByPlaceholderText('Search notes...'), { target: { value: 'xyz' } })
    expect(screen.getByText(/No results for/)).toBeInTheDocument()
  })
})
