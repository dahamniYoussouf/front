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
        root.style.backgroundColor = '#0f172a';
        if (document.body) {
          document.body.style.backgroundColor = '#0f172a';
          document.body.style.color = '#f8fafc';
        }
      } else {
        root.classList.remove('dark');
        root.style.backgroundColor = '';
        if (document.body) {
          document.body.style.backgroundColor = '';
          document.body.style.color = '';
        }
      }
    } catch (e) {
      console.error('Error applying theme:', e);
    }
  }, []);

  return null;
}

