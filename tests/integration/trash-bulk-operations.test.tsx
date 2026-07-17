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
const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()
vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}))

describe('Trash Bulk Operations Integration', () => {
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

  it('successfully restores all items and shows success toast', async () => {
    mockRestoreItems.mockResolvedValue({ success: true })
    mockUseNotes.mockReturnValue({
      trashItems: {
        notes: [{ _id: '1', title: 'Note 1' }, { _id: '2', title: 'Note 2' }],
        folders: [{ _id: '3', name: 'Folder 1' }],
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
      expect(mockRestoreItems).toHaveBeenCalledWith(['1', '2'], ['3'])
      expect(mockToastSuccess).toHaveBeenCalledWith('All items restored', {
        description: 'Restored 2 notes and 1 folder.',
      })
    })
  })

  it('shows error toast when restore fails', async () => {
    mockRestoreItems.mockResolvedValue({ success: false, error: 'Restore failed' })
    mockUseNotes.mockReturnValue({
      trashItems: {
        notes: [{ _id: '1', title: 'Note 1' }],
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
      expect(mockToastError).toHaveBeenCalledWith('Restore failed', {
        description: 'Restore failed',
      })
    })
  })

  it('shows network error toast when restore throws', async () => {
    mockRestoreItems.mockRejectedValue(new Error('Network error'))
    mockUseNotes.mockReturnValue({
      trashItems: {
        notes: [{ _id: '1', title: 'Note 1' }],
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
      expect(mockToastError).toHaveBeenCalledWith('Network error', {
        description: 'Please check your connection and try again.',
      })
    })
  })

  it('successfully empties trash and shows success toast', async () => {
    mockPermanentDeleteItems.mockResolvedValue({ success: true })
    mockUseNotes.mockReturnValue({
      trashItems: {
        notes: [{ _id: '1', title: 'Note 1' }],
        folders: [{ _id: '2', name: 'Folder 1' }],
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
      expect(mockToastSuccess).toHaveBeenCalledWith('Trash emptied', {
        description: 'Permanently deleted 1 note and 1 folder.',
      })
    })
  })

  it('shows error toast when empty trash fails', async () => {
    mockPermanentDeleteItems.mockResolvedValue({ success: false, error: 'Delete failed' })
    mockUseNotes.mockReturnValue({
      trashItems: {
        notes: [{ _id: '1', title: 'Note 1' }],
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
      fireEvent.click(screen.getByText('Empty Trash'))
      fireEvent.click(screen.getByTestId('confirm-btn'))
      expect(mockToastError).toHaveBeenCalledWith('Delete failed', {
        description: 'Delete failed',
      })
    })
  })

  it('shows network error toast when empty trash throws', async () => {
    mockPermanentDeleteItems.mockRejectedValue(new Error('Network error'))
    mockUseNotes.mockReturnValue({
      trashItems: {
        notes: [{ _id: '1', title: 'Note 1' }],
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
      fireEvent.click(screen.getByText('Empty Trash'))
      fireEvent.click(screen.getByTestId('confirm-btn'))
      expect(mockToastError).toHaveBeenCalledWith('Network error', {
        description: 'Please check your connection and try again.',
      })
    })
  })

  it('closes dialog after successful empty trash', async () => {
    mockPermanentDeleteItems.mockResolvedValue({ success: true })
    mockUseNotes.mockReturnValue({
      trashItems: {
        notes: [{ _id: '1', title: 'Note 1' }],
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
      fireEvent.click(screen.getByText('Empty Trash'))
      expect(screen.getByTestId('empty-trash-dialog')).toBeInTheDocument()
      fireEvent.click(screen.getByTestId('confirm-btn'))
      expect(screen.queryByTestId('empty-trash-dialog')).not.toBeInTheDocument()
    })
  })

  it('handles partial success with singular forms', async () => {
    mockRestoreItems.mockResolvedValue({ success: true })
    mockUseNotes.mockReturnValue({
      trashItems: {
        notes: [{ _id: '1', title: 'Note 1' }],
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
      expect(mockToastSuccess).toHaveBeenCalledWith('All items restored', {
        description: 'Restored 1 note and 0 folders.',
      })
    })
  })
})