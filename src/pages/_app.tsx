import React, { useMemo } from 'react';
import type { AppProps } from 'next/app';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import '@/styles/globals.css';
import { NoteProvider } from '@/contexts/NoteContext';
import { TabProvider } from '@/contexts/TabContext';
import { ThemeContextProvider, useTheme } from '@/contexts/ThemeContext';

function ThemedApp({ children }: { children: React.ReactNode }) {
  const { mode } = useTheme();
  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      ...(mode === 'light'
        ? {
            primary: { main: '#1976d2' },
            background: { default: '#fff', paper: '#fafafa' },
          }
        : {
            primary: { main: '#90caf9' },
            background: { default: '#121212', paper: '#1e1e1e' },
            text: { primary: '#e0e0e0', secondary: '#a0a0a0' },
          }),
    },
  }), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeContextProvider>
      <ThemedApp>
        <NoteProvider>
          <TabProvider>
            <Component {...pageProps} />
          </TabProvider>
        </NoteProvider>
      </ThemedApp>
    </ThemeContextProvider>
  );
}
