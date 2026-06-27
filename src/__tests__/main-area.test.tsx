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
      })),
    })),
    getAttributes: vi.fn(() => ({})),
    getHTML: vi.fn(() => '<p>test content</p>'),
    commands: { setContent: vi.fn() },
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
    } as ReturnType<typeof vi.fn>)
  })

  it('shows placeholder text when no note is selected', () => {
    render(<MainArea />)
    expect(screen.getByText('Select a note or create a new one')).toBeInTheDocument()
  })

  it('renders editor toolbar and title when a note is active', () => {
    const updateNote = vi.fn()
    vi.mocked(useNotes).mockReturnValue({
      activeNote: createActiveNote({ title: 'My Note' }),
      activeNoteId: 'note1',
      updateNote,
    } as ReturnType<typeof vi.fn>)

    render(<MainArea />)

    expect(screen.getByDisplayValue('My Note')).toBeInTheDocument()
    expect(screen.getByText(/Last updated/)).toBeInTheDocument()
    expect(screen.getByTestId('icon-Bold')).toBeInTheDocument()
    expect(screen.getByTestId('icon-Italic')).toBeInTheDocument()
  })

  it('calls updateNote when title is changed after debounce', () => {
    vi.useFakeTimers()

    const updateNote = vi.fn()
    const note = createActiveNote({ title: 'Original' })
    vi.mocked(useNotes).mockReturnValue({
      activeNote: note,
      activeNoteId: 'note1',
      updateNote,
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
    } as ReturnType<typeof vi.fn>)

    render(<MainArea />)

    expect(screen.getByTestId('note-editor')).toBeInTheDocument()
  })
})
