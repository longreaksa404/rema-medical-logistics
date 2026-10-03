import { useI18n, type MessageKey } from '../i18n';

interface PhaseBannerProps {
  phase: 0 | 1 | 2;
  activated: boolean;
  activatedAt: string | null;
  triggerConditions?: {
    warningLevelTwo: boolean;
    rainfallExceeds100mm: boolean;
    streetFloodingReport: boolean;
  } | null;
}

const PHASE_CONFIG = {
  0: {
    label: 'phase.0.label',
    description: 'phase.0.description',
    color: 'text-text-muted',
    bg: 'bg-bg-elevated',
    border: 'border-bg-border',
    dot: 'bg-text-muted',
  },
  1: {
    label: 'phase.1.label',
    description: 'phase.1.description',
    color: 'text-accent-orange',
    bg: 'bg-accent-orange/10',
    border: 'border-accent-orange/30',
    dot: 'bg-accent-orange',
  },
  2: {
    label: 'phase.2.label',
    description: 'phase.2.description',
    color: 'text-accent-red',
    bg: 'bg-accent-red/10',
    border: 'border-accent-red/30',
    dot: 'bg-accent-red',
  },
} satisfies Record<0 | 1 | 2, { label: MessageKey; description: MessageKey; color: string; bg: string; border: string; dot: string }>;

const TRIGGER_LABELS: Record<string, MessageKey> = {
  warningLevelTwo: 'trigger.warningLevelTwo.short',
  rainfallExceeds100mm: 'trigger.rainfall.short',
  streetFloodingReport: 'trigger.streetFlooding.short',
};

export function PhaseBanner({ phase, activated, activatedAt, triggerConditions }: PhaseBannerProps) {
  const config = PHASE_CONFIG[phase];
  const { t, locale } = useI18n();

  const formattedActivatedAt = activatedAt
    ? new Date(activatedAt).toLocaleString(locale, {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div
      className={`w-full border rounded-lg px-5 py-3.5 flex items-center justify-between gap-4 ${config.bg} ${config.border} transition-colors duration-300`}
    >
      {/* Left — phase indicator */}
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${config.dot} ${
            activated ? 'animate-pulse-slow' : ''
          }`}
        />
        <div className="min-w-0">
          <p className={`font-mono text-xs font-semibold tracking-widest ${config.color}`}>
            {t(config.label)}
          </p>
          <p className="font-sans text-xs text-text-muted truncate">
            {t(config.description)}
          </p>
        </div>
      </div>

      {/* Right — triggers + activation time */}
      <div className="flex items-center gap-4 flex-shrink-0">
        {triggerConditions && (
          <div className="hidden sm:flex items-center gap-2">
            {(
              Object.entries(triggerConditions) as [
                keyof typeof triggerConditions,
                boolean
              ][]
            )
              .filter(([, value]) => !activated || value)
              .map(([key, value]) => (
                <span
                  key={key}
                  className={`font-mono text-[11px] px-2 py-0.5 rounded border ${
                    value
                      ? phase === 2
                        ? 'text-accent-red border-accent-red/40 bg-accent-red/10'
                        : 'text-accent-orange border-accent-orange/40 bg-accent-orange/10'
                      : 'text-text-muted border-bg-border bg-transparent'
                  }`}
                >
                  {t(TRIGGER_LABELS[key])}
                </span>
              ))}
          </div>
        )}

        {formattedActivatedAt && (
          <div className="text-right">
            <p className="font-mono text-[11px] text-text-muted">{t('phase.activated')}</p>
            <p className="font-mono text-xs text-text-secondary">{formattedActivatedAt}</p>
          </div>
        )}
      </div>
    </div>
  );
}