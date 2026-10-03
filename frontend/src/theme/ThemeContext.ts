import { createContext, useContext, useMemo, useSyncExternalStore } from 'react';

// Keep in sync with the inline script in index.html, which applies the saved
// theme before first paint.
export const THEME_KEY = 'rema.theme';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextValue {
  preference: ThemePreference;
  theme: ResolvedTheme;
  setPreference: (pref: ThemePreference) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

export type ThemeToken =
  | 'bg-primary' | 'bg-secondary' | 'bg-elevated' | 'bg-border' | 'bg-hover' | 'bg-border-strong'
  | 'accent-red' | 'accent-orange' | 'accent-yellow' | 'accent-green' | 'accent-blue' | 'accent-cyan'
  | 'text-primary' | 'text-secondary' | 'text-muted';

// The theme actually applied to <html>. ThemeProvider sets data-theme in an
// effect, so observing the attribute (rather than the provider's state) makes
// colour lookups re-run only once the new CSS variables are in effect.
function subscribeAppliedTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}
const getAppliedTheme = () => document.documentElement.dataset.theme ?? 'dark';

/**
 * Resolves theme tokens to concrete colour strings for places that can't use
 * Tailwind classes — chart libraries, SVG attributes, Leaflet layers.
 * Re-renders when the theme changes.
 */
export function useThemeColors() {
  const applied = useSyncExternalStore(subscribeAppliedTheme, getAppliedTheme, () => 'dark');
  return useMemo(() => {
    const style = getComputedStyle(document.documentElement);
    return (token: ThemeToken, alpha = 1) => {
      const channels = style.getPropertyValue(`--${token}`).trim().split(/\s+/).join(', ');
      return alpha === 1 ? `rgb(${channels})` : `rgba(${channels}, ${alpha})`;
    };
    // applied isn't read inside, but it is what changes the computed values
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied]);
}
