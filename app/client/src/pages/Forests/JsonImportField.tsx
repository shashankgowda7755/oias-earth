/**
 * JsonImportField — paste-or-upload a JSON document into a controlled string.
 *
 * GAP / DIVERGENCE: the brief said a shared `JsonImportField` already exists in
 * client core. It does NOT in the current tree. I implement a self-contained one
 * here (owned dir `pages/Forests/**`) rather than touch shared components. If a
 * shared one lands later, import that and delete this file.
 *
 * Behaviour:
 *  - Large monospace <textarea> (the source of truth) + a "Choose .json file"
 *    button that reads a file into the textarea.
 *  - Accepts `.json` and `.jsonc` (the report-to-JSON skill emits jsonc).
 *  - Emits the raw string via onChange; parsing/validation is the parent's job
 *    (so the parent can show a live summary). An optional `error` renders below.
 *
 * Accessibility: labelled textarea, file input is a real <input type=file>
 * triggered by a styled <button>; error wired via aria-describedby/aria-invalid.
 */
import { useId, useRef, useState } from 'react';
import { Button } from '@/components';

export interface JsonImportFieldProps {
  value: string;
  onChange: (next: string) => void;
  label?: string;
  /** Validation/parse error to display under the field. */
  error?: string;
  /** Placeholder for the textarea. */
  placeholder?: string;
  disabled?: boolean;
  /** Visible textarea rows. Default 14. */
  rows?: number;
}

export function JsonImportField({
  value,
  onChange,
  label = 'Forest JSON',
  error,
  placeholder = 'Paste the forest/upsert JSON here, or choose a .json file…',
  disabled,
  rows = 14,
}: JsonImportFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const id = useId();
  const errorId = `${id}-err`;

  const onPick = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    onChange(text);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-textPrimary">
          {label}
        </label>
        <div className="flex items-center gap-2">
          {fileName ? (
            <span className="max-w-[12rem] truncate text-label text-textSecondary" title={fileName}>
              {fileName}
            </span>
          ) : null}
          <input
            ref={fileRef}
            type="file"
            accept=".json,.jsonc,application/json"
            className="sr-only"
            disabled={disabled}
            onChange={(e) => {
              void onPick(e.target.files?.[0]);
              // allow re-selecting the same file
              e.target.value = '';
            }}
          />
          <Button
            type="button"
            variant="outlined"
            disabled={disabled}
            onClick={() => fileRef.current?.click()}
          >
            Choose .json file
          </Button>
        </div>
      </div>

      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        spellCheck={false}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`w-full resize-y rounded-input border bg-surface px-3 py-2 font-mono text-xs leading-relaxed text-textPrimary outline-none focus:ring-2 focus:ring-primary ${
          error ? 'border-danger' : 'border-border'
        } disabled:cursor-not-allowed disabled:opacity-60`}
      />

      {error ? (
        <p id={errorId} className="mt-1 text-label text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
