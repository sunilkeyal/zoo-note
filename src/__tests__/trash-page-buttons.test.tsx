import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import TrashPage from '@/app/trash/page'

// Mock the NoteContext
const mockUseNotes = vi.fn()
vi.mock('@/contexts/NoteContext', () => ({
  useNotes: () => mockUseNotes(),
}))

// Mock the TrashTable component
vi.mock('@/components/TrashTable', () => ({
  default: ({ items, loading, error, onRestore, onPermanentDelete, onRetry }: any) => (
    <div data-testid="trash-table">
      <div data-testid="items-count">{items.length}</div>
      <div data-testid="loading">{loading ? 'loading' : 'loaded'}</div>
      {error && <div data-testid="error">{error}</div>}
    </div>
  ),
}))

// Mock the EmptyTrashDialog component
vi.mock('@/components/EmptyTrashDialog', () => ({
  default: ({ open, noteCount, folderCount, onConfirm, onCancel }: any) => (
    open ? (
      <div data-testid="empty-trash-dialog">
        <div data-testid="note-count">{noteCount}</div>
        <div data-testid="folder-count">{folderCount}</div>
        <button data-testid="confirm-btn" onClick={onConfirm}>Confirm</button>
        <button data-testid="cancel-btn" onClick={onCancel}>Cancel</button>
      </div>
    ) : null
  ),
}))

// Mock the Button component
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, 'aria-label': ariaLabel, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </button>
  ),
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('TrashPage Buttons', () => {
  const mockFetchTrash = vi.fn()
  const mockRestoreItems = vi.fn()
  const mockPermanentDeleteItems = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseNotes.mockReturnValue({
      trashItems: { notes: [], folders: [] },
      trashLoading: false,
      trashError: null,
      fetchTrash: mockFetchTrash,
      restoreItems: mockRestoreItems,
      permanentDeleteItems: mockPermanentDeleteItems,
    })
    mockFetchTrash.mockResolvedValue(undefined)
  })

  it('renders "Restore All" and "Empty Trash" buttons', async () => {
    render(<TrashPage />)
    await waitFor(() => {
      expect(screen.getByText('Restore All')).toBeInTheDocument()
      expect(screen.getByText('Empty Trash')).toBeInTheDocument()
    })
  })

  it('disables buttons when trash is empty', async () => {
    render(<TrashPage />)
    await waitFor(() => {
      expect(screen.getByText('Restore All')).toBeDisabled()
      expect(screen.getByText('Empty Trash')).toBeDisabled()
    })
  })

  it('enables buttons when trash has items', async () => {
    mockUseNotes.mockReturnValue({
      trashItems: {
        notes: [{ _id: '1', title: 'Test Note' }],
        folders: [{ _id: '2', name: 'Test Folder' }],
      },
      trashLoading: false,
      trashError: null,
      fetchTrash: mockFetchTrash,
      restoreItems: mockRestoreItems,
      permanentDeleteItems: mockPermanentDeleteItems,
    })

    render(<TrashPage />)
    await waitFor(() => {
      expect(screen.getByText('Restore All')).not.toBeDisabled()
      expect(screen.getByText('Empty Trash')).not.toBeDisabled()
    })
  })

  it('opens EmptyTrashDialog when "Empty Trash" is clicked', async () => {
    mockUseNotes.mockReturnValue({
      trashItems: {
        notes: [{ _id: '1', title: 'Test Note' }],
        folders: [{ _id: '2', name: 'Test Folder' }],
      },
      trashLoading: false,
      trashError: null,
      fetchTrash: mockFetchTrash,
      restoreItems: mockRestoreItems,
      permanentDeleteItems: mockPermanentDeleteItems,
    })

    render(<TrashPage />)
    await waitFor(() => {
      fireEvent.click(screen.getByText('Empty Trash'))
      expect(screen.getByTestId('empty-trash-dialog')).toBeInTheDocument()
    })
  })

  it('calls restoreItems when "Restore All" is clicked', async () => {
    mockRestoreItems.mockResolvedValue({ success: true })
    mockUseNotes.mockReturnValue({
      trashItems: {
        notes: [{ _id: '1', title: 'Test Note' }],
        folders: [{ _id: '2', name: 'Test Folder' }],
      },
      trashLoading: false,
      trashError: null,
      fetchTrash: mockFetchTrash,
      restoreItems: mockRestoreItems,
      permanentDeleteItems: mockPermanentDeleteItems,
    })

    render(<TrashPage />)
    await waitFor(() => {
      fireEvent.click(screen.getByText('Restore All'))
      expect(mockRestoreItems).toHaveBeenCalledWith(['1'], ['2'])
    })
  })

  it('calls permanentDeleteItems when "Empty Trash" is confirmed', async () => {
    mockPermanentDeleteItems.mockResolvedValue({ success: true })
    mockUseNotes.mockReturnValue({
      trashItems: {
        notes: [{ _id: '1', title: 'Test Note' }],
        folders: [{ _id: '2', name: 'Test Folder' }],
      },
      trashLoading: false,
      trashError: null,
      fetchTrash: mockFetchTrash,
      restoreItems: mockRestoreItems,
      permanentDeleteItems: mockPermanentDeleteItems,
    })

    render(<TrashPage />)
    await waitFor(() => {
      fireEvent.click(screen.getByText('Empty Trash'))
      fireEvent.click(screen.getByTestId('confirm-btn'))
      expect(mockPermanentDeleteItems).toHaveBeenCalledWith(['1'], ['2'])
    })
  })

  it('disables buttons during operation', async () => {
    mockRestoreItems.mockImplementation(() => new Promise(() => {})) // Never resolves
    mockUseNotes.mockReturnValue({
      trashItems: {
        notes: [{ _id: '1', title: 'Test Note' }],
        folders: [],
      },
      trashLoading: false,
      trashError: null,
      fetchTrash: mockFetchTrash,
      restoreItems: mockRestoreItems,
      permanentDeleteItems: mockPermanentDeleteItems,
    })

    render(<TrashPage />)
    await waitFor(() => {
      fireEvent.click(screen.getByText('Restore All'))
      expect(screen.getByText('Restore All')).toBeDisabled()
      expect(screen.getByText('Empty Trash')).toBeDisabled()
    })
  })

  it('has correct aria-labels for buttons', async () => {
    render(<TrashPage />)
    await waitFor(() => {
      expect(screen.getByLabelText('Restore all items from trash')).toBeInTheDocument()
      expect(screen.getByLabelText('Empty trash permanently')).toBeInTheDocument()
    })
  })
})