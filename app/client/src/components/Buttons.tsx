/**
 * Shared buttons used in DataTable toolbars and dialogs.
 *   - Button: generic variant-driven button (primary / outlined / text / danger).
 *   - AddButton: green primary "+ Add X" (spec AddButton).
 *   - FilterButton: funnel icon button (spec FilterButton).
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'outlined' | 'text' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  startIcon?: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-darkInk font-semibold hover:bg-primary-hover disabled:bg-primary/40',
  outlined:
    'border border-border bg-transparent text-textPrimary hover:bg-white/5 disabled:opacity-50',
  text: 'bg-transparent text-textPrimary hover:bg-white/5 disabled:opacity-50',
  danger: 'bg-danger text-darkInk font-semibold hover:bg-danger-hover disabled:bg-danger/50',
};

export function Button({
  variant = 'primary',
  loading = false,
  startIcon,
  disabled,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-button px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    >
      {/* Both slots are wrapped in stable <span> elements so React's
          insertBefore anchor is always an element it owns — never a bare text
          node. Browser extensions (Google Translate, Grammarly, etc.) wrap
          loose text nodes in <font> tags, which detaches React's saved
          reference and crashes the toggle with
          "insertBefore: node is not a child of this node" on every save. */}
      <span className="contents">
        {loading ? <Spinner size={16} className="border-white/40 border-t-white" /> : startIcon}
      </span>
      <span className="contents">{children}</span>
    </button>
  );
}

export interface AddButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** e.g. "Add User" — rendered as "+ Add User". */
  label: string;
}

export function AddButton({ label, className = '', ...rest }: AddButtonProps) {
  return (
    <Button variant="primary" className={className} {...rest}>
      <span aria-hidden="true">+</span> {label}
    </Button>
  );
}

export interface FilterButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visually indicate active filters (e.g. accent border). */
  active?: boolean;
}

export function FilterButton({
  active = false,
  className = '',
  'aria-label': ariaLabel = 'Filter',
  ...rest
}: FilterButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={active}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-button border bg-surface text-textSecondary transition-colors hover:bg-white/5 ${
        active ? 'border-primary text-primary' : 'border-border'
      } ${className}`}
      {...rest}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
      </svg>
    </button>
  );
}
