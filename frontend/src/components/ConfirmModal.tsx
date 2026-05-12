import { useEffect } from 'react';

// ─── PROPS ────────────────────────────────────────────────────────────────────

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export function ConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const accentColor = variant === 'danger' ? 'accent-red' : 'accent-yellow';
  const iconColor = variant === 'danger' ? 'text-accent-red' : 'text-accent-yellow';
  const borderColor = variant === 'danger' ? 'border-accent-red/20' : 'border-accent-yellow/20';
  const bgColor = variant === 'danger' ? 'bg-accent-red/5' : 'bg-accent-yellow/5';
  const confirmBtnClass = variant === 'danger'
    ? 'border-accent-red/50 bg-accent-red/10 text-accent-red hover:bg-accent-red/20 hover:border-accent-red/70'
    : 'border-accent-yellow/50 bg-accent-yellow/10 text-accent-yellow hover:bg-accent-yellow/20 hover:border-accent-yellow/70';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`
            pointer-events-auto
            w-full max-w-sm
            bg-bg-surface border ${borderColor} rounded-lg shadow-2xl
            animate-fade-in
          `}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`px-5 pt-5 pb-4 border-b ${borderColor} ${bgColor} rounded-t-lg`}>
            <div className="flex items-center gap-3">
              {/* Icon */}
              <div className={`flex-shrink-0 w-8 h-8 rounded border ${borderColor} ${bgColor} flex items-center justify-center`}>
                {variant === 'danger' ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={iconColor}>
                    <path
                      d="M1 7a6 6 0 1 0 2.1-4.55"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                    <path
                      d="M1 2.5v3H4"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={iconColor}>
                    <path
                      d="M7 2v5M7 10v.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3" />
                  </svg>
                )}
              </div>
              <h3 className={`font-mono text-sm font-semibold ${iconColor} uppercase tracking-widest`}>
                {title}
              </h3>
            </div>
          </div>

          {/* Body */}
          <div className="px-5 py-4">
            <p className="font-mono text-xs text-text-secondary leading-relaxed">
              {description}
            </p>
          </div>

          {/* Footer */}
          <div className="px-5 pb-5 flex items-center justify-end gap-2">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="
                font-mono text-xs px-4 py-2 rounded border
                border-bg-border text-text-muted
                hover:text-text-primary hover:border-text-muted/40
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-150 active:scale-95
              "
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`
                font-mono text-xs px-4 py-2 rounded border
                ${confirmBtnClass}
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-150 active:scale-95
                flex items-center gap-1.5
              `}
            >
              {isLoading ? (
                <>
                  <div className={`w-3 h-3 border border-${accentColor}/40 border-t-${accentColor} rounded-full animate-spin`} />
                  <span>Processing...</span>
                </>
              ) : (
                confirmLabel
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}