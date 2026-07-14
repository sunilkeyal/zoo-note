import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MobileNewFolder from '@/components/MobileNewFolder'

const existingFolders = ["Work", "Personal", "Ideas"]

describe('MobileNewFolder', () => {
  const mockOnBack = vi.fn()
  const mockOnCreate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders input and existing folders', () => {
    render(<MobileNewFolder existingFolders={existingFolders} onBack={mockOnBack} onCreate={mockOnCreate} />)
    expect(screen.getByPlaceholderText('e.g. Projects')).toBeInTheDocument()
    expect(screen.getByText('Work')).toBeInTheDocument()
    expect(screen.getByText('Personal')).toBeInTheDocument()
  })

  it('shows duplicate error', () => {
    render(<MobileNewFolder existingFolders={existingFolders} onBack={mockOnBack} onCreate={mockOnCreate} />)
    fireEvent.change(screen.getByPlaceholderText('e.g. Projects'), { target: { value: 'Work' } })
    expect(screen.getByText('A folder with this name already exists')).toBeInTheDocument()
  })

  it('calls onCreate with folder name', () => {
    render(<MobileNewFolder existingFolders={existingFolders} onBack={mockOnBack} onCreate={mockOnCreate} />)
    fireEvent.change(screen.getByPlaceholderText('e.g. Projects'), { target: { value: 'New Folder' } })
    fireEvent.click(screen.getByText('Create'))
    expect(mockOnCreate).toHaveBeenCalledWith('New Folder')
  })

  it('disables Create when input is empty', () => {
    render(<MobileNewFolder existingFolders={existingFolders} onBack={mockOnBack} onCreate={mockOnCreate} />)
    const createBtn = screen.getByText('Create')
    expect(createBtn.className).toContain('text-muted-foreground')
  })
})
