import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MobileImportExport from '@/components/MobileImportExport'

vi.mock('@/contexts/NoteContext', () => ({
  useNotes: () => ({
    fetchNotes: vi.fn(),
    fetchFolders: vi.fn(),
  }),
}))

vi.mock('@/contexts/ImportContext', () => ({
  useImport: () => ({
    job: {
      jobId: null,
      status: 'idle',
      filename: null,
      progress: null,
      result: null,
      error: null,
    },
    startImport: vi.fn(),
    cancelImport: vi.fn(),
    resetJob: vi.fn(),
  }),
}))

describe('MobileImportExport', () => {
  const mockOnBack = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders export and import sections', () => {
    render(<MobileImportExport onBack={mockOnBack} />)
    expect(screen.getByText('Export')).toBeInTheDocument()
    expect(screen.getByText('Import Notes')).toBeInTheDocument()
    expect(screen.getByText('Import from OneNote')).toBeInTheDocument()
  })

  it('calls onBack when back arrow is clicked', () => {
    render(<MobileImportExport onBack={mockOnBack} />)
    fireEvent.click(screen.getByText('\u2190'))
    expect(mockOnBack).toHaveBeenCalled()
  })

  it('renders export button', () => {
    render(<MobileImportExport onBack={mockOnBack} />)
    expect(screen.getByText('Export All Notes')).toBeInTheDocument()
  })
})
