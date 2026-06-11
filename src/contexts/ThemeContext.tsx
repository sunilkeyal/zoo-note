import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';

interface ThemeContextValue {
  mode: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getInitialMode(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = localStorage.getItem('theme-mode');
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {}
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeContextProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<'light' | 'dark'>(getInitialMode);
  const hasManuallyToggled = useRef(false);

  useEffect(() => {
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) meta.setAttribute('content', `${mode} light`);
    document.documentElement.dataset.theme = mode;
  }, [mode]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      if (!hasManuallyToggled.current) {
        setMode(e.matches ? 'dark' : 'light');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const toggleTheme = useCallback(() => {
    hasManuallyToggled.current = true;
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme-mode', next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeContextProvider');
  return ctx;
}
