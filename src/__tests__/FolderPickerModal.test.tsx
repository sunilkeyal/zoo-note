import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FolderPickerModal from '@/components/FolderPickerModal'

const mockFolders = [
  { _id: "f1", name: "Work", position: 0, createdAt: "2026-07-01T00:00:00Z", updatedAt: "2026-07-01T00:00:00Z" },
  { _id: "f2", name: "Personal", position: 1, createdAt: "2026-07-01T00:00:00Z", updatedAt: "2026-07-01T00:00:00Z" },
]

describe('FolderPickerModal', () => {
  const mockOnOpenChange = vi.fn()
  const mockOnSelect = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders when open', () => {
    render(<FolderPickerModal open={true} onOpenChange={mockOnOpenChange} folders={mockFolders} onSelect={mockOnSelect} />)
    expect(screen.getByText('Select Folder')).toBeInTheDocument()
    expect(screen.getByText('No folder (root)')).toBeInTheDocument()
    expect(screen.getByText('Work')).toBeInTheDocument()
    expect(screen.getByText('Personal')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<FolderPickerModal open={false} onOpenChange={mockOnOpenChange} folders={mockFolders} onSelect={mockOnSelect} />)
    expect(screen.queryByText('Select Folder')).not.toBeInTheDocument()
  })

  it('shows no folders message when folders array is empty', () => {
    render(<FolderPickerModal open={true} onOpenChange={mockOnOpenChange} folders={[]} onSelect={mockOnSelect} />)
    expect(screen.getByText('No folders available. Create a folder first to organize your notes.')).toBeInTheDocument()
  })

  it('selects a folder when clicked', () => {
    render(<FolderPickerModal open={true} onOpenChange={mockOnOpenChange} folders={mockFolders} onSelect={mockOnSelect} />)
    fireEvent.click(screen.getByText('Work'))
    fireEvent.click(screen.getByText('Confirm'))
    expect(mockOnSelect).toHaveBeenCalledWith('f1')
  })

  it('selects root when "No folder" is clicked', () => {
    render(<FolderPickerModal open={true} onOpenChange={mockOnOpenChange} folders={mockFolders} onSelect={mockOnSelect} />)
    fireEvent.click(screen.getByText('No folder (root)'))
    fireEvent.click(screen.getByText('Confirm'))
    expect(mockOnSelect).toHaveBeenCalledWith(null)
  })

  it('calls onOpenChange(false) when Cancel is clicked', () => {
    render(<FolderPickerModal open={true} onOpenChange={mockOnOpenChange} folders={mockFolders} onSelect={mockOnSelect} />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('calls onOpenChange(false) when Confirm is clicked', () => {
    render(<FolderPickerModal open={true} onOpenChange={mockOnOpenChange} folders={mockFolders} onSelect={mockOnSelect} />)
    fireEvent.click(screen.getByText('Confirm'))
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })
})
