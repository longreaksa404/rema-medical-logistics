import { type ReactNode } from 'react';
import { ArrowUpCircle, RefreshCw, RotateCcw, Sparkles, type LucideIcon } from 'lucide-react';
import { useI18n } from '../i18n';

// ─── PROPS ────────────────────────────────────────────────────────────────────

interface DashboardLayoutProps {
  title: string;
  children: ReactNode;
  onRefresh?: () => void;
  lastUpdated?: Date | null;
  isRefreshing?: boolean;
  // AI Brief
  onAiBrief?: () => void;
  aiBriefLoading?: boolean;
  showAiBrief?: boolean;
  // Phase advance
  onAdvancePhase?: () => void;
  advancePhaseLoading?: boolean;
  showAdvancePhase?: boolean;
  advancePhaseLabel?: string;
  // Phase reset
  onReset?: () => void;
  resetLoading?: boolean;
  showReset?: boolean;
}

// ─── HEADER BUTTON ────────────────────────────────────────────────────────────

type Tone = 'blue' | 'orange' | 'red' | 'neutral';

const TONE: Record<Tone, string> = {
  blue:    'border-accent-blue/40 text-accent-blue bg-accent-blue/10 hover:bg-accent-blue/20 hover:border-accent-blue/70',
  orange:  'border-accent-orange/40 text-accent-orange bg-accent-orange/10 hover:bg-accent-orange/20 hover:border-accent-orange/70',
  red:     'border-accent-red/30 text-accent-red bg-transparent hover:bg-accent-red/10 hover:border-accent-red/60',
  neutral: 'border-bg-border text-text-secondary hover:text-text-primary hover:bg-bg-hover',
};

function HeaderButton({
  onClick, loading, tone, Icon, label, loadingLabel, title, iconOnlyOnMobile = true,
}: {
  onClick: () => void;
  loading: boolean;
  tone: Tone;
  Icon: LucideIcon;
  label: string;
  loadingLabel: string;
  title: string;
  iconOnlyOnMobile?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      title={title}
      aria-label={label}
      aria-busy={loading}
      className={`
        inline-flex items-center gap-1.5 h-8 px-3 rounded-md border font-sans text-xs font-medium whitespace-nowrap
        transition-colors duration-150 active:scale-[0.98]
        disabled:cursor-not-allowed disabled:opacity-60
        ${TONE[tone]}
      `}
    >
      {loading
        ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
        : <Icon size={14} strokeWidth={2} className="flex-shrink-0" />}
      <span className={iconOnlyOnMobile ? 'hidden sm:inline' : ''}>{loading ? loadingLabel : label}</span>
    </button>
  );
}

// ─── LAYOUT ───────────────────────────────────────────────────────────────────

export function DashboardLayout({
  title,
  children,
  onRefresh,
  lastUpdated,
  isRefreshing = false,
  onAiBrief,
  aiBriefLoading = false,
  showAiBrief = false,
  onAdvancePhase,
  advancePhaseLoading = false,
  showAdvancePhase = false,
  advancePhaseLabel,
  onReset,
  resetLoading = false,
  showReset = false,
}: DashboardLayoutProps) {
  const { t, locale } = useI18n();
  const hasPhaseControls = (showAdvancePhase && onAdvancePhase) || (showReset && onReset);

  return (
    <div className="flex-1 flex flex-col min-h-0">

      {/* ── HEADER ── */}
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 md:px-6 py-3 border-b border-bg-border bg-bg-primary/95 backdrop-blur flex-shrink-0">

        {/* Left — title + last updated */}
        <div className="flex items-baseline gap-3 min-w-0">
          <h1 className="font-display font-bold text-text-primary text-lg leading-tight truncate">
            {title}
          </h1>
          {lastUpdated && (
            <span className="font-mono text-[11px] text-text-muted hidden sm:inline whitespace-nowrap">
              {t('layout.updated')} {lastUpdated.toLocaleTimeString(locale, {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
          )}
        </div>

        {/* Right — actions. Destructive reset sits last, apart from the rest. */}
        <div className="flex items-center gap-2 flex-shrink-0">

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              title={t('layout.refresh')}
              aria-label={t('layout.refresh')}
              className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-bg-border text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          )}

          {showAiBrief && onAiBrief && (
            <HeaderButton
              onClick={onAiBrief}
              loading={aiBriefLoading}
              tone="blue"
              Icon={Sparkles}
              label={t('layout.aiBrief')}
              loadingLabel={t('layout.generating')}
              title={t('layout.aiBriefTitle')}
            />
          )}

          {hasPhaseControls && (showAiBrief || onRefresh) && (
            <div className="h-5 w-px bg-bg-border flex-shrink-0 mx-0.5" aria-hidden="true" />
          )}

          {showAdvancePhase && onAdvancePhase && (
            <HeaderButton
              onClick={onAdvancePhase}
              loading={advancePhaseLoading}
              tone="orange"
              Icon={ArrowUpCircle}
              label={advancePhaseLabel ?? t('layout.advancePhase')}
              loadingLabel={t('layout.advancing')}
              title={advancePhaseLabel ?? t('layout.advancePhase')}
            />
          )}

          {showReset && onReset && (
            <HeaderButton
              onClick={onReset}
              loading={resetLoading}
              tone="red"
              Icon={RotateCcw}
              label={t('layout.closeEvent')}
              loadingLabel={t('layout.closing')}
              title={t('layout.closeEventTitle')}
            />
          )}

        </div>
      </header>

      {/* ── CONTENT ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6 max-w-[1600px] mx-auto w-full">
          {children}
        </div>
      </div>

    </div>
  );
}
