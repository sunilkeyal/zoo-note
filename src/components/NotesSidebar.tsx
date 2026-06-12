import React, { useState, DragEvent } from 'react';
import {
  Drawer, List, ListItem, ListItemButton, ListItemText,
  Box, Typography, IconButton, Tooltip, TextField, InputAdornment,
  Menu, MenuItem, Collapse,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import DeleteIcon from '@mui/icons-material/Delete';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SearchIcon from '@mui/icons-material/Search';
import { useNotes } from '@/contexts/NoteContext';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import DeleteFolderDialog from './DeleteFolderDialog';
import { Folder, Note } from '@/types';

const DRAWER_WIDTH = 280;

export default function NotesSidebar() {
  const {
    notes, folders, expandedFolders, createNote, deleteNote,
    activeNoteId, setActiveNoteId, createFolder, renameFolder,
    deleteFolder, moveNote, toggleFolder,
  } = useNotes();

  const [search, setSearch] = useState('');

  // Note deletion
  const [deleteNoteTarget, setDeleteNoteTarget] = useState<string | null>(null);

  // Folder deletion
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<Folder | null>(null);

  // Context menu
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    target: Folder | Note;
    type: 'folder' | 'note';
  } | null>(null);

  // Move note via context menu
  const [moveNoteTarget, setMoveNoteTarget] = useState<Note | null>(null);
  const [moveMenuAnchor, setMoveMenuAnchor] = useState<HTMLElement | null>(null);

  // Inline rename
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const filtered = search
    ? notes.filter((n) => n.title.toLowerCase().includes(search.toLowerCase()))
    : notes;

  const quickNotes = filtered.filter((n) => !n.folderId);

  const handleCreate = async () => {
    const note = await createNote({ title: 'Untitled Note' });
    if (note) setActiveNoteId(note._id);
  };

  const handleCreateFolder = async () => {
    const folder = await createFolder('New Folder');
    if (folder) {
      setRenamingId(folder._id);
      setRenameValue(folder.name);
      toggleFolder(folder._id);
    }
  };

  const handleDeleteNote = async () => {
    if (!deleteNoteTarget) return;
    await deleteNote(deleteNoteTarget);
    if (activeNoteId === deleteNoteTarget) setActiveNoteId(null);
    setDeleteNoteTarget(null);
  };

  const handleDeleteFolder = async () => {
    if (!deleteFolderTarget) return;
    await deleteFolder(deleteFolderTarget._id);
    setDeleteFolderTarget(null);
  };

  // Inline rename
  const startRenaming = (id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
  };

  const finishRename = async (id: string) => {
    if (!renamingId || !renameValue.trim()) {
      cancelRename();
      return;
    }
    // Check if it's a folder or note
    if (folders.some((f) => f._id === id)) {
      await renameFolder(id, renameValue.trim());
    }
    cancelRename();
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue('');
  };

  // Context menu handlers
  const openFolderMenu = (e: React.MouseEvent, folder: Folder) => {
    e.preventDefault();
    setContextMenu({ mouseX: e.clientX, mouseY: e.clientY, target: folder, type: 'folder' });
  };

  const openNoteMenu = (e: React.MouseEvent, note: Note) => {
    e.preventDefault();
    setContextMenu({ mouseX: e.clientX, mouseY: e.clientY, target: note, type: 'note' });
  };

  const handleContextRename = () => {
    if (!contextMenu) return;
    startRenaming(contextMenu.target._id, (contextMenu.target as any).name || (contextMenu.target as any).title || '');
    setContextMenu(null);
  };

  const handleContextDelete = () => {
    if (!contextMenu) return;
    if (contextMenu.type === 'folder') {
      setDeleteFolderTarget(contextMenu.target as Folder);
    } else {
      setDeleteNoteTarget(contextMenu.target._id);
    }
    setContextMenu(null);
  };

  const handleContextMoveNote = () => {
    if (!contextMenu || contextMenu.type !== 'note') return;
    setMoveNoteTarget(contextMenu.target as Note);
    setContextMenu(null);
    // We need the anchor position - use the menu position
  };

  // Drag and drop
  const handleDragStart = (e: DragEvent, noteId: string) => {
    e.dataTransfer.setData('text/plain', noteId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    const noteId = e.dataTransfer.getData('text/plain');
    if (noteId) {
      await moveNote(noteId, targetFolderId);
    }
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
        {/* Sidebar header with action icons */}
        <Box
          sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            px: 1, py: 0.5, borderBottom: 1, borderColor: 'divider',
          }}
        >
          <Tooltip title="New Note">
            <IconButton size="small" onClick={handleCreate} sx={{ width: 28, height: 28 }}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="New Folder">
            <IconButton size="small" onClick={handleCreateFolder} sx={{ width: 28, height: 28 }}>
              <CreateNewFolderIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Search */}
        <Box sx={{ p: 1.5, pb: 0.5 }}>
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

        {/* Folder list */}
        <List dense sx={{ overflow: 'auto', flex: 1, px: 1 }}>
          {folders.map((folder) => {
            const folderNotes = filtered.filter((n) => n.folderId === folder._id);
            const isExpanded = expandedFolders.has(folder._id);

            return (
              <Box key={folder._id}>
                <ListItem
                  disablePadding
                  secondaryAction={
                    <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
                      {folderNotes.length}
                    </Typography>
                  }
                >
                  <ListItemButton
                    onClick={() => toggleFolder(folder._id)}
                    onContextMenu={(e) => openFolderMenu(e, folder)}
                    onDoubleClick={() => startRenaming(folder._id, folder.name)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, folder._id)}
                    sx={{ borderRadius: 1.5, mx: 0.5 }}
                  >
                    {isExpanded ? (
                      <FolderOpenIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    ) : (
                      <FolderIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    )}
                    {renamingId === folder._id ? (
                      <TextField
                        size="small"
                        variant="standard"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => finishRename(folder._id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') finishRename(folder._id);
                          if (e.key === 'Escape') cancelRename();
                        }}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        slotProps={{
                          input: {
                            sx: { fontSize: '0.85rem', fontWeight: 500 },
                          },
                        }}
                      />
                    ) : (
                      <ListItemText
                        primary={folder.name}
                        slotProps={{
                          primary: {
                            noWrap: true,
                            sx: { fontSize: '0.85rem', fontWeight: 500 },
                          },
                        }}
                      />
                    )}
                  </ListItemButton>
                </ListItem>

                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                  <List dense disablePadding>
                    {folderNotes.map((note) => (
                      <ListItem
                        key={note._id}
                        disablePadding
                        draggable
                        onDragStart={(e) => handleDragStart(e, note._id)}
                        secondaryAction={
                          <IconButton
                            edge="end"
                            size="small"
                            onClick={(e) => { e.stopPropagation(); setDeleteNoteTarget(note._id); }}
                            sx={{ opacity: 0, '&:hover': { opacity: 1 } }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        }
                      >
                        <ListItemButton
                          selected={activeNoteId === note._id}
                          onClick={() => setActiveNoteId(note._id)}
                          onContextMenu={(e) => openNoteMenu(e, note)}
                          onDoubleClick={() => startRenaming(note._id, note.title)}
                          sx={{
                            borderRadius: 1.5,
                            ml: 3,
                            mr: 0.5,
                            borderLeft: 3,
                            borderColor: activeNoteId === note._id ? 'primary.main' : 'transparent',
                            '&:hover .MuiListItemSecondaryAction-root .MuiIconButton-root': {
                              opacity: 0.4,
                            },
                          }}
                        >
                          {renamingId === note._id ? (
                            <TextField
                              size="small"
                              variant="standard"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onBlur={() => finishRename(note._id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') finishRename(note._id);
                                if (e.key === 'Escape') cancelRename();
                              }}
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                              slotProps={{
                                input: {
                                  sx: { fontSize: '0.85rem' },
                                },
                              }}
                            />
                          ) : (
                            <ListItemText
                              primary={note.title}
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
                          )}
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              </Box>
            );
          })}

          {/* Quick Notes section */}
          {quickNotes.length > 0 && (
            <Box
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, null)}
            >
              <ListItem dense sx={{ px: 2, py: 0.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                  Quick Notes
                </Typography>
              </ListItem>
              {quickNotes.map((note) => (
                <ListItem
                  key={note._id}
                  disablePadding
                  draggable
                  onDragStart={(e) => handleDragStart(e, note._id)}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={(e) => { e.stopPropagation(); setDeleteNoteTarget(note._id); }}
                      sx={{ opacity: 0, '&:hover': { opacity: 1 } }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  }
                >
                  <ListItemButton
                    selected={activeNoteId === note._id}
                    onClick={() => setActiveNoteId(note._id)}
                    onContextMenu={(e) => openNoteMenu(e, note)}
                    onDoubleClick={() => startRenaming(note._id, note.title)}
                    sx={{
                      borderRadius: 1.5,
                      mx: 0.5,
                      borderLeft: 3,
                      borderColor: activeNoteId === note._id ? 'primary.main' : 'transparent',
                      '&:hover .MuiListItemSecondaryAction-root .MuiIconButton-root': {
                        opacity: 0.4,
                      },
                    }}
                  >
                    {renamingId === note._id ? (
                      <TextField
                        size="small"
                        variant="standard"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => finishRename(note._id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') finishRename(note._id);
                          if (e.key === 'Escape') cancelRename();
                        }}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        slotProps={{
                          input: {
                            sx: { fontSize: '0.85rem' },
                          },
                        }}
                      />
                    ) : (
                      <ListItemText
                        primary={note.title}
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
                    )}
                  </ListItemButton>
                </ListItem>
              ))}
            </Box>
          )}
        </List>
      </Drawer>

      {/* Context menu */}
      <Menu
        open={contextMenu !== null}
        onClose={() => setContextMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined
        }
      >
        {contextMenu?.type === 'folder' && [
          <MenuItem key="rename" onClick={handleContextRename}>
            <DriveFileRenameOutlineIcon fontSize="small" sx={{ mr: 1 }} /> Rename
          </MenuItem>,
          <MenuItem key="delete" onClick={handleContextDelete}>
            <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
          </MenuItem>,
        ]}
        {contextMenu?.type === 'note' && [
          <MenuItem key="move" onClick={handleContextMoveNote}>
            Move to folder
          </MenuItem>,
          <MenuItem key="delete" onClick={handleContextDelete}>
            <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
          </MenuItem>,
        ]}
      </Menu>

      {/* Move to folder submenu */}
      <Menu
        open={Boolean(moveNoteTarget)}
        onClose={() => setMoveNoteTarget(null)}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined
        }
      >
        <MenuItem
          onClick={async () => {
            if (moveNoteTarget) {
              await moveNote(moveNoteTarget._id, null);
              setMoveNoteTarget(null);
            }
          }}
        >
          Quick Notes
        </MenuItem>
        {folders.map((f) => (
          <MenuItem
            key={f._id}
            onClick={async () => {
              if (moveNoteTarget) {
                await moveNote(moveNoteTarget._id, f._id);
                setMoveNoteTarget(null);
              }
            }}
          >
            {f.name}
          </MenuItem>
        ))}
      </Menu>

      {/* Delete note confirmation */}
      <DeleteConfirmDialog
        open={deleteNoteTarget !== null}
        onClose={() => setDeleteNoteTarget(null)}
        onConfirm={handleDeleteNote}
      />

      {/* Delete folder confirmation */}
      <DeleteFolderDialog
        open={deleteFolderTarget !== null}
        folderName={deleteFolderTarget?.name || ''}
        notesCount={
          deleteFolderTarget
            ? notes.filter((n) => n.folderId === deleteFolderTarget._id).length
            : 0
        }
        onClose={() => setDeleteFolderTarget(null)}
        onConfirm={handleDeleteFolder}
      />
    </>
  );
}
