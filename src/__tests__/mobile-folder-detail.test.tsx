import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MobileFolderDetail from '@/components/MobileFolderDetail'
import type { Note, Folder } from '@/types'

describe('MobileFolderDetail', () => {
  const mockFolder: Folder = { _id: 'f1', name: 'Work', userId: 'u1', createdAt: '2024-01-01', updatedAt: '2024-01-01' }

  const mockNotes: Note[] = [
    { _id: 'n1', title: 'Meeting Notes', content: 'Discussed roadmap', folderId: 'f1', isFavorite: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', userId: 'u1' },
    { _id: 'n2', title: 'Personal Todo', content: 'Buy groceries', folderId: 'f2', isFavorite: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', userId: 'u1' },
    { _id: 'n3', title: 'Project Plan', content: 'Q3 roadmap', folderId: 'f1', isFavorite: true, createdAt: '2024-01-01', updatedAt: '2024-01-01', userId: 'u1' },
  ]

  const mockOnBack = vi.fn()
  const mockOnNoteClick = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders folder name and note count', () => {
    render(<MobileFolderDetail folder={mockFolder} notes={mockNotes} onBack={mockOnBack} onNoteClick={mockOnNoteClick} />)
    expect(screen.getByText('Work')).toBeInTheDocument()
    expect(screen.getByText('2 notes')).toBeInTheDocument()
  })

  it('only shows notes in the folder', () => {
    render(<MobileFolderDetail folder={mockFolder} notes={mockNotes} onBack={mockOnBack} onNoteClick={mockOnNoteClick} />)
    expect(screen.getByText('Meeting Notes')).toBeInTheDocument()
    expect(screen.getByText('Project Plan')).toBeInTheDocument()
    expect(screen.queryByText('Personal Todo')).not.toBeInTheDocument()
  })

  it('calls onBack when back arrow is clicked', () => {
    render(<MobileFolderDetail folder={mockFolder} notes={mockNotes} onBack={mockOnBack} onNoteClick={mockOnNoteClick} />)
    fireEvent.click(screen.getByText('←'))
    expect(mockOnBack).toHaveBeenCalled()
  })

  it('calls onNoteClick when a note is clicked', () => {
    render(<MobileFolderDetail folder={mockFolder} notes={mockNotes} onBack={mockOnBack} onNoteClick={mockOnNoteClick} />)
    fireEvent.click(screen.getByText('Meeting Notes'))
    expect(mockOnNoteClick).toHaveBeenCalledWith(mockNotes[0])
  })

  it('shows empty state when folder has no notes', () => {
    render(<MobileFolderDetail folder={mockFolder} notes={[]} onBack={mockOnBack} onNoteClick={mockOnNoteClick} />)
    expect(screen.getByText('0 notes')).toBeInTheDocument()
    expect(screen.getByText('Welcome to ZooNote')).toBeInTheDocument()
  })
})
