import { useEffect, useState } from 'react';

/**
 * Detect colour scheme on web — synchronously on the very first render using
 * window.matchMedia, so the initial paint never falls back to 'light' (which
 * causes a white flash in dark mode). Also listens for live OS-level changes.
 *
 * Returns 'light' during server-side rendering where window is undefined.
 */
export function useColorScheme(): 'light' | 'dark' {
  const [scheme, setScheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setScheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return scheme;
}
