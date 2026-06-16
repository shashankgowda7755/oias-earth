/**
 * Confirmation modal for destructive row actions (spec ConfirmDialog — delete).
 *
 * Deletes in this app are HARD (CONFIRMED, spec/write_contracts.md: the live
 * confirm dialog warns "cannot be undone" and cascade-detaches forests/trees).
 * The `danger` variant surfaces that warning automatically. The actual delete
 * call (api `deleteEntity` -> POST /<entity>/delete) is the module agent's job.
 */
import { useEffect, useRef } from 'react';
import { Button } from './Buttons';

export interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger styling for the confirm button (default true for deletes). */
  destructive?: boolean;
  /**
   * 'danger' variant for HARD deletes: shows the standing warning
   * "This action cannot be undone." beneath the message and forces the
   * destructive (red) confirm button. 'default' is a plain confirm.
   * Default 'danger' (the common case here is hard delete).
   */
  variant?: 'default' | 'danger';
  confirming?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

/** Standing warning copy for hard deletes (matches the live site). */
const HARD_DELETE_WARNING = 'This action cannot be undone.';

export function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  destructive,
  variant = 'danger',
  confirming = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useRef(`cfm-${Math.random().toString(36).slice(2)}`).current;
  const msgId = `${titleId}-msg`;

  // danger variant => red button + standing warning. `destructive` still wins
  // when explicitly set (back-compat with callers that toggle it directly).
  const isDanger = variant === 'danger';
  const useDestructive = destructive ?? isDanger;

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !confirming) onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, confirming, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1350] flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !confirming) onCancel();
      }}
    >
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={msgId}
        tabIndex={-1}
        className="relative z-10 w-full max-w-sm rounded-card bg-surface p-6 shadow-dialog outline-none"
      >
        <h2 id={titleId} className="text-lg font-semibold text-textPrimary">
          {title}
        </h2>
        <p id={msgId} className="mt-2 text-sm text-textSecondary">
          {message}
        </p>
        {isDanger ? (
          <p className="mt-2 text-sm font-medium text-danger">{HARD_DELETE_WARNING}</p>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="text" onClick={onCancel} disabled={confirming}>
            {cancelLabel}
          </Button>
          <Button
            variant={useDestructive ? 'danger' : 'primary'}
            onClick={() => void onConfirm()}
            loading={confirming}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
