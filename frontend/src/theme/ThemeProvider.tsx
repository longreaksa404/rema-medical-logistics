import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { THEME_KEY, ThemeContext, type ResolvedTheme, type ThemePreference } from './ThemeContext';

function readPreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  } catch { /* storage unavailable */ }
  return 'dark';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference);
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');
  const theme: ResolvedTheme = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    // browser chrome (mobile address bar, PWA title bar) follows the page
    const bg = getComputedStyle(root).getPropertyValue('--bg-primary').trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', `rgb(${bg})`);
  }, [theme]);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    try { localStorage.setItem(THEME_KEY, pref); } catch { /* storage unavailable */ }
  }, []);

  const value = useMemo(() => ({ preference, theme, setPreference }), [preference, theme, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
