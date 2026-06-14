import React, {
  createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode,
} from 'react';
import { Note, Folder, NoteInput, NoteUpdate, ApiResponse } from '@/types';

interface NoteContextValue {
  notes: Note[];
  folders: Folder[];
  expandedFolders: Set<string>;
  loading: boolean;
  error: string | null;
  activeNoteId: string | null;
  activeNote: Note | null;
  setActiveNoteId: (id: string | null) => void;
  fetchNotes: () => Promise<void>;
  fetchFolders: () => Promise<void>;
  createNote: (input: NoteInput) => Promise<Note | null>;
  updateNote: (id: string, update: NoteUpdate) => Promise<Note | null>;
  deleteNote: (id: string) => Promise<boolean>;
  createFolder: (name: string) => Promise<Folder | null>;
  renameFolder: (id: string, name: string) => Promise<Folder | null>;
  deleteFolder: (id: string) => Promise<{ deletedNotesCount: number } | null>;
  moveNote: (noteId: string, folderId: string | null, position?: number) => Promise<Note | null>;
  toggleFolder: (folderId: string) => void;
}

const NoteContext = createContext<NoteContextValue | undefined>(undefined);

function sortByPosition(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export function NoteProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('expandedFolders');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return new Set(parsed);
      }
    } catch {
      // localStorage unavailable
    }
    return new Set();
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  const activeNote = notes.find((n) => n._id === activeNoteId) ?? null;

  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('expandedFolders', JSON.stringify(Array.from(expandedFolders)));
    } catch {
      // localStorage unavailable
    }
  }, [expandedFolders]);

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/notes');
      const json: ApiResponse<Note[]> = await res.json();
      if (json.success && json.data) {
        setNotes(sortByPosition(json.data));
      } else {
        setError(json.error || 'Failed to fetch notes');
      }
    } catch {
      setError('Failed to fetch notes');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFolders = useCallback(async () => {
    try {
      const res = await fetch('/api/folders');
      const json: ApiResponse<Folder[]> = await res.json();
      if (json.success && json.data) {
        setFolders(json.data);
      }
    } catch {
      // silent — folders are optional UX
    }
  }, []);

  const createNote = useCallback(async (input: NoteInput): Promise<Note | null> => {
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const json: ApiResponse<Note> = await res.json();
      if (json.success && json.data) {
        setNotes((prev) => sortByPosition([json.data!, ...prev]));
        return json.data;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const updateNote = useCallback(async (id: string, update: NoteUpdate): Promise<Note | null> => {
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });
      const json: ApiResponse<Note> = await res.json();
      if (json.success && json.data) {
        setNotes((prev) => sortByPosition(prev.map((n) => (n._id === id ? json.data! : n))));
        return json.data;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const deleteNote = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      const json: ApiResponse<void> = await res.json();
      if (json.success) {
        setNotes((prev) => prev.filter((n) => n._id !== id));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const createFolder = useCallback(async (name: string): Promise<Folder | null> => {
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const json: ApiResponse<Folder> = await res.json();
      if (json.success && json.data) {
        setFolders((prev) => [...prev, json.data!]);
        return json.data;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const renameFolder = useCallback(async (id: string, name: string): Promise<Folder | null> => {
    try {
      const res = await fetch(`/api/folders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const json: ApiResponse<Folder> = await res.json();
      if (json.success && json.data) {
        setFolders((prev) => prev.map((f) => (f._id === id ? json.data! : f)));
        return json.data;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const deleteFolder = useCallback(async (id: string): Promise<{ deletedNotesCount: number } | null> => {
    try {
      const res = await fetch(`/api/folders/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setFolders((prev) => prev.filter((f) => f._id !== id));
        setNotes((prev) => prev.filter((n) => n.folderId !== id));
        return json.data;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const moveNote = useCallback(async (noteId: string, folderId: string | null, position?: number): Promise<Note | null> => {
    try {
      const body: Record<string, unknown> = {};
      if (folderId !== null) {
        body.folderId = folderId;
      } else {
        body.folderId = null;
      }
      if (position !== undefined) {
        body.position = position;
      }
      const res = await fetch(`/api/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json: ApiResponse<Note> = await res.json();
      if (json.success && json.data) {
        setNotes((prev) => sortByPosition(prev.map((n) => (n._id === noteId ? json.data! : n))));
        return json.data;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotes();
    fetchFolders();
  }, [fetchNotes, fetchFolders]);

  const value = useMemo<NoteContextValue>(() => ({
    notes,
    folders,
    expandedFolders,
    loading,
    error,
    activeNoteId,
    activeNote,
    setActiveNoteId,
    fetchNotes,
    fetchFolders,
    createNote,
    updateNote,
    deleteNote,
    createFolder,
    renameFolder,
    deleteFolder,
    moveNote,
    toggleFolder,
  }), [
    notes, folders, expandedFolders, loading, error, activeNoteId, activeNote,
    setActiveNoteId, fetchNotes, fetchFolders, createNote, updateNote, deleteNote,
    createFolder, renameFolder, deleteFolder, moveNote, toggleFolder,
  ]);

  return (
    <NoteContext.Provider value={value}>
      {children}
    </NoteContext.Provider>
  );
}

export function useNotes() {
  const ctx = useContext(NoteContext);
  if (!ctx) throw new Error('useNotes must be used within NoteProvider');
  return ctx;
}
