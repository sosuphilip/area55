import { useColorScheme as rnUseColorScheme } from 'react-native';

/**
 * Re-export useColorScheme, but on web detect the system preference
 * synchronously so the very first render already has a value (React
 * Native's hook returns null before the first paint, causing a
 * one-frame white flash when useTheme falls back to 'light').
 */
export function useColorScheme(): 'light' | 'dark' {
  const scheme = rnUseColorScheme();
  if (scheme) return scheme;

  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}
