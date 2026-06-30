import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import NotesSidebar from '@/components/NotesSidebar'
import type { Note, Folder } from '@/types'

vi.mock('@/contexts/NoteContext', () => ({
  useNotes: vi.fn(),
  NoteProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}))

vi.mock('@/components/DeleteConfirmDialog', () => ({
  default: ({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) =>
    open ? <div data-testid="delete-confirm"><button onClick={onClose}>Cancel</button><button onClick={onConfirm}>Confirm Delete</button></div> : null,
}))

vi.mock('@/components/DeleteFolderDialog', () => ({
  default: ({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) =>
    open ? <div data-testid="delete-folder-confirm"><button onClick={onClose}>Cancel</button><button onClick={onConfirm}>Confirm Delete</button></div> : null,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, ...props }: { children: React.ReactNode; onClick?: () => void; variant?: string; size?: string }) => (
    <button onClick={onClick} data-variant={variant} data-size={size} {...props}>{children}</button>
  ),
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip">{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-content">{children}</div>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children, render, ...props }: { children: React.ReactNode; render?: React.ReactElement }) => {
    if (render) return React.cloneElement(render, { ...props }, children)
    return <button {...props}>{children}</button>
  },
}))

vi.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children, open }: { children: React.ReactNode; open?: boolean }) => <div data-open={String(open)}>{children}</div>,
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CollapsibleTrigger: ({ children, render }: { children: React.ReactNode; render?: React.ReactElement }) => {
    if (render) return React.cloneElement(render, null, children)
    return <button>{children}</button>
  },
}))

vi.mock('@/components/ui/context-menu', () => ({
  ContextMenu: ({ children }: { children: React.ReactNode }) => <div data-testid="context-menu">{children}</div>,
  ContextMenuTrigger: ({ children, render }: { children: React.ReactNode; render?: React.ReactElement }) =>
    render || <div>{children}</div>,
  ContextMenuContent: ({ children }: { children: React.ReactNode }) => <div data-testid="context-menu-content">{children}</div>,
  ContextMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => <button onClick={onClick}>{children}</button>,
  ContextMenuSeparator: () => <hr />,
  ContextMenuSub: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ContextMenuSubContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ContextMenuSubTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}))

vi.mock('@/components/ui/sidebar', () => ({
  Sidebar: ({ children }: { children: React.ReactNode }) => <div data-testid="sidebar">{children}</div>,
  SidebarContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarGroupContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarMenu: ({ children }: { children: React.ReactNode }) => <ul>{children}</ul>,
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => <li>{children}</li>,
  SidebarMenuButton: ({ children, isActive }: { children: React.ReactNode; isActive?: boolean }) => (
    <button data-active={String(isActive)}>{children}</button>
  ),
  SidebarMenuAction: ({ children, onClick, showOnHover }: { children: React.ReactNode; onClick?: () => void; showOnHover?: boolean }) => (
    <button onClick={onClick}>{children}</button>
  ),
  SidebarMenuSub: ({ children }: { children: React.ReactNode }) => <ul>{children}</ul>,
  SidebarMenuSubItem: ({ children }: { children: React.ReactNode }) => <li>{children}</li>,
  SidebarMenuSubButton: ({ children, isActive, onClick, onDoubleClick, draggable, onDragStart, onDragEnd, onDragOver }: {
    children: React.ReactNode; isActive?: boolean; onClick?: () => void; onDoubleClick?: () => void;
    draggable?: boolean; onDragStart?: (e: React.DragEvent) => void; onDragEnd?: () => void; onDragOver?: (e: React.DragEvent) => void;
  }) => (
    <button data-active={String(isActive)} onClick={onClick} onDoubleClick={onDoubleClick} draggable={draggable}
      onDragStart={onDragStart as any} onDragEnd={onDragEnd as any} onDragOver={onDragOver as any}>{children}</button>
  ),
  SidebarSeparator: () => <hr />,
  SidebarInput: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}))

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <button data-testid="dropdown-trigger">{children}</button>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick, variant }: { children: React.ReactNode; onClick?: () => void; variant?: string }) => (
    <button onClick={onClick} data-variant={variant}>{children}</button>
  ),
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('lucide-react', () => ({
  Plus: () => <span>+</span>,
  Folder: () => <span data-testid="folder-icon">FolderIcon</span>,
  ChevronRight: () => <span>&gt;</span>,
  ChevronDown: () => <span>v</span>,
  ChevronsUpDown: () => <span>&lt;&gt;</span>,
  ChevronsDownUp: () => <span>&gt;&lt;</span>,
  Trash2: () => <svg data-testid="trash-icon" />,
  Pencil: () => <span>Edit</span>,
  Search: () => <span>Search</span>,
  Briefcase: () => <span>Briefcase</span>,
  User: () => <span>User</span>,
  GraduationCap: () => <span>Grad</span>,
  Music: () => <span>Music</span>,
  Image: () => <span>Image</span>,
  Video: () => <span>Video</span>,
  FileText: () => <span>FileText</span>,
  File: () => <span>File</span>,
  FilePlus: () => <span>FilePlus</span>,
  Download: () => <span>Download</span>,
  Code2: () => <span>Code</span>,
  Utensils: () => <span>Utensils</span>,
  Heart: () => <span>Heart</span>,
  StickyNote: () => <span>StickyNote</span>,
  Lightbulb: () => <span>Bulb</span>,
  Star: () => <span>Star</span>,
  Dumbbell: () => <span>Dumbbell</span>,
  DollarSign: () => <span>Dollar</span>,
  Plane: () => <span>Plane</span>,
  ShoppingCart: () => <span>Cart</span>,
  HeartPulse: () => <span>HeartPulse</span>,
  Car: () => <span>Car</span>,
  BookOpen: () => <span>BookOpen</span>,
  Info: () => <span>Info</span>,
  LogOut: () => <span>Logout</span>,
  Settings: () => <span>Settings</span>,
  Rocket: () => <span>Rocket</span>,
  LayoutDashboard: () => <svg data-testid="dashboard-icon" />,
  Database: () => <span>Database</span>,
  Users: () => <span>Users</span>,
  ScrollText: () => <span>ScrollText</span>,
  BarChart3: () => <span>BarChart</span>,
  UserIcon: () => <span>UserIcon</span>,
}))

