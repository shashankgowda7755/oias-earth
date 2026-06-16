/**
 * Outlined form fields with a floating-label look (MUI parity), implemented in
 * Tailwind. Exports: TextField, PasswordField, TextAreaField, SelectField.
 *
 * All variants share a common contract:
 *   - controlled (`value` + `onChange`) — onChange receives the next string
 *     value directly (not the DOM event) for ergonomic form code.
 *   - `label` is required and doubles as the accessible name (htmlFor/id).
 *   - `required` renders a "*" suffix on the label.
 *   - `error` (string) renders danger styling + helper text and sets
 *     aria-invalid / aria-describedby.
 *   - `helperText` shows beneath when there is no error.
 *
 * Accessibility: every control has an associated <label htmlFor>, error text
 * is wired via aria-describedby, and disabled/required map to native attrs.
 */
import {
  useId,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { useState } from 'react';
import { controlBase, fieldWrapper, floatingLabel, helperText } from './fieldStyles';

interface BaseFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  name?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
}

function Label({
  htmlFor,
  label,
  required,
  hasError,
}: {
  htmlFor: string;
  label: string;
  required?: boolean;
  hasError: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className={floatingLabel(hasError)}>
      {label}
      {required ? <span aria-hidden="true"> *</span> : null}
    </label>
  );
}

function HelperOrError({
  id,
  error,
  helper,
}: {
  id: string;
  error?: string;
  helper?: string;
}) {
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

/* ----------------------------- TextField ----------------------------- */

export interface TextFieldProps extends BaseFieldProps {
  type?: 'text' | 'email' | 'number' | 'tel' | 'url';
  placeholder?: string;
  autoComplete?: string;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email' | 'url';
}

export function TextField({
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
  type = 'text',
  placeholder = ' ',
  autoComplete,
  inputMode,
}: TextFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const describedBy = error || helper ? `${fieldId}-help` : undefined;
  return (
    <div className={`${fieldWrapper} ${className}`}>
      <input
        id={fieldId}
        name={name}
        type={type}
        value={value}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
        inputMode={inputMode}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        onChange={(e) => onChange(e.target.value)}
        className={controlBase(Boolean(error), disabled)}
      />
      <Label htmlFor={fieldId} label={label} required={required} hasError={Boolean(error)} />
      <HelperOrError id={`${fieldId}-help`} error={error} helper={helper} />
    </div>
  );
}

/* --------------------------- PasswordField --------------------------- */

export interface PasswordFieldProps extends BaseFieldProps {
  placeholder?: string;
  autoComplete?: string;
}

export function PasswordField({
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
  placeholder = ' ',
  autoComplete = 'current-password',
}: PasswordFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const [visible, setVisible] = useState(false);
  const describedBy = error || helper ? `${fieldId}-help` : undefined;
  return (
    <div className={`${fieldWrapper} ${className}`}>
      <input
        id={fieldId}
        name={name}
        type={visible ? 'text' : 'password'}
        value={value}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        onChange={(e) => onChange(e.target.value)}
        className={`${controlBase(Boolean(error), disabled)} pr-11`}
      />
      <Label htmlFor={fieldId} label={label} required={required} hasError={Boolean(error)} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        disabled={disabled}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-textSecondary hover:text-textPrimary"
        tabIndex={0}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
      <HelperOrError id={`${fieldId}-help`} error={error} helper={helper} />
    </div>
  );
}

/* --------------------------- TextAreaField --------------------------- */

export interface TextAreaFieldProps extends BaseFieldProps {
  rows?: number;
  placeholder?: string;
  maxLength?: TextareaHTMLAttributes<HTMLTextAreaElement>['maxLength'];
}

export function TextAreaField({
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
  rows = 3,
  placeholder = ' ',
  maxLength,
}: TextAreaFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const describedBy = error || helper ? `${fieldId}-help` : undefined;
  return (
    <div className={`${fieldWrapper} ${className}`}>
      <textarea
        id={fieldId}
        name={name}
        rows={rows}
        value={value}
        disabled={disabled}
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        onChange={(e) => onChange(e.target.value)}
        className={`${controlBase(Boolean(error), disabled)} resize-y`}
      />
      <Label htmlFor={fieldId} label={label} required={required} hasError={Boolean(error)} />
      <HelperOrError id={`${fieldId}-help`} error={error} helper={helper} />
    </div>
  );
}

/* --------------------------- SelectField --------------------------- */

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectFieldProps extends BaseFieldProps {
  options: SelectOption[];
  /** Placeholder option text shown when value is empty. */
  placeholder?: string;
  nativeProps?: Omit<
    SelectHTMLAttributes<HTMLSelectElement>,
    'value' | 'onChange' | 'id' | 'name' | 'disabled' | 'required'
  >;
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  name,
  id,
  required,
  disabled,
  error,
  helperText: helper,
  className = '',
  placeholder = '',
  nativeProps,
}: SelectFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const describedBy = error || helper ? `${fieldId}-help` : undefined;
  // A select always "shows" a value, so the label floats whenever value is set.
  // We keep the label raised permanently for selects (MUI does the same) to
  // avoid it overlapping the chosen option.
  const raised = true;
  return (
    <div className={`${fieldWrapper} ${className}`}>
      <select
        id={fieldId}
        name={name}
        value={value}
        disabled={disabled}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        onChange={(e) => onChange(e.target.value)}
        className={`${controlBase(Boolean(error), disabled)} appearance-none pr-9`}
        {...nativeProps}
      >
        <option value="" disabled={required}>
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      <label
        htmlFor={fieldId}
        className={`pointer-events-none absolute left-2 ${raised ? '-top-2 text-label' : 'top-3 text-[15px]'} z-10 bg-surface px-1 transition-all ${
          error ? 'text-danger' : 'text-textSecondary'
        }`}
      >
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-textSecondary">
        <ChevronDownIcon />
      </span>
      <HelperOrError id={`${fieldId}-help`} error={error} helper={helper} />
    </div>
  );
}

/* ------------------------------ Icons ------------------------------ */

function EyeIcon(): ReactNode {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon(): ReactNode {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function ChevronDownIcon(): ReactNode {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
