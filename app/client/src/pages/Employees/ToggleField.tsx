/**
 * Accessible on/off switch for the "Active" field.
 *
 * SHARED-COMPONENT GAP: the shared field set (@/components fields) exposes
 * TextField / PasswordField / TextAreaField / SelectField but NO boolean /
 * checkbox / switch control. The Employees form needs an Active toggle
 * (spec dataModel[Employee].isActive). Rather than mis-model a boolean as a
 * Yes/No <select>, this module ships a small local switch that visually matches
 * the MUI-style green theme. If a shared `SwitchField`/`CheckboxField` is added
 * later, this can be deleted and swapped — flagged in the agent return so the
 * integrator can promote it to the shared layer.
 *
 * Implemented as a real ARIA switch: role="switch" + aria-checked, operable by
 * mouse, Space and Enter, with a visible focus ring and an associated label.
 */
import { useId } from 'react';

export interface ToggleFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  name?: string;
  id?: string;
  disabled?: boolean;
  helperText?: string;
}

export function ToggleField({
  label,
  checked,
  onChange,
  name,
  id,
  disabled,
  helperText,
}: ToggleFieldProps) {
  const autoId = useId();
  const switchId = id ?? autoId;
  const helpId = helperText ? `${switchId}-help` : undefined;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-4">
        <label htmlFor={switchId} className="text-sm text-textPrimary">
          {label}
        </label>
        <button
          type="button"
          id={switchId}
          name={name}
          role="switch"
          aria-checked={checked}
          aria-describedby={helpId}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
            checked ? 'bg-primary' : 'bg-black/20'
          }`}
        >
          <span className="sr-only">{checked ? 'On' : 'Off'}</span>
          <span
            aria-hidden="true"
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              checked ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
      {helperText ? (
        <p id={helpId} className="text-xs text-textSecondary">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