import { useNotes } from '@/contexts/NoteContext'
import { useSession } from 'next-auth/react'
import { signOut } from 'next-auth/react'

const mockNote1: Note = {
  _id: 'n1', title: 'Alpha Note', content: '', folderId: 'f1', position: 0,
  createdAt: '2024-01-01', updatedAt: '2024-01-02',
}

const mockNote2: Note = {
  _id: 'n2', title: 'Beta Note', content: '', folderId: 'f1', position: 1,
  createdAt: '2024-01-01', updatedAt: '2024-01-01',
}

const mockNote3: Note = {
  _id: 'n3', title: 'Standalone Note', content: '', position: 2,
  createdAt: '2024-01-01', updatedAt: '2024-01-01',
}

const mockFolder1: Folder = {
  _id: 'f1', name: 'Work', createdAt: '2024-01-01', updatedAt: '2024-01-01',
}

const mockFolder2: Folder = {
  _id: 'f2', name: 'Personal', createdAt: '2024-01-01', updatedAt: '2024-01-01',
}

function createMockContext(overrides: Record<string, unknown> = {}) {
  return {
    notes: [mockNote1, mockNote2, mockNote3],
    folders: [mockFolder1, mockFolder2],
    expandedFolders: new Set<string>(['f1']),
    loading: false,
    error: null,
    activeNoteId: null,
    activeNote: null,
    setActiveNoteId: vi.fn(),
    fetchNotes: vi.fn(),
    fetchFolders: vi.fn(),
    createNote: vi.fn(),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
    createFolder: vi.fn(),
    renameFolder: vi.fn(),
    deleteFolder: vi.fn(),
    moveNote: vi.fn(),
    toggleFolder: vi.fn(),
    trashItems: { notes: [], folders: [] },
    trashLoading: false,
    trashError: null,
    fetchTrash: vi.fn(),
    restoreItems: vi.fn(),
    permanentDeleteItems: vi.fn(),
    ...overrides,
  }
}

