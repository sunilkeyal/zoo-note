import React, { useState } from 'react';
import {
  Drawer, List, ListItem, ListItemButton, ListItemText,
  Box, Typography, IconButton, Tooltip, TextField, InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import { useNotes } from '@/contexts/NoteContext';
import DeleteConfirmDialog from './DeleteConfirmDialog';

const DRAWER_WIDTH = 280;

export default function NotesSidebar() {
  const { notes, createNote, deleteNote, activeNoteId, setActiveNoteId } = useNotes();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filtered = search
    ? notes.filter((n) => n.title.toLowerCase().includes(search.toLowerCase()))
    : notes;

  const handleCreate = async () => {
    const note = await createNote({ title: 'Untitled Note' });
    if (note) setActiveNoteId(note._id);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteNote(deleteTarget);
    if (activeNoteId === deleteTarget) setActiveNoteId(null);
    setDeleteTarget(null);
  };

  return (
    <>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            top: ['40px', '40px', '40px'],
            height: 'auto',
            bottom: 0,
          },
        }}
      >
        <Box sx={{ p: 1.5 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                sx: { fontSize: '0.85rem', borderRadius: 2, bgcolor: 'action.hover' },
              },
            }}
          />
        </Box>

        <List dense sx={{ overflow: 'auto', flex: 1, px: 1 }}>
          {filtered.map((note) => (
            <ListItem
              key={note._id}
              disablePadding
              secondaryAction={
                <IconButton
                  edge="end"
                  size="small"
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(note._id); }}
                  sx={{ opacity: 0, '&:hover': { opacity: 1 } }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              }
            >
              <ListItemButton
                selected={activeNoteId === note._id}
                onClick={() => setActiveNoteId(note._id)}
                sx={{
                  borderRadius: 1.5,
                  mx: 0.5,
                  borderLeft: 3,
                  borderColor: activeNoteId === note._id ? 'primary.main' : 'transparent',
                  transition: 'background-color 0.15s ease',
                  '&:hover .MuiListItemSecondaryAction-root .MuiIconButton-root': {
                    opacity: 0.4,
                  },
                }}
              >
                <ListItemText
                  primary={note.title}
                  secondary={
                    <Typography variant="caption" color="text.secondary" noWrap component="span">
                      {note.content?.replace(/<[^>]*>/g, '').slice(0, 80) || 'Empty note'}
                    </Typography>
                  }
                  slotProps={{
                    primary: {
                      noWrap: true,
                      sx: {
                        fontSize: '0.85rem',
                        fontWeight: activeNoteId === note._id ? 600 : 400,
                      },
                    },
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider' }}>
          <Tooltip title="New Note">
            <IconButton size="small" onClick={handleCreate} sx={{ width: '100%', borderRadius: 1 }}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Drawer>

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
