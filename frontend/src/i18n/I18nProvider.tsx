import { useCallback, useEffect, useMemo, useState } from 'react';
import { en, type MessageKey } from './en';
import { km } from './km';
import { I18nContext, LANG_KEY, type Lang, type Translate, type TranslateVars } from './I18nContext';

const DICTIONARIES: Record<Lang, Record<MessageKey, string>> = { en, km };

// Intl locale per language. Dates/times keep Latin digits in both.
const LOCALE: Record<Lang, string> = { en: 'en-GB', km: 'km-KH' };

function readLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'en' || saved === 'km') return saved;
  } catch { /* storage unavailable */ }
  return 'en';
}

function interpolate(template: string, vars?: TranslateVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try { localStorage.setItem(LANG_KEY, next); } catch { /* storage unavailable */ }
  }, []);

  const t = useCallback<Translate>(
    (key, vars) => interpolate(DICTIONARIES[lang][key] ?? en[key] ?? key, vars),
    [lang],
  );

  const value = useMemo(() => ({ lang, locale: LOCALE[lang], setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
