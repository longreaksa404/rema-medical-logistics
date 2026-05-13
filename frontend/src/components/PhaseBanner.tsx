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
    label: 'STANDBY',
    description: 'Monitoring flood conditions — not yet activated',
    color: 'text-text-muted',
    bg: 'bg-bg-elevated',
    border: 'border-bg-border',
    dot: 'bg-text-muted',
  },
  1: {
    label: 'PHASE 1 — ACTIVE',
    description: 'Hours 0–24 · Pre-positioning supplies to sub-warehouses',
    color: 'text-accent-orange',
    bg: 'bg-accent-orange/10',
    border: 'border-accent-orange/30',
    dot: 'bg-accent-orange',
  },
  2: {
    label: 'PHASE 2 — DELIVERY',
    description: 'Hours 24–48 · Adaptive last-mile delivery in progress',
    color: 'text-accent-red',
    bg: 'bg-accent-red/10',
    border: 'border-accent-red/30',
    dot: 'bg-accent-red',
  },
};

const TRIGGER_LABELS = {
  warningLevelTwo: 'Warning Lv.2',
  rainfallExceeds100mm: '100mm Rain',
  streetFloodingReport: 'Street Flooding',
};

export function PhaseBanner({ phase, activated, activatedAt, triggerConditions }: PhaseBannerProps) {
  const config = PHASE_CONFIG[phase];

  const formattedActivatedAt = activatedAt
    ? new Date(activatedAt).toLocaleString('en-GB', {
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
            {config.label}
          </p>
          <p className="font-sans text-xs text-text-muted truncate">
            {config.description}
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
                  className={`font-mono text-[10px] px-2 py-0.5 rounded border ${
                    value
                      ? phase === 2
                        ? 'text-accent-red border-accent-red/40 bg-accent-red/10'
                        : 'text-accent-orange border-accent-orange/40 bg-accent-orange/10'
                      : 'text-text-muted border-bg-border bg-transparent'
                  }`}
                >
                  {TRIGGER_LABELS[key]}
                </span>
              ))}
          </div>
        )}

        {formattedActivatedAt && (
          <div className="text-right">
            <p className="font-mono text-[10px] text-text-muted">Activated</p>
            <p className="font-mono text-xs text-text-secondary">{formattedActivatedAt}</p>
          </div>
        )}
      </div>
    </div>
  );
}