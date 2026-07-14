import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MobileFolders from '@/components/MobileFolders'
import type { Note, Folder } from '@/types'

describe('MobileFolders', () => {
  const mockFolders: Folder[] = [
    { _id: 'f1', name: 'Work', userId: 'u1', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
    { _id: 'f2', name: 'Personal', userId: 'u1', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  ]

  const mockNotes: Note[] = [
    { _id: 'n1', title: 'Note 1', content: '', folderId: 'f1', isFavorite: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', userId: 'u1' },
    { _id: 'n2', title: 'Note 2', content: '', folderId: 'f1', isFavorite: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', userId: 'u1' },
    { _id: 'n3', title: 'Note 3', content: '', folderId: 'f2', isFavorite: false, createdAt: '2024-01-01', updatedAt: '2024-01-01', userId: 'u1' },
  ]

  const mockOnFolderClick = vi.fn()
  const mockOnNewFolder = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all folders', () => {
    render(<MobileFolders folders={mockFolders} notes={mockNotes} onFolderClick={mockOnFolderClick} onNewFolder={mockOnNewFolder} />)
    expect(screen.getByText('Work')).toBeInTheDocument()
    expect(screen.getByText('Personal')).toBeInTheDocument()
  })

  it('displays correct note count per folder', () => {
    render(<MobileFolders folders={mockFolders} notes={mockNotes} onFolderClick={mockOnFolderClick} onNewFolder={mockOnNewFolder} />)
    const workCounts = screen.getAllByText('2')
    expect(workCounts.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('calls onFolderClick when a folder is clicked', () => {
    render(<MobileFolders folders={mockFolders} notes={mockNotes} onFolderClick={mockOnFolderClick} onNewFolder={mockOnNewFolder} />)
    fireEvent.click(screen.getByText('Work'))
    expect(mockOnFolderClick).toHaveBeenCalledWith(mockFolders[0])
  })

  it('calls onNewFolder when new folder button is clicked', () => {
    render(<MobileFolders folders={mockFolders} notes={mockNotes} onFolderClick={mockOnFolderClick} onNewFolder={mockOnNewFolder} />)
    fireEvent.click(screen.getByText('+ New Folder'))
    expect(mockOnNewFolder).toHaveBeenCalled()
  })

  it('shows zero notes for empty folders', () => {
    const emptyFolders: Folder[] = [{ _id: 'f3', name: 'Archive', userId: 'u1', createdAt: '2024-01-01', updatedAt: '2024-01-01' }]
    render(<MobileFolders folders={emptyFolders} notes={[]} onFolderClick={mockOnFolderClick} onNewFolder={mockOnNewFolder} />)
    expect(screen.getByText('Archive')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
  })
})
