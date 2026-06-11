import React from 'react';
import { AppBar, Toolbar, Typography, Box, IconButton, Tooltip } from '@mui/material';
import NoteAltIcon from '@mui/icons-material/NoteAlt';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useTheme } from '@/contexts/ThemeContext';

export default function AppHeader() {
  const { mode, toggleTheme } = useTheme();

  return (
    <AppBar
      position="static"
      color="default"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        boxShadow: 'none',
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: (theme) =>
          theme.palette.mode === 'light'
            ? 'rgba(255,255,255,0.85)'
            : 'rgba(18,18,18,0.85)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <Toolbar variant="dense" sx={{ minHeight: '40px !important', px: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
          <NoteAltIcon fontSize="small" />
          <Typography variant="h6" component="h1" noWrap sx={{ fontSize: '0.95rem', fontWeight: 600 }}>
            Notes
          </Typography>
        </Box>
        <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          <IconButton color="inherit" size="small" onClick={toggleTheme}>
            {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
}
