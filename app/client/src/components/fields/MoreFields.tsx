/**
 * Additional shared form fields beyond the core text inputs in Fields.tsx:
 *   - SwitchField    (boolean toggle, MUI Switch look)
 *   - CheckboxField  (boolean checkbox)
 *   - DateField      (native date input with the floating-label outline look)
 *   - FileField      (file input with image preview — used for logos/images)
 *
 * SwitchField / CheckboxField are BOOLEAN-valued (value: boolean, onChange gets
 * a boolean) because the live UI's is_active / flags are booleans. DateField is
 * STRING-valued (ISO yyyy-mm-dd) so it shares the text-field contract. FileField
 * is FILE-valued (value: File | null) and renders a thumbnail preview for the
 * sponsor/employee logo + image uploads that the /upsert multipart contract
 * expects (spec/write_contracts.md).
 *
 * Accessibility: every control is wired to a <label>; errors set aria-invalid
 * and aria-describedby; required/disabled map to native attrs.
 */
import { useEffect, useId, useState, type ReactNode } from 'react';
import { controlBase, fieldWrapper, helperText } from './fieldStyles';

/* Shared error/helper text (kept local to avoid cross-file coupling). */
function HelperOrError({
  id,
  error,
  helper,
}: {
  id: string;
  error?: string;
  helper?: string;
}): ReactNode {
  if (error) {
    return (
      <p id={id} className={`${helperText} text-danger`}>
        {error}
      </p>
    );
  }
  if (helper) {
    return (
      <p id={id} className={`${helperText} text-textSecondary`}>
        {helper}
      </p>
    );
  }
  return null;
}

interface BooleanFieldProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  name?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
}

/* ----------------------------- SwitchField ----------------------------- */

export interface SwitchFieldProps extends BooleanFieldProps {}

export function SwitchField({
  label,
  value,
  onChange,
  name,
  id,
  required,
  disabled,
  error,
  helperText: helper,
  className = '',
}: SwitchFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const describedBy = error || helper ? `${fieldId}-help` : undefined;
  return (
    <div className={`w-full ${className}`}>
      <label
        htmlFor={fieldId}
        className={`inline-flex cursor-pointer items-center gap-3 ${
          disabled ? 'cursor-not-allowed opacity-60' : ''
        }`}
      >
        <span className="relative inline-block h-6 w-10 shrink-0">
          <input
            id={fieldId}
            name={name}
            type="checkbox"
            role="switch"
            checked={value}
            disabled={disabled}
            required={required}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            onChange={(e) => onChange(e.target.checked)}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-pill bg-black/25 transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40"
          />
          <span
            aria-hidden="true"
            className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4"
          />
        </span>
        <span className={`text-[15px] ${error ? 'text-danger' : 'text-textPrimary'}`}>
          {label}
          {required ? <span aria-hidden="true"> *</span> : null}
        </span>
      </label>
      <HelperOrError id={`${fieldId}-help`} error={error} helper={helper} />
    </div>
  );
}

/* ----------------------------- CheckboxField ----------------------------- */

export interface CheckboxFieldProps extends BooleanFieldProps {}

export function CheckboxField({
  label,
  value,
  onChange,
  name,
  id,
  required,
  disabled,
  error,
  helperText: helper,
  className = '',
}: CheckboxFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const describedBy = error || helper ? `${fieldId}-help` : undefined;
  return (
    <div className={`w-full ${className}`}>
      <label
        htmlFor={fieldId}
        className={`inline-flex cursor-pointer items-center gap-2 ${
          disabled ? 'cursor-not-allowed opacity-60' : ''
        }`}
      >
        <input
          id={fieldId}
          name={name}
          type="checkbox"
          checked={value}
          disabled={disabled}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 rounded-[3px] border-border text-primary accent-primary focus-visible:ring-2 focus-visible:ring-primary/40"
        />
        <span className={`text-[15px] ${error ? 'text-danger' : 'text-textPrimary'}`}>
          {label}
          {required ? <span aria-hidden="true"> *</span> : null}
        </span>
      </label>
      <HelperOrError id={`${fieldId}-help`} error={error} helper={helper} />
    </div>
  );
}

/* ----------------------------- DateField ----------------------------- */

export interface DateFieldProps {
  label: string;
  /** ISO date string `yyyy-mm-dd` (native <input type="date"> value). */
  value: string;
  onChange: (value: string) => void;
  name?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
  /** Bound the picker (ISO `yyyy-mm-dd`). */
  min?: string;
  max?: string;
}

export function DateField({
  label,
  value,
  onChange,
  name,
  id,
  required,
  disabled,
  error,
  helperText: helper,
  className = '',
  min,
  max,
}: DateFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const describedBy = error || helper ? `${fieldId}-help` : undefined;
  return (
    <div className={`${fieldWrapper} ${className}`}>
      <input
        id={fieldId}
        name={name}
        type="date"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        onChange={(e) => onChange(e.target.value)}
        className={controlBase(Boolean(error), disabled)}
      />
      {/* Date inputs always show a value placeholder, so float the label
          permanently (matches the SelectField treatment in Fields.tsx). */}
      <label
        htmlFor={fieldId}
        className={`pointer-events-none absolute left-2 -top-2 z-10 bg-surface px-1 text-label transition-all ${
          error ? 'text-danger' : 'text-textSecondary'
        }`}
      >
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <HelperOrError id={`${fieldId}-help`} error={error} helper={helper} />
    </div>
  );
}

/* ----------------------------- FileField ----------------------------- */

export interface FileFieldProps {
  label: string;
  /** Currently-selected File, or null. Controlled. */
  value: File | null;
  onChange: (file: File | null) => void;
  name?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
  /** `accept` attribute. Default 'image/*' (logos/images). */
  accept?: string;
  /**
   * Existing remote image URL to preview when no new File is picked yet
   * (e.g. an edit form showing the current sponsor_logo). Cleared visually once
   * the user selects a new file.
   */
  previewUrl?: string | null;
}

export function FileField({
  label,
  value,
  onChange,
  name,
  id,
  required,
  disabled,
  error,
  helperText: helper,
  className = '',
  accept = 'image/*',
  previewUrl = null,
}: FileFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const describedBy = error || helper ? `${fieldId}-help` : undefined;

  // Build/revoke an object URL for the chosen File so the preview updates live.
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!value) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const shownPreview = objectUrl ?? previewUrl ?? null;

  return (
    <div className={`w-full ${className}`}>
      <span className={`mb-1 block text-label ${error ? 'text-danger' : 'text-textSecondary'}`}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </span>
      <div className="flex items-center gap-3">
        {shownPreview ? (
          <img
            src={shownPreview}
            alt=""
            className="h-14 w-14 shrink-0 rounded-input border border-border object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-input border border-dashed border-border text-textSecondary"
          >
            <ImageIcon />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <input
            id={fieldId}
            name={name}
            type="file"
            accept={accept}
            disabled={disabled}
            required={required && !value && !previewUrl}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            onChange={(e) => onChange(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-textSecondary file:mr-3 file:rounded-button file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          />
          {value ? (
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={disabled}
              className="mt-1 text-label text-textSecondary underline hover:text-textPrimary"
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>
      <HelperOrError id={`${fieldId}-help`} error={error} helper={helper} />
    </div>
  );
}

function ImageIcon(): ReactNode {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}
