import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import EmptyTrashDialog from '@/components/EmptyTrashDialog'

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) =>
    <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) =>
    <div data-testid="dialog-title">{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) =>
    <div data-testid="dialog-description">{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant }: { children: React.ReactNode; onClick?: () => void; variant?: string }) => (
    <button onClick={onClick} data-variant={variant}>{children}</button>
  ),
}))

describe('EmptyTrashDialog', () => {
  it('renders with title "Empty Trash"', () => {
    render(<EmptyTrashDialog open={true} noteCount={2} folderCount={1} onConfirm={() => {}} onCancel={() => {}} />)
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('Empty Trash')
  })

  it('does not render when open is false', () => {
    render(<EmptyTrashDialog open={false} noteCount={2} folderCount={1} onConfirm={() => {}} onCancel={() => {}} />)
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
  })

  it('shows plural counts in description when multiple notes and folders', () => {
    render(<EmptyTrashDialog open={true} noteCount={3} folderCount={2} onConfirm={() => {}} onCancel={() => {}} />)
    expect(screen.getByTestId('dialog-description')).toHaveTextContent('3 notes')
    expect(screen.getByTestId('dialog-description')).toHaveTextContent('2 folders')
    expect(screen.getByTestId('dialog-description')).toHaveTextContent('cannot be undone')
  })

  it('uses singular "1 note" and "1 folder"', () => {
    render(<EmptyTrashDialog open={true} noteCount={1} folderCount={1} onConfirm={() => {}} onCancel={() => {}} />)
    expect(screen.getByTestId('dialog-description')).toHaveTextContent('1 note')
    expect(screen.getByTestId('dialog-description')).toHaveTextContent('1 folder')
  })

  it('omits folder part when folderCount is 0', () => {
    render(<EmptyTrashDialog open={true} noteCount={2} folderCount={0} onConfirm={() => {}} onCancel={() => {}} />)
    expect(screen.getByTestId('dialog-description')).toHaveTextContent('2 notes')
    expect(screen.getByTestId('dialog-description')).not.toHaveTextContent('folder')
  })

  it('omits note part when noteCount is 0', () => {
    render(<EmptyTrashDialog open={true} noteCount={0} folderCount={1} onConfirm={() => {}} onCancel={() => {}} />)
    expect(screen.getByTestId('dialog-description')).not.toHaveTextContent('note')
    expect(screen.getByTestId('dialog-description')).toHaveTextContent('1 folder')
  })

  it('has Cancel and "Empty Trash" buttons', () => {
    render(<EmptyTrashDialog open={true} noteCount={1} folderCount={0} onConfirm={() => {}} onCancel={() => {}} />)
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getAllByText('Empty Trash').length).toBeGreaterThanOrEqual(1)
  })

  it('calls onCancel when Cancel clicked', () => {
    const onCancel = vi.fn()
    render(<EmptyTrashDialog open={true} noteCount={1} folderCount={0} onConfirm={() => {}} onCancel={onCancel} />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('calls onConfirm when destructive button clicked', () => {
    const onConfirm = vi.fn()
    render(<EmptyTrashDialog open={true} noteCount={1} folderCount={0} onConfirm={onConfirm} onCancel={() => {}} />)
    // The dialog title is "Empty Trash"; the button inside is also "Empty Trash"
    // Click the button with data-variant="destructive"
    const actionButton = screen.getByRole('button', { name: /empty trash/i })
    fireEvent.click(actionButton)
    expect(onConfirm).toHaveBeenCalledOnce()
  })

})
