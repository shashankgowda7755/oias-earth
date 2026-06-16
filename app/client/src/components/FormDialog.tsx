/**
 * MUI-Dialog-like modal used for entity create/edit (spec EntityFormDialog).
 * Renders a backdrop + centered surface. Footer has Cancel / Reset / Save.
 *
 * Usage: wrap your fields in a <form> via the `onSubmit` prop (Save triggers
 * form submit so native required validation + Enter-to-submit work). The
 * dialog itself owns no field state — the consuming module manages that.
 *
 * Accessibility: role="dialog" + aria-modal, labelled by the title, Escape to
 * close, focus moved to the panel on open, backdrop click closes (guarded so a
 * mid-submit click can't dismiss).
 */
import {
  useEffect,
  useRef,
  type FormEvent,
  type ReactNode,
} from 'react';
import { Button } from './Buttons';

export interface FormDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  /** Called on Save. Receives the form submit event (preventDefault already done). */
  onSubmit: () => void | Promise<void>;
  onClose: () => void;
  /** Optional Reset handler. If omitted, the Reset button is hidden. */
  onReset?: () => void;
  submitting?: boolean;
  /** Save button label. Default "Save". */
  submitLabel?: string;
  /** Disable Save independent of submitting (e.g. invalid form). */
  submitDisabled?: boolean;
  /** Constrain panel width. Default "md". */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  /** Replace the default footer entirely (e.g. wizard Back/Next). */
  footer?: ReactNode;
}

const MAX_WIDTH: Record<NonNullable<FormDialogProps['maxWidth']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};

export function FormDialog({
  open,
  title,
  children,
  onSubmit,
  onClose,
  onReset,
  submitting = false,
  submitLabel = 'Save',
  submitDisabled = false,
  maxWidth = 'md',
  footer,
}: FormDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useRef(`dlg-${Math.random().toString(36).slice(2)}`).current;

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    document.addEventListener('keydown', onKey);
    // prevent background scroll while open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, submitting, onClose]);

  if (!open) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void onSubmit();
  };

  return (
    <div
      className="fixed inset-0 z-[1300] flex items-center justify-center p-4"
      onMouseDown={(e) => {
        // close only when the backdrop itself is clicked (not the panel)
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative z-10 flex max-h-[90vh] w-full ${MAX_WIDTH[maxWidth]} flex-col rounded-card bg-surface shadow-dialog outline-none`}
      >
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 id={titleId} className="text-lg font-semibold text-textPrimary">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close dialog"
            className="rounded-full p-1 text-textSecondary hover:bg-black/5 hover:text-textPrimary disabled:opacity-50"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>

          {footer ?? (
            <footer className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
              <Button variant="text" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              {onReset ? (
                <Button variant="outlined" onClick={onReset} disabled={submitting}>
                  Reset
                </Button>
              ) : null}
              <Button
                type="submit"
                variant="primary"
                loading={submitting}
                disabled={submitDisabled}
              >
                {submitLabel}
              </Button>
            </footer>
          )}
        </form>
      </div>
    </div>
  );
}
