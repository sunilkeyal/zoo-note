import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import React from 'react'

vi.mock('@tiptap/react', () => {
  const mockEditor = {
    isActive: vi.fn(() => false),
    chain: vi.fn(() => ({
      focus: vi.fn(() => ({
        toggleBold: vi.fn(() => ({ run: vi.fn() })),
        toggleItalic: vi.fn(() => ({ run: vi.fn() })),
        toggleUnderline: vi.fn(() => ({ run: vi.fn() })),
        toggleStrike: vi.fn(() => ({ run: vi.fn() })),
        toggleBulletList: vi.fn(() => ({ run: vi.fn() })),
        toggleOrderedList: vi.fn(() => ({ run: vi.fn() })),
        toggleTaskList: vi.fn(() => ({ run: vi.fn() })),
        setColor: vi.fn(() => ({ run: vi.fn() })),
        unsetColor: vi.fn(() => ({ run: vi.fn() })),
        toggleHighlight: vi.fn(() => ({ run: vi.fn() })),
        unsetHighlight: vi.fn(() => ({ run: vi.fn() })),
        setParagraphSpacing: vi.fn(() => ({ run: vi.fn() })),
        setParagraph: vi.fn(() => ({
          unsetFontSize: vi.fn(() => ({
            toggleHeading: vi.fn(() => ({ run: vi.fn() })),
          })),
        })),
        unsetFontFamily: vi.fn(() => ({ run: vi.fn() })),
        setFontFamily: vi.fn(() => ({ run: vi.fn() })),
        setFontSize: vi.fn(() => ({ run: vi.fn() })),
        insertTable: vi.fn(() => ({ run: vi.fn() })),
        addRowBefore: vi.fn(() => ({ run: vi.fn() })),
        addRowAfter: vi.fn(() => ({ run: vi.fn() })),
        deleteRow: vi.fn(() => ({ run: vi.fn() })),
        addColumnBefore: vi.fn(() => ({ run: vi.fn() })),
        addColumnAfter: vi.fn(() => ({ run: vi.fn() })),
        deleteColumn: vi.fn(() => ({ run: vi.fn() })),
        toggleHeaderRow: vi.fn(() => ({ run: vi.fn() })),
        deleteTable: vi.fn(() => ({ run: vi.fn() })),
      })),
    })),
    getAttributes: vi.fn(() => ({})),
    getHTML: vi.fn(() => '<p>test content</p>'),
    commands: { setContent: vi.fn() },
    state: {
      doc: {
        descendants: vi.fn((cb) => {
          cb({ isText: true, text: 'test content' }, 0)
          return true
        }),
      },
      tr: {
        addMark: vi.fn(),
      },
    },
    view: {
      dispatch: vi.fn(),
    },
    schema: {
      marks: {
        highlight: {
          create: vi.fn(() => ({})),
        },
      },
    },
    on: vi.fn(() => mockEditor),
    off: vi.fn(() => mockEditor),
  }
  return {
    useEditor: vi.fn(() => mockEditor),
    EditorContent: () => React.createElement('div', { 'data-testid': 'editor-content' }),
  }
})

vi.mock('@/contexts/NoteContext', () => ({
  useNotes: vi.fn(),
}))

vi.mock('lucide-react', () => ({
  Bold: (props: Record<string, unknown>) => React.createElement('svg', { 'data-testid': 'icon-Bold', ...props }),
  Italic: (props: Record<string, unknown>) => React.createElement('svg', { 'data-testid': 'icon-Italic', ...props }),
  Underline: (props: Record<string, unknown>) => React.createElement('svg', { 'data-testid': 'icon-Underline', ...props }),
  Strikethrough: (props: Record<string, unknown>) => React.createElement('svg', { 'data-testid': 'icon-Strikethrough', ...props }),
  Palette: (props: Record<string, unknown>) => React.createElement('svg', { 'data-testid': 'icon-Palette', ...props }),
  Highlighter: (props: Record<string, unknown>) => React.createElement('svg', { 'data-testid': 'icon-Highlighter', ...props }),
  ArrowUpDown: (props: Record<string, unknown>) => React.createElement('svg', { 'data-testid': 'icon-ArrowUpDown', ...props }),
  ChevronDown: (props: Record<string, unknown>) => React.createElement('svg', { 'data-testid': 'icon-ChevronDown', ...props }),
  ChevronDownIcon: (props: Record<string, unknown>) => React.createElement('svg', { 'data-testid': 'icon-ChevronDownIcon', ...props }),
  CheckIcon: (props: Record<string, unknown>) => React.createElement('svg', { 'data-testid': 'icon-CheckIcon', ...props }),
  ChevronUpIcon: (props: Record<string, unknown>) => React.createElement('svg', { 'data-testid': 'icon-ChevronUpIcon', ...props }),
  List: (props: Record<string, unknown>) => React.createElement('svg', { 'data-testid': 'icon-List', ...props }),
  ListOrdered: (props: Record<string, unknown>) => React.createElement('svg', { 'data-testid': 'icon-ListOrdered', ...props }),
  ListChecks: (props: Record<string, unknown>) => React.createElement('svg', { 'data-testid': 'icon-ListChecks', ...props }),
  Image: (props: Record<string, unknown>) => React.createElement('svg', { 'data-testid': 'icon-Image', ...props }),
  Table: (props: Record<string, unknown>) => React.createElement('svg', { 'data-testid': 'icon-Table', ...props }),
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}))

