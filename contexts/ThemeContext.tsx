'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initialiser avec le thème depuis localStorage ou système
  const getInitialTheme = (): Theme => {
    if (typeof window === 'undefined') return 'light';
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) return savedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  // Appliquer le thème immédiatement avant le premier rendu
  if (typeof window !== 'undefined') {
    const initialTheme = getInitialTheme();
    const root = document.documentElement;
    if (initialTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }

  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light';
    return getInitialTheme();
  });
  const [mounted, setMounted] = useState(false);

  // S'assurer que le thème est appliqué au montage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      const initialTheme = getInitialTheme();
      if (initialTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      setTheme(initialTheme);
      setMounted(true);
    }
  }, []);

  const applyTheme = (newTheme: Theme) => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      if (newTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      localStorage.setItem('theme', newTheme);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  // Toujours fournir le contexte, même avant le montage
  // Cela évite l'erreur "useTheme must be used within a ThemeProvider"
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // Retourner des valeurs par défaut au lieu de lancer une erreur
    // Cela évite les erreurs pendant le SSR ou si le provider n'est pas encore monté
    return {
      theme: 'light' as Theme,
      toggleTheme: () => {
        console.warn('ThemeProvider not available');
      }
    };
  }
  return context;
}

