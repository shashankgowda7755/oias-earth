/**
 * Create / Edit Report dialog.
 *
 * Fields (writable columns confirmed by server CRUD whitelist + Report data
 * model): Forest (select), Year, Quarter, Report Date, Plantation Date, Start
 * Date, End Date, Mode, Type, Version, Project Period, and a free-form
 * report_data JSON textarea.
 *
 * Validation is client-side with inline errors (see validateReportForm). The
 * dialog is fully controlled here; FormDialog (shared) owns the modal chrome,
 * Save/Cancel/Reset footer, focus trap, Escape, and submit wiring.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  FormDialog,
  SelectField,
  TextAreaField,
  TextField,
} from '../../components';
import type { ForestOption } from './reportApi';
import {
  MODE_OPTIONS,
  QUARTER_OPTIONS,
  TYPE_OPTIONS,
  validateReportForm,
  type ReportFormErrors,
  type ReportFormState,
} from './reportForms';

export interface ReportFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialValue: ReportFormState;
  forestOptions: ForestOption[];
  forestOptionsLoading: boolean;
  submitting: boolean;
  onSubmit: (state: ReportFormState) => void;
  onClose: () => void;
}

export function ReportFormDialog({
  open,
  mode,
  initialValue,
  forestOptions,
  forestOptionsLoading,
  submitting,
  onSubmit,
  onClose,
}: ReportFormDialogProps) {
  const [form, setForm] = useState<ReportFormState>(initialValue);
  const [errors, setErrors] = useState<ReportFormErrors>({});
  const [touched, setTouched] = useState(false);

  // Reset the form whenever the dialog (re)opens or the target row changes.
  useEffect(() => {
    if (open) {
      setForm(initialValue);
      setErrors({});
      setTouched(false);
    }
  }, [open, initialValue]);

  const set =
    (key: keyof ReportFormState) =>
    (value: string) => {
      setForm((f) => {
        const next = { ...f, [key]: value };
        if (touched) setErrors(validateReportForm(next));
        return next;
      });
    };

  const quarterOptions = useMemo(
    () => QUARTER_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    [],
  );
  const modeOptions = useMemo(
    () => MODE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    [],
  );
  const typeOptions = useMemo(
    () => TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    [],
  );

  const handleSubmit = () => {
    setTouched(true);
    const validation = validateReportForm(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;
    onSubmit(form);
  };

  const handleReset = () => {
    setForm(initialValue);
    setErrors({});
    setTouched(false);
  };

  return (
    <FormDialog
      open={open}
      title={mode === 'create' ? 'Add Report' : 'Edit Report'}
      onSubmit={handleSubmit}
      onClose={onClose}
      onReset={handleReset}
      submitting={submitting}
      submitLabel={mode === 'create' ? 'Create' : 'Save'}
      maxWidth="lg"
    >
      <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
        <SelectField
          label="Forest"
          value={form.forest_id}
          onChange={set('forest_id')}
          options={forestOptions}
          required
          error={errors.forest_id}
          placeholder={
            forestOptionsLoading ? 'Loading forests…' : 'Select a forest'
          }
          disabled={forestOptionsLoading}
          className="sm:col-span-2"
        />

        <TextField
          label="Year"
          type="number"
          inputMode="numeric"
          value={form.year}
          onChange={set('year')}
          required
          error={errors.year}
        />
        <SelectField
          label="Quarter"
          value={form.quarter}
          onChange={set('quarter')}
          options={quarterOptions}
          required
          error={errors.quarter}
          placeholder="Select a quarter"
        />

        <DateField
          label="Report Date"
          value={form.report_date}
          onChange={set('report_date')}
          error={errors.report_date}
        />
        <DateField
          label="Plantation Date"
          value={form.plantation_date}
          onChange={set('plantation_date')}
          error={errors.plantation_date}
        />
        <DateField
          label="Start Date"
          value={form.start_date}
          onChange={set('start_date')}
          error={errors.start_date}
        />
        <DateField
          label="End Date"
          value={form.end_date}
          onChange={set('end_date')}
          error={errors.end_date}
        />

        <p className="sm:col-span-2 text-sm text-textSecondary">
          You only need Forest, Year and Quarter to start. Enter the report
          content — photos, weather, growth, maintenance — in the guided editor
          after creating.
        </p>

        {/* Advanced: index metadata the renderer does not read. Defaults are
            automatic / quarterly / v1, so most operators never open this. */}
        <details className="sm:col-span-2 rounded-input border border-border bg-surface/50 px-3 py-2">
          <summary className="cursor-pointer select-none text-sm font-medium text-textSecondary">
            Advanced (optional)
          </summary>
          <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
            <SelectField
              label="Mode"
              value={form.mode}
              onChange={set('mode')}
              options={modeOptions}
              error={errors.mode}
              placeholder="Select a mode"
            />
            <SelectField
              label="Type"
              value={form.type}
              onChange={set('type')}
              options={typeOptions}
              error={errors.type}
              placeholder="Select a type"
            />
            <TextField
              label="Version"
              type="number"
              inputMode="numeric"
              value={form.version}
              onChange={set('version')}
              error={errors.version}
            />
            <TextField
              label="Project Period (years)"
              type="number"
              inputMode="numeric"
              value={form.project_period}
              onChange={set('project_period')}
              error={errors.project_period}
            />
            <TextAreaField
              label="Report Data (JSON)"
              value={form.report_data}
              onChange={set('report_data')}
              rows={6}
              error={errors.report_data}
              helperText={
                errors.report_data
                  ? undefined
                  : 'Advanced/legacy. The report renders from the guided editor, not this field.'
              }
              className="sm:col-span-2 font-mono"
            />
          </div>
        </details>
      </div>
    </FormDialog>
  );
}

/**
 * Native date input with the same floating-label look as the shared TextField.
 * The shared TextField type union doesn't include "date", so we render a small
 * local control rather than editing shared components.
 */
function DateField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const id = `date-${label.replace(/\s+/g, '-').toLowerCase()}`;
  const describedBy = error ? `${id}-help` : undefined;
  return (
    <div className="relative">
      <input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={`peer w-full rounded-input border bg-surface px-3 py-3 text-[15px] text-textPrimary outline-none transition-colors focus:ring-1 ${
          error
            ? 'border-danger focus:border-danger focus:ring-danger'
            : 'border-border focus:border-primary focus:ring-primary'
        }`}
      />
      <label
        htmlFor={id}
        className={`pointer-events-none absolute -top-2 left-2 z-10 bg-surface px-1 text-label transition-all ${
          error ? 'text-danger' : 'text-textSecondary'
        }`}
      >
        {label}
      </label>
      {error ? (
        <p id={describedBy} className="mt-1 px-1 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
