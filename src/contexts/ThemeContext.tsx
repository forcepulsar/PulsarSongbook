import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { getSettings, updateSettings } from '../db/schema';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');

  // Load theme from IndexedDB on mount
  useEffect(() => {
    getSettings()
      .then((settings) => {
        const savedTheme = settings.theme || 'light';
        setThemeState(savedTheme);
      })
      .catch((error) => {
        console.error('Error loading theme:', error);
      });
  }, []);

  // Apply theme to HTML element whenever it changes
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    updateSettings({ theme: newTheme }).catch((error) => {
      console.error('Error saving theme:', error);
    });
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
