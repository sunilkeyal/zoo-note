import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Box, Typography, Divider, TextField } from '@mui/material';
import { useNotes } from '@/contexts/NoteContext';
import NoteEditor from './NoteEditor';

export default function MainArea() {
  const { activeNote, activeNoteId, updateNote } = useNotes();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pendingUpdate = useRef<{ id: string; content: string } | null>(null);
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (activeNote) setTitle(activeNote.title);
  }, [activeNote?._id]);

  const handleUpdate = useCallback((id: string, content: string) => {
    pendingUpdate.current = { id, content };
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (pendingUpdate.current) {
        updateNote(pendingUpdate.current.id, { content: pendingUpdate.current.content });
        pendingUpdate.current = null;
      }
    }, 1000);
  }, [updateNote]);

  const handleTitleChange = useCallback((id: string, value: string) => {
    setTitle(value);
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    titleDebounceRef.current = setTimeout(() => {
      updateNote(id, { title: value });
    }, 600);
  }, [updateNote]);

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: 'background.default' }}>
      {activeNote ? (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ px: '40px', pt: 3, pb: 0, maxWidth: 720, mx: 'auto', width: '100%' }}>
            <TextField
              fullWidth
              variant="standard"
              value={title}
              onChange={(e) => handleTitleChange(activeNote._id, e.target.value)}
              slotProps={{
                input: {
                  sx: {
                    fontSize: '1.35rem',
                    fontWeight: 700,
                    '&:before': { borderBottom: 'none' },
                    '&:hover:not(.Mui-disabled, .Mui-error):before': { borderBottom: 'none' },
                    '&:after': { borderBottom: '2px solid' },
                  },
                },
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
              Last updated: {new Date(activeNote.updatedAt).toLocaleString()}
            </Typography>
            <Divider sx={{ mt: 1, mb: 0 }} />
          </Box>
          <Box sx={{ flex: 1, overflow: 'auto', px: '40px', maxWidth: 720, mx: 'auto', width: '100%', py: 2 }}>
            <NoteEditor note={activeNote} onUpdate={handleUpdate} />
          </Box>
        </Box>
      ) : (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            Select a note or create a new one
          </Typography>
        </Box>
      )}
    </Box>
  );
}
