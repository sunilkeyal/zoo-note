import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MobileNewNote from '@/components/MobileNewNote'

const mockFolders = [
  { _id: "f1", name: "Work", position: 0, createdAt: "2026-07-01T00:00:00Z", updatedAt: "2026-07-01T00:00:00Z" },
  { _id: "f2", name: "Personal", position: 1, createdAt: "2026-07-01T00:00:00Z", updatedAt: "2026-07-01T00:00:00Z" },
]

describe('MobileNewNote', () => {
  const mockOnBack = vi.fn()
  const mockOnSave = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders title input, folder chips, and save button', () => {
    render(<MobileNewNote folders={mockFolders} onBack={mockOnBack} onSave={mockOnSave} />)
    expect(screen.getByPlaceholderText('Note title')).toBeInTheDocument()
    expect(screen.getByText('Work')).toBeInTheDocument()
    expect(screen.getByText('Personal')).toBeInTheDocument()
    expect(screen.getByText('Save')).toBeInTheDocument()
  })

  it('calls onBack when back arrow is clicked', () => {
    render(<MobileNewNote folders={mockFolders} onBack={mockOnBack} onSave={mockOnSave} />)
    fireEvent.click(screen.getByText('←'))
    expect(mockOnBack).toHaveBeenCalled()
  })

  it('selects a folder chip', () => {
    render(<MobileNewNote folders={mockFolders} onBack={mockOnBack} onSave={mockOnSave} />)
    fireEvent.click(screen.getByText('Work'))
    expect(screen.getByText('Work').closest('div')?.className).toContain('bg-primary')
  })

  it('calls onSave with title and folderId', () => {
    render(<MobileNewNote folders={mockFolders} onBack={mockOnBack} onSave={mockOnSave} />)
    fireEvent.change(screen.getByPlaceholderText('Note title'), { target: { value: 'My New Note' } })
    fireEvent.click(screen.getByText('Work'))
    fireEvent.click(screen.getByText('Save'))
    expect(mockOnSave).toHaveBeenCalledWith({ title: 'My New Note', folderId: 'f1' })
  })
})
