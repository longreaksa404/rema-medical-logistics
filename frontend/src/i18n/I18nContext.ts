import { createContext, useContext } from 'react';
import type { MessageKey } from './en';

// Keep in sync with the inline script in index.html, which sets <html lang>
// before first paint.
export const LANG_KEY = 'rema.lang';

export type Lang = 'en' | 'km';
export type TranslateVars = Record<string, string | number>;
export type Translate = (key: MessageKey, vars?: TranslateVars) => string;

export interface I18nContextValue {
  lang: Lang;
  locale: string;
  setLang: (lang: Lang) => void;
  /** Looks up a message and fills `{name}` placeholders from `vars`. */
  t: Translate;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