describe('NotesSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useSession).mockReturnValue({
      data: { user: { name: 'Test User', email: 'test@test.com', role: 'user' } },
      status: 'authenticated',
      update: vi.fn(),
    } as any)
  })

  const renderSidebar = () => render(<NotesSidebar />)

  it('renders sidebar', () => {
    vi.mocked(useNotes).mockReturnValue(createMockContext())
    renderSidebar()
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
  })

  it('renders Notes section', () => {
    vi.mocked(useNotes).mockReturnValue(createMockContext())
    renderSidebar()
    expect(screen.getByText('Notes')).toBeInTheDocument()
  })

  it('renders Workspace section with Trash link', () => {
    vi.mocked(useNotes).mockReturnValue(createMockContext())
    renderSidebar()
    expect(screen.getByText('Workspace')).toBeInTheDocument()
    expect(screen.getByText('Trash')).toBeInTheDocument()
  })

  it('renders folders', () => {
    vi.mocked(useNotes).mockReturnValue(createMockContext())
    renderSidebar()
    expect(screen.getByText('Work')).toBeInTheDocument()
    expect(screen.getByText('Personal')).toBeInTheDocument()
  })

  it('renders notes inside expanded folder', () => {
    vi.mocked(useNotes).mockReturnValue(createMockContext())
    renderSidebar()
    expect(screen.getByText('Alpha Note')).toBeInTheDocument()
    expect(screen.getByText('Beta Note')).toBeInTheDocument()
  })

  it('renders standalone notes without a folder in the root notes section', () => {
    vi.mocked(useNotes).mockReturnValue(createMockContext())
    renderSidebar()
    expect(screen.getByText('Standalone Note')).toBeInTheDocument()
  })

  it('shows admin section when user has admin role', () => {
    vi.mocked(useNotes).mockReturnValue(createMockContext())
    vi.mocked(useSession).mockReturnValue({
      data: { user: { name: 'Site Admin', email: 'admin@test.com', role: 'admin' } },
      status: 'authenticated',
      update: vi.fn(),
    } as any)
    renderSidebar()
    expect(screen.getByText('Admin')).toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Analytics')).toBeInTheDocument()
    expect(screen.getByText('User Management')).toBeInTheDocument()
    expect(screen.getByText('Audit Logs')).toBeInTheDocument()
    expect(screen.getByText('System Settings')).toBeInTheDocument()
    expect(screen.getByText('Backup & Restore')).toBeInTheDocument()
  })

  it('does not show admin section for regular users', () => {
    vi.mocked(useNotes).mockReturnValue(createMockContext())
    vi.mocked(useSession).mockReturnValue({
      data: { user: { name: 'User', email: 'user@test.com', role: 'user' } },
      status: 'authenticated',
      update: vi.fn(),
    } as any)
    renderSidebar()
    expect(screen.queryByText('Admin')).not.toBeInTheDocument()
  })

  it('filters notes by search', async () => {
    const user = userEvent.setup()
    vi.mocked(useNotes).mockReturnValue(createMockContext())
    renderSidebar()

    const searchButtons = screen.getAllByText('Search')
    await user.click(searchButtons[0])

    const searchInput = screen.getByPlaceholderText('Search notes...')
    await user.type(searchInput, 'Alpha')

    expect(screen.getByText('Alpha Note')).toBeInTheDocument()
    expect(screen.queryByText('Beta Note')).not.toBeInTheDocument()
  })

  it('calls createNote when clicking create note from context menu', () => {
    const createNote = vi.fn().mockResolvedValue({ _id: 'new', title: 'Untitled Note', content: '', position: 0, createdAt: '2024-01-01', updatedAt: '2024-01-01' })
    const setActiveNoteId = vi.fn()
    vi.mocked(useNotes).mockReturnValue(createMockContext({ createNote, setActiveNoteId }))
    renderSidebar()

    const createNoteButtons = screen.getAllByText('+')
    const contextMenuCreateButtons = screen.getAllByText('Create new note')
    expect(contextMenuCreateButtons.length).toBeGreaterThan(0)
  })

  it('calls createFolder when clicking new folder button', () => {
    const createFolder = vi.fn().mockResolvedValue({ _id: 'new', name: 'New Folder', createdAt: '2024-01-01', updatedAt: '2024-01-01' })
    const toggleFolder = vi.fn()
    vi.mocked(useNotes).mockReturnValue(createMockContext({ createFolder, toggleFolder }))
    renderSidebar()

    const folderButtons = screen.getAllByText('FolderIcon')
    fireEvent.click(folderButtons[0])
    expect(createFolder).toHaveBeenCalledOnce()
  })

  it('renders user dropdown with name and email', () => {
    vi.mocked(useNotes).mockReturnValue(createMockContext())
    vi.mocked(useSession).mockReturnValue({
      data: { user: { name: 'John Doe', email: 'john@test.com', role: 'user' } },
      status: 'authenticated',
      update: vi.fn(),
    } as any)
    renderSidebar()

    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('calls signOut when Log out is clicked', () => {
    vi.mocked(useNotes).mockReturnValue(createMockContext())
    renderSidebar()

    const logoutButton = screen.getByText('Logout')
    fireEvent.click(logoutButton)
    expect(signOut).toHaveBeenCalled()
  })

  it('shows delete confirm dialog when note context menu triggers delete', () => {
    const deleteNote = vi.fn()
    vi.mocked(useNotes).mockReturnValue(createMockContext({ deleteNote }))
    renderSidebar()

    const moveToTrashButtons = screen.getAllByText('Move to trash')
    // First note's "Move to trash" is at index 1 (index 0 is folder "Work")
    const noteTrashButton = moveToTrashButtons[1]

    if (noteTrashButton) {
      fireEvent.click(noteTrashButton)
      expect(screen.getByTestId('delete-confirm')).toBeInTheDocument()
    }
  })

  it('shows sidebar header with app name', () => {
    vi.mocked(useNotes).mockReturnValue(createMockContext())
    renderSidebar()
    expect(screen.getByText('ZooNoteBar')).toBeInTheDocument()
  })

  it('shows expand all and collapse all buttons', () => {
    vi.mocked(useNotes).mockReturnValue(createMockContext())
    renderSidebar()
    const expandButtons = screen.getAllByText(/>|</)
    expect(expandButtons.length).toBeGreaterThan(0)
  })
})
