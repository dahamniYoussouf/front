'use client';

import { useEffect } from 'react';

export default function ThemeScript() {
  useEffect(() => {
    try {
      const theme = localStorage.getItem('theme') || 
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
        root.style.backgroundColor = '#111827';
        if (document.body) {
          document.body.style.backgroundColor = '#111827';
          document.body.style.color = '#f9fafb';
        }
      } else {
        root.classList.remove('dark');
      }
    } catch (e) {
      console.error('Error applying theme:', e);
    }
  }, []);

  return null;
}

