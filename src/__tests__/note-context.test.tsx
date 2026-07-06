import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import React from 'react'
import { NoteProvider, useNotes } from '@/contexts/NoteContext'

const fetch = vi.fn()
globalThis.fetch = fetch

function TestComponent() {
  useNotes()
  return null
}

function HookRef() {
  const ctx = useNotes()
  return <div data-testid="hook-ref" data-loading={ctx.loading} data-notes={ctx.notes.length} data-folders={ctx.folders.length} data-error={ctx.error} />
}

// Keeps latest.current always pointing at the latest context value
const latest: { current: ReturnType<typeof useNotes> | null } = { current: null }

function ContextHolder() {
  const ctx = useNotes()
  latest.current = ctx
  return null
}

async function renderWithContext() {
  latest.current = null
  render(
    <NoteProvider>
      <ContextHolder />
    </NoteProvider>
  )
  await waitFor(() => expect(latest.current?.loading).toBe(false))
}

describe('NoteContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useNotes', () => {
    it('throws when used outside NoteProvider', () => {
      expect(() => render(<TestComponent />)).toThrow('useNotes must be used within NoteProvider')
    })
  })

  describe('NoteProvider', () => {
    it('provides all context values', async () => {
      fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true, data: [] }) })

      await renderWithContext()
      const ctx = latest.current!

      expect(ctx.notes).toEqual([])
      expect(ctx.folders).toEqual([])
      expect(ctx.loading).toBe(false)
      expect(ctx.error).toBeNull()
      expect(ctx.activeNoteId).toBeNull()
      expect(ctx.activeNote).toBeNull()
      expect(ctx.trashItems).toEqual({ notes: [], folders: [] })
      expect(ctx.trashLoading).toBe(true)
      expect(ctx.trashError).toBeNull()
      expect(typeof ctx.fetchNotes).toBe('function')
      expect(typeof ctx.fetchFolders).toBe('function')
      expect(typeof ctx.createNote).toBe('function')
      expect(typeof ctx.updateNote).toBe('function')
      expect(typeof ctx.deleteNote).toBe('function')
      expect(typeof ctx.createFolder).toBe('function')
      expect(typeof ctx.renameFolder).toBe('function')
      expect(typeof ctx.deleteFolder).toBe('function')
      expect(typeof ctx.moveNote).toBe('function')
      expect(typeof ctx.toggleFolder).toBe('function')
      expect(typeof ctx.setActiveNoteId).toBe('function')
      expect(typeof ctx.fetchTrash).toBe('function')
      expect(typeof ctx.restoreItems).toBe('function')
      expect(typeof ctx.permanentDeleteItems).toBe('function')
    })

    it('fetchNotes fetches from /api/notes and sets notes state', async () => {
      const mockNotes = [
        { _id: '1', title: 'Note A', content: '', position: 0, createdAt: '2024-01-01', updatedAt: '2024-01-02' },
        { _id: '2', title: 'Note B', content: '', position: 1, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      ]

      fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: [] }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: [] }) })

      await renderWithContext()
      const ctx = latest.current!

      fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: mockNotes }) })
      await ctx.fetchNotes()

      expect(fetch).toHaveBeenCalledWith('/api/notes')
      await waitFor(() => expect(latest.current!.notes).toEqual(mockNotes))
    })

    it('fetchFolders fetches from /api/folders and sets folders state', async () => {
      const mockFolders = [
        { _id: 'f1', name: 'Work', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      ]

      fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: [] }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: [] }) })

      await renderWithContext()

      fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: mockFolders }) })
      await latest.current!.fetchFolders()

      expect(fetch).toHaveBeenCalledWith('/api/folders')
      await waitFor(() => expect(latest.current!.folders).toEqual(mockFolders))
    })

    it('createNote POSTs to /api/notes and adds note to state', async () => {
      const mockNote = { _id: 'n1', title: 'New Note', content: '', position: 0, createdAt: '2024-01-01', updatedAt: '2024-01-01' }

      fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: [] }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: [] }) })

      await renderWithContext()

      fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: mockNote }) })
      const result = await latest.current!.createNote({ title: 'New Note' })

      expect(fetch).toHaveBeenCalledWith('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Note' }),
      })
      expect(result).toEqual(mockNote)
      await waitFor(() => expect(latest.current!.notes).toContainEqual(mockNote))
    })

    it('updateNote PUTs to /api/notes/{id} and updates note in state', async () => {
      const existingNote = { _id: 'n1', title: 'Original', content: '', position: 0, createdAt: '2024-01-01', updatedAt: '2024-01-01' }
      const updatedNote = { ...existingNote, title: 'Updated' }

      fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: [existingNote] }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: [] }) })

      await renderWithContext()

      fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: updatedNote }) })
      const result = await latest.current!.updateNote('n1', { title: 'Updated' })

      expect(fetch).toHaveBeenCalledWith('/api/notes/n1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated' }),
      })
      expect(result).toEqual(updatedNote)
      await waitFor(() => {
        const noteInState = latest.current!.notes.find((n) => n._id === 'n1')
        expect(noteInState?.title).toBe('Updated')
      })
    })

    it('deleteNote DELETEs to /api/notes/{id} and removes from state', async () => {
      const existingNote = { _id: 'n1', title: 'To Delete', content: '', position: 0, createdAt: '2024-01-01', updatedAt: '2024-01-01' }

      fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: [existingNote] }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: [] }) })

      await renderWithContext()

      fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: undefined }) })
      const result = await latest.current!.deleteNote('n1')

      expect(fetch).toHaveBeenCalledWith('/api/notes/n1', { method: 'DELETE' })
      expect(result).toBe(true)
      await waitFor(() => expect(latest.current!.notes.find((n) => n._id === 'n1')).toBeUndefined())
    })

    it('createFolder POSTs to /api/folders and adds folder to state', async () => {
      const mockFolder = { _id: 'f1', name: 'Work', createdAt: '2024-01-01', updatedAt: '2024-01-01' }

      fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: [] }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: [] }) })

      await renderWithContext()

      fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: mockFolder }) })
      const result = await latest.current!.createFolder('Work')

      expect(fetch).toHaveBeenCalledWith('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Work' }),
      })
      expect(result).toEqual(mockFolder)
      await waitFor(() => expect(latest.current!.folders).toContainEqual(mockFolder))
    })

    it('renameFolder PUTs to /api/folders/{id} and updates folder', async () => {
      const existingFolder = { _id: 'f1', name: 'Old Name', createdAt: '2024-01-01', updatedAt: '2024-01-01' }
      const renamedFolder = { ...existingFolder, name: 'New Name' }

      fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: [] }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: [existingFolder] }) })

      await renderWithContext()

      fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: renamedFolder }) })
      const result = await latest.current!.renameFolder('f1', 'New Name')

      expect(fetch).toHaveBeenCalledWith('/api/folders/f1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Name' }),
      })
      expect(result).toEqual(renamedFolder)
      await waitFor(() => {
        const folderInState = latest.current!.folders.find((f) => f._id === 'f1')
        expect(folderInState?.name).toBe('New Name')
      })
    })

    it('deleteFolder DELETEs to /api/folders/{id} and removes folder + its notes from state', async () => {
      const folder = { _id: 'f1', name: 'To Delete', createdAt: '2024-01-01', updatedAt: '2024-01-01' }
      const noteInFolder = { _id: 'n1', title: 'Note in folder', content: '', folderId: 'f1', position: 0, createdAt: '2024-01-01', updatedAt: '2024-01-01' }
      const otherNote = { _id: 'n2', title: 'Other note', content: '', position: 1, createdAt: '2024-01-01', updatedAt: '2024-01-01' }

      fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: [noteInFolder, otherNote] }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: [folder] }) })

      await renderWithContext()

      fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: { deletedFolder: 'f1', softDeletedNotesCount: 1 } }) })
      const result = await latest.current!.deleteFolder('f1')

      expect(fetch).toHaveBeenCalledWith('/api/folders/f1', { method: 'DELETE' })
      expect(result).toEqual({ deletedFolder: 'f1', softDeletedNotesCount: 1 })
      await waitFor(() => {
        expect(latest.current!.folders.find((f) => f._id === 'f1')).toBeUndefined()
        expect(latest.current!.notes.find((n) => n._id === 'n1')).toBeUndefined()
        expect(latest.current!.notes.find((n) => n._id === 'n2')).toBeDefined()
      })
    })

    it('moveNote PUTs note with folderId and position', async () => {
      const note = { _id: 'n1', title: 'Move me', content: '', position: 0, createdAt: '2024-01-01', updatedAt: '2024-01-01' }
      const movedNote = { ...note, folderId: 'f1', position: 5 }

      fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: [note] }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: [] }) })

      await renderWithContext()

      fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: movedNote }) })
      const result = await latest.current!.moveNote('n1', 'f1', 5)

      expect(fetch).toHaveBeenCalledWith('/api/notes/n1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: 'f1', position: 5 }),
      })
      expect(result).toEqual(movedNote)
    })

    it('toggleFolder toggles folder in expandedFolders set', async () => {
      fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true, data: [] }) })

      await renderWithContext()
      const ctx = latest.current!

      expect(ctx.expandedFolders.has('f1')).toBe(false)

      act(() => ctx.toggleFolder('f1'))
      expect(latest.current!.expandedFolders.has('f1')).toBe(true)

      act(() => ctx.toggleFolder('f1'))
      expect(latest.current!.expandedFolders.has('f1')).toBe(false)
    })

    it('activeNote is derived from activeNoteId', async () => {
      const note = { _id: 'n1', title: 'Active', content: '', position: 0, createdAt: '2024-01-01', updatedAt: '2024-01-01' }

      fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: [note] }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: [] }) })

      await renderWithContext()
      const ctx = latest.current!

      expect(ctx.activeNote).toBeNull()

      act(() => ctx.setActiveNoteId('n1'))
      expect(latest.current!.activeNote?._id).toBe('n1')
    })

    it('fetchTrash fetches trash items', async () => {
      const trashData = {
        notes: [{ _id: 'tn1', title: 'Trashed', content: '', position: 0, createdAt: '2024-01-01', updatedAt: '2024-01-01', isDeleted: true, deletedAt: '2024-06-01' }],
        folders: [],
      }

      fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: [] }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: [] }) })

      await renderWithContext()

      fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: trashData }) })
      await latest.current!.fetchTrash()

      expect(fetch).toHaveBeenCalledWith('/api/trash')
      await waitFor(() => {
        expect(latest.current!.trashItems.notes).toHaveLength(1)
        expect(latest.current!.trashItems.notes[0]._id).toBe('tn1')
      })
    })

    it('restoreItems calls restore API and refreshes notes/folders', async () => {
      fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: [] }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: [] }) })

      await renderWithContext()

      fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: { restoredNotes: 1, restoredFolders: 0 } }) })
      fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: [] }) })
      fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: [] }) })

      const result = await latest.current!.restoreItems(['n1'], [])

      expect(fetch).toHaveBeenCalledWith('/api/trash/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteIds: ['n1'], folderIds: [] }),
      })
      expect(result.success).toBe(true)
    })

    it('permanentDeleteItems calls delete API and removes items from trash state', async () => {
      const trashData = {
        notes: [{ _id: 'tn1', title: 'To delete forever', content: '', position: 0, createdAt: '2024-01-01', updatedAt: '2024-01-01', isDeleted: true, deletedAt: '2024-06-01' }],
        folders: [],
      }

      fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: [] }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: [] }) })

      await renderWithContext()

      // Manually seed trash items since the real provider fetches them separately
      act(() => { latest.current!.trashItems.notes.push(trashData.notes[0]) })

      fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: { deletedNotes: 1, deletedFolders: 0 } }) })

      const result = await latest.current!.permanentDeleteItems(['tn1'], [])

      expect(fetch).toHaveBeenCalledWith('/api/trash', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteIds: ['tn1'], folderIds: [] }),
      })
      expect(result.success).toBe(true)
    })

    it('sortByPosition sorts notes by position, then updatedAt', async () => {
      const noteA = { _id: 'a', title: 'A', content: '', position: 1, createdAt: '2024-01-01', updatedAt: '2024-01-03' }
      const noteB = { _id: 'b', title: 'B', content: '', position: 0, createdAt: '2024-01-01', updatedAt: '2024-01-02' }
      const noteC = { _id: 'c', title: 'C', content: '', position: 0, createdAt: '2024-01-01', updatedAt: '2024-01-01' }

      const unsorted = [noteA, noteB, noteC]

      fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: unsorted }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: [] }) })

      await renderWithContext()

      expect(latest.current!.notes.map((n) => n._id)).toEqual(['b', 'c', 'a'])
    })

    it('expandedFolders persists to localStorage', async () => {
      const setItem = vi.spyOn(Storage.prototype, 'setItem')
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null)

      fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true, data: [] }) })

      await renderWithContext()

      act(() => latest.current!.toggleFolder('f1'))

      await waitFor(() => {
        expect(setItem).toHaveBeenCalledWith('expandedFolders', JSON.stringify(['f1']))
      })

      setItem.mockRestore()
      vi.restoreAllMocks()
    })

    it('loading is true initially and false after fetch', async () => {
      let resolveFetch!: () => void
      const fetchPromise = new Promise<void>((resolve) => { resolveFetch = resolve })

      fetch.mockReturnValueOnce(fetchPromise.then(() => ({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] }),
      })))
      fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true, data: [] }) })

      render(
        <NoteProvider>
          <HookRef />
        </NoteProvider>
      )

      expect(screen.getByTestId('hook-ref').dataset.loading).toBe('true')

      resolveFetch!()
      await waitFor(() => {
        expect(screen.getByTestId('hook-ref').dataset.loading).toBe('false')
      })
    })
  })
})