vi.mock('@/components/TableGridPicker', () => ({
  TableGridPicker: () => React.createElement('div', { 'data-testid': 'table-grid-picker' }),
}))
vi.mock('@/components/TableContextMenu', () => ({
  TableContextMenu: () => null,
}))

vi.mock('@/components/NoteEditor', () => ({
  default: () => React.createElement('div', { 'data-testid': 'note-editor' }),
}))

import MainArea from '@/components/MainArea'
import { useNotes } from '@/contexts/NoteContext'

function createActiveNote(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'note1',
    title: 'Test Note',
    content: '<p>Hello</p>',
    position: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-15T00:00:00.000Z',
    ...overrides,
  }
}

describe('MainArea', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useNotes).mockReturnValue({
      activeNote: null as ReturnType<typeof createActiveNote> | null,
      activeNoteId: null,
      updateNote: vi.fn(),
      createNote: vi.fn(),
    } as ReturnType<typeof vi.fn>)
  })

  it('renders nothing when no note is selected (home page handles this)', () => {
    const { container } = render(<MainArea />)
    expect(container.innerHTML).toBe('')
  })

  it('renders editor toolbar and title when a note is active', () => {
    const updateNote = vi.fn()
    vi.mocked(useNotes).mockReturnValue({
      activeNote: createActiveNote({ title: 'My Note' }),
      activeNoteId: 'note1',
      updateNote,
      createNote: vi.fn(),
    } as ReturnType<typeof vi.fn>)

    render(<MainArea />)

    expect(screen.getByDisplayValue('My Note')).toBeInTheDocument()
    expect(screen.getByText(/Last updated/)).toBeInTheDocument()
    expect(screen.getAllByTestId('icon-Bold').length).toBeGreaterThan(0)
    expect(screen.getAllByTestId('icon-Italic').length).toBeGreaterThan(0)
  })

  it('calls updateNote when title is changed after debounce', () => {
    vi.useFakeTimers()

    const updateNote = vi.fn()
    const note = createActiveNote({ title: 'Original' })
    vi.mocked(useNotes).mockReturnValue({
      activeNote: note,
      activeNoteId: 'note1',
      updateNote,
      createNote: vi.fn(),
    } as ReturnType<typeof vi.fn>)

    render(<MainArea />)

    const input = screen.getByDisplayValue('Original')
    fireEvent.change(input, { target: { value: 'Updated' } })

    expect(updateNote).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(700)
    })

    expect(updateNote).toHaveBeenCalledWith('note1', { title: 'Updated' })

    vi.useRealTimers()
  })

  it('renders NoteEditor component when note is active', () => {
    vi.mocked(useNotes).mockReturnValue({
      activeNote: createActiveNote(),
      activeNoteId: 'note1',
      updateNote: vi.fn(),
      createNote: vi.fn(),
    } as ReturnType<typeof vi.fn>)

    render(<MainArea />)

    expect(screen.getByTestId('note-editor')).toBeInTheDocument()
  })

  it('renders with search query parameter without crashing', () => {
    const originalLocation = window.location
    delete (window as any).location
    window.location = { ...originalLocation, search: '?q=test' }
    
    const mockNotes = { activeNote: createActiveNote(), loading: false, createNote: vi.fn() }
    ;(useNotes as ReturnType<typeof vi.fn>).mockReturnValue(mockNotes)
    
    render(<MainArea />)
    expect(screen.getByTestId('note-editor')).toBeDefined()
    
    window.location = originalLocation
  })
})
