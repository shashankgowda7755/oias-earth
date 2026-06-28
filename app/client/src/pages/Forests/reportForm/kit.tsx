/**
 * Shared kit for the report-data section editors. Thin wrappers over the base
 * field components + a RepeatableRows helper for the per-quarter arrays
 * (maintenance, soil pH, temperature, growth, plantation progress, logos…).
 *
 * Every section editor has the signature ({ draft, patch }: SectionProps): it
 * reads its slice from `draft` and calls `patch({ key: next })` with its own
 * FullForestPayload keys. The container owns the single draft + Save.
 */
import { useState, type ReactNode } from 'react';
import type { FullForestPayload } from '../fullTypes';
import { TextField, TextAreaField, SelectField, type SelectOption } from '../../../components/fields/Fields';
import { DateField, SwitchField, FileField } from '../../../components/fields/MoreFields';
import { uploadReportImage } from '../forestApi';

export interface SectionProps {
  draft: FullForestPayload;
  patch: (p: Partial<FullForestPayload>) => void;
  onQuarterChange?: (q: number) => void;
}

/** Titled card wrapper for a group of fields. */
export function SectionShell({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <h3 className="text-base font-semibold text-textPrimary">{title}</h3>
      {desc ? <p className="mt-0.5 text-sm text-textSecondary">{desc}</p> : null}
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

/** Responsive field grid (default 2 columns). */
export function FieldGrid({ cols = 2, children }: { cols?: 1 | 2 | 3 | 4; children: ReactNode }) {
  const c = { 1: 'grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4' }[cols];
  return <div className={`grid grid-cols-1 gap-4 ${c}`}>{children}</div>;
}

/* ---- thin field adapters (string in/out unless noted) ---- */

export function Txt(props: { label: string; value?: string | number | null; onChange: (v: string) => void; placeholder?: string; multiline?: boolean }) {
  const v = props.value == null ? '' : String(props.value);
  if (props.multiline) return <TextAreaField label={props.label} name={props.label} value={v} onChange={props.onChange} placeholder={props.placeholder} />;
  return <TextField label={props.label} name={props.label} value={v} onChange={props.onChange} placeholder={props.placeholder} />;
}

/**
 * Number field — keeps the draft value numeric (undefined when blank, so a blank
 * reading means "not measured", never 0). Optional `min`/`max` add inline range
 * validation (e.g. pH 0–14, humidity 0–100).
 */
export function Num(props: {
  label: string;
  value?: number | null;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  helperText?: string;
}) {
  const v = props.value == null ? '' : String(props.value);
  const n = props.value;
  let err: string | undefined;
  if (n != null && Number.isFinite(n)) {
    if (props.min != null && n < props.min) err = `Must be ${props.min} or more`;
    else if (props.max != null && n > props.max) err = `Must be ${props.max} or less`;
  }
  return (
    <TextField
      label={props.label}
      name={props.label}
      type="number"
      value={v}
      onChange={(s) => props.onChange(s.trim() === '' ? undefined : Number(s))}
      placeholder={props.placeholder}
      error={err}
      helperText={props.helperText}
    />
  );
}

/** URL text field (image links — kept as a fallback when storage is unavailable). */
export function Url(props: { label: string; value?: string | null; onChange: (v: string) => void }) {
  return <TextField label={props.label} name={props.label} type="url" value={props.value ?? ''} onChange={props.onChange} placeholder="https://…" />;
}

/**
 * Image field that UPLOADS to object storage instead of pasting a URL. Picks a
 * file → POST /forest/:id/report-image (slot-aware) → writes the returned URL via
 * `onChange` (the same draft location the old Url() field wrote). The report-data
 * Save overwrites the JSONB column from the draft, so the server-side slot write
 * is harmless/redundant — the draft is authoritative. If storage is unconfigured
 * (503) it surfaces the error and reveals a URL-paste fallback so entry never
 * dead-ends.
 */
export function Img(props: {
  label: string;
  value?: string | null;
  onChange: (v: string) => void;
  /** Forest id (from `draft.id`). Required to upload. */
  forestId?: string;
  /** report-image slot: cover/content/impact/security/progress/soil_meter/temp_inside/temp_outside/earth/dashboard/gallery. */
  slot: string;
  /** Per-quarter slots upsert the (year, quarter) row. */
  year?: number;
  quarter?: number;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onFile = async (file: File | null) => {
    if (!file) return;
    if (!props.forestId) {
      setErr('Save the forest first, then add photos.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const { url } = await uploadReportImage(props.forestId, props.slot, file, {
        year: props.year,
        quarter: props.quarter,
      });
      props.onChange(url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed.';
      setErr(/storage|503|configured/i.test(msg) ? 'Photo storage not configured — paste a URL below instead.' : msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <FileField
        label={props.label}
        value={null}
        previewUrl={props.value ?? null}
        onChange={onFile}
        helperText={busy ? 'Uploading…' : undefined}
        error={err ?? undefined}
      />
      <div className="flex items-center gap-3">
        {props.value ? (
          <button
            type="button"
            onClick={() => props.onChange('')}
            className="text-label text-textSecondary underline hover:text-textPrimary"
          >
            Remove photo
          </button>
        ) : null}
      </div>
      {err ? (
        <TextField
          label={`${props.label} URL (fallback)`}
          name={`${props.label}-url`}
          type="url"
          value={props.value ?? ''}
          onChange={props.onChange}
          placeholder="https://…"
        />
      ) : null}
    </div>
  );
}

export function Sel(props: { label: string; value?: string | null; onChange: (v: string) => void; options: { label: string; value: string }[] }) {
  const opts: SelectOption[] = [{ label: '—', value: '' }, ...props.options];
  return <SelectField label={props.label} name={props.label} value={props.value ?? ''} onChange={props.onChange} options={opts} />;
}

export function Dt(props: { label: string; value?: string | null; onChange: (v: string) => void }) {
  // DateField wants yyyy-mm-dd; trim any time component from ISO strings.
  const v = props.value ? String(props.value).slice(0, 10) : '';
  return <DateField label={props.label} name={props.label} value={v} onChange={props.onChange} />;
}

export function Bool(props: { label: string; value?: boolean; onChange: (v: boolean) => void }) {
  return <SwitchField label={props.label} name={props.label} value={Boolean(props.value)} onChange={props.onChange} />;
}

/**
 * Repeatable list of object rows. `items` is the current array; `onChange`
 * replaces it. `renderRow(row, update)` renders the row's fields, calling
 * `update(patch)` to merge a partial into that row. `blank()` builds a new row.
 */
export function RepeatableRows<T>(props: {
  label: string;
  // T is inferred from `items` only (NoInfer on the rest) so a section's
  // `blank: () => ({})` literal can't narrow the row type.
  items: T[] | undefined;
  onChange: (next: T[]) => void;
  blank: () => NoInfer<T>;
  renderRow: (row: NoInfer<T>, update: (patch: Partial<NoInfer<T>>) => void, index: number) => ReactNode;
  addLabel?: string;
  rowTitle?: (row: NoInfer<T>, index: number) => string;
}) {
  const items = props.items ?? [];
  const update = (i: number, patch: Partial<T>) => {
    const next = items.slice();
    next[i] = { ...next[i], ...patch } as T;
    props.onChange(next);
  };
  const remove = (i: number) => props.onChange(items.filter((_, j) => j !== i));
  const add = () => props.onChange([...items, props.blank()]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-textPrimary">{props.label}</span>
        <button type="button" onClick={add} className="rounded-button border border-border px-3 py-1.5 text-xs font-medium text-textPrimary hover:bg-white/5">
          + {props.addLabel ?? 'Add row'}
        </button>
      </div>
      {items.length === 0 ? (
        <p className="rounded-card border border-dashed border-border px-3 py-4 text-center text-xs text-textSecondary">No rows yet — click “{props.addLabel ?? 'Add row'}”.</p>
      ) : (
        <div className="space-y-3">
          {items.map((row, i) => (
            <div key={i} className="rounded-card border border-border bg-appbg p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-textSecondary">{props.rowTitle ? props.rowTitle(row, i) : `Row ${i + 1}`}</span>
                <button type="button" onClick={() => remove(i)} className="text-xs font-medium text-danger hover:underline">Remove</button>
              </div>
              {props.renderRow(row, (patch) => update(i, patch), i)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
