import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import NoteCardGrid from '@/components/NoteCardGrid'

const mockNotes = [
  { _id: "1", title: "First Note", content: "<p>Content one</p>", folderId: "f1", folderName: "Work", position: 0, isFavorite: true, createdAt: "2026-07-14T10:00:00Z", updatedAt: "2026-07-14T12:00:00Z" },
  { _id: "2", title: "Second Note", content: "<p>Content two</p>", folderId: "f2", folderName: "Personal", position: 1, isFavorite: false, createdAt: "2026-07-13T10:00:00Z", updatedAt: "2026-07-13T10:00:00Z" },
  { _id: "3", title: "Third Note", content: "<p>Content three</p>", folderId: "f1", folderName: "Work", position: 2, isFavorite: true, createdAt: "2026-07-12T10:00:00Z", updatedAt: "2026-07-12T10:00:00Z" },
]

const mockFolders = [
  { _id: "f1", name: "Work", position: 0, createdAt: "2026-07-01T00:00:00Z", updatedAt: "2026-07-01T00:00:00Z" },
  { _id: "f2", name: "Personal", position: 1, createdAt: "2026-07-01T00:00:00Z", updatedAt: "2026-07-01T00:00:00Z" },
]

describe('NoteCardGrid', () => {
  const mockOnNoteClick = vi.fn()
  const mockOnNewFolder = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders folder filter chips', () => {
    render(<NoteCardGrid notes={mockNotes} folders={mockFolders} onNoteClick={mockOnNoteClick} onNewFolder={mockOnNewFolder} />)
    expect(screen.getByText('All Notes')).toBeInTheDocument()
    expect(screen.getByText('Work')).toBeInTheDocument()
    expect(screen.getByText('Personal')).toBeInTheDocument()
  })

  it('renders all notes when All Notes is selected', () => {
    render(<NoteCardGrid notes={mockNotes} folders={mockFolders} onNoteClick={mockOnNoteClick} onNewFolder={mockOnNewFolder} />)
    expect(screen.getByText('First Note')).toBeInTheDocument()
    expect(screen.getByText('Second Note')).toBeInTheDocument()
    expect(screen.getByText('Third Note')).toBeInTheDocument()
  })

  it('filters notes when a folder is selected', () => {
    render(<NoteCardGrid notes={mockNotes} folders={mockFolders} onNoteClick={mockOnNoteClick} onNewFolder={mockOnNewFolder} />)
    fireEvent.click(screen.getByText('Work'))
    expect(screen.getByText('First Note')).toBeInTheDocument()
    expect(screen.getByText('Third Note')).toBeInTheDocument()
    expect(screen.queryByText('Second Note')).not.toBeInTheDocument()
  })

  it('shows star on favorite notes', () => {
    render(<NoteCardGrid notes={mockNotes} folders={mockFolders} onNoteClick={mockOnNoteClick} onNewFolder={mockOnNewFolder} />)
    const stars = screen.getAllByText('★')
    expect(stars.length).toBe(2)
  })

  it('calls onNoteClick when a card is clicked', () => {
    render(<NoteCardGrid notes={mockNotes} folders={mockFolders} onNoteClick={mockOnNoteClick} onNewFolder={mockOnNewFolder} />)
    fireEvent.click(screen.getByText('First Note'))
    expect(mockOnNoteClick).toHaveBeenCalledWith(mockNotes[0])
  })

  it('shows word count in footer', () => {
    render(<NoteCardGrid notes={mockNotes} folders={mockFolders} onNoteClick={mockOnNoteClick} onNewFolder={mockOnNewFolder} />)
    const wordCounts = screen.getAllByText(/words/)
    expect(wordCounts.length).toBeGreaterThan(0)
  })

  it('renders empty state when no notes', () => {
    render(<NoteCardGrid notes={[]} folders={mockFolders} onNoteClick={mockOnNoteClick} onNewFolder={mockOnNewFolder} />)
    expect(screen.getByText('No notes yet')).toBeInTheDocument()
  })
})
