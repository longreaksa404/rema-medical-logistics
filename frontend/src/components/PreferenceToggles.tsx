import { Moon, Sun, SunMoon, type LucideIcon } from 'lucide-react';
import { useTheme, type ThemePreference } from '../theme/ThemeContext';
import { useI18n, type Lang, type MessageKey } from '../i18n';

const THEME_OPTIONS: { value: ThemePreference; Icon: LucideIcon; label: MessageKey }[] = [
  { value: 'light',  Icon: Sun,     label: 'prefs.theme.light' },
  { value: 'dark',   Icon: Moon,    label: 'prefs.theme.dark' },
  { value: 'system', Icon: SunMoon, label: 'prefs.theme.system' },
];

// Language names are shown in their own script so either reader can find theirs.
const LANG_OPTIONS: { value: Lang; short: string; name: string }[] = [
  { value: 'en', short: 'EN',   name: 'English' },
  { value: 'km', short: 'ខ្មែរ', name: 'ភាសាខ្មែរ' },
];

const SEGMENT =
  'inline-flex items-center justify-center gap-1.5 rounded px-2 min-h-[28px] text-xs transition-colors duration-100';
const SEGMENT_ON  = 'bg-bg-secondary text-text-primary shadow-sm border border-bg-border';
const SEGMENT_OFF = 'text-text-muted hover:text-text-primary border border-transparent';

/** Segmented theme picker: light / dark / follow system. */
export function ThemeToggle({ showLabels = false }: { showLabels?: boolean }) {
  const { preference, setPreference } = useTheme();
  const { t } = useI18n();
  return (
    <div role="radiogroup" aria-label={t('prefs.theme')} className="inline-flex gap-0.5 p-0.5 rounded-md bg-bg-elevated border border-bg-border">
      {THEME_OPTIONS.map(({ value, Icon, label }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={preference === value}
          title={t(label)}
          aria-label={t(label)}
          onClick={() => setPreference(value)}
          className={`${SEGMENT} ${preference === value ? SEGMENT_ON : SEGMENT_OFF}`}
        >
          <Icon size={13} strokeWidth={1.75} />
          {showLabels && <span className="font-sans">{t(label)}</span>}
        </button>
      ))}
    </div>
  );
}

/** Segmented language picker: English / Khmer. */
export function LanguageToggle({ showNames = false }: { showNames?: boolean }) {
  const { lang, setLang, t } = useI18n();
  return (
    <div role="radiogroup" aria-label={t('prefs.language')} className="inline-flex gap-0.5 p-0.5 rounded-md bg-bg-elevated border border-bg-border">
      {LANG_OPTIONS.map(({ value, short, name }) => (
        <button
          key={value}
          type="button"
          role="radio"
          lang={value}
          aria-checked={lang === value}
          title={name}
          aria-label={name}
          onClick={() => setLang(value)}
          className={`${SEGMENT} font-sans ${lang === value ? SEGMENT_ON : SEGMENT_OFF}`}
        >
          {showNames ? name : short}
        </button>
      ))}
    </div>
  );
}

/** Both pickers side by side — used on the login screen and in the sidebar. */
export function PreferenceToggles() {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <LanguageToggle />
      <ThemeToggle />
    </div>
  );
}
