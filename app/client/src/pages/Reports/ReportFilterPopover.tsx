/**
 * Filter popover for the Reports table.
 *
 * The reports/list response carries a `filter_limit` object (Paginated.
 * filter_limit). Its exact schema is an OPEN QUESTION (spec openQuestions[5]:
 * "Filter popover contents per table (reports returns filter_limit hinting at
 * filter metadata)."). We therefore read it DEFENSIVELY: we look for arrays of
 * primitives under common keys (year/years, quarter/quarters, type/types,
 * forest/forests, mode/modes) and render a <select> per discovered facet. If
 * `filter_limit` is absent or empty for a facet we fall back to sensible static
 * options (quarters 1-4, the observed mode/type enums) and, for forests, the
 * forest picker options passed in from the page.
 *
 * Applied filters are reported back via onApply as a flat
 * Record<string, unknown> that the page forwards to listEntity({filters}).
 * TODO(openQuestions[0]): the server's expected filter param NAMES are inferred;
 * confirm and adjust FILTER_KEYS if the backend uses different keys.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button } from '../../components';
import type { ForestOption } from './reportApi';
import { MODE_OPTIONS, QUARTER_OPTIONS, TYPE_OPTIONS } from './reportForms';

/** Filter param keys sent to the backend (inferred — openQuestions[0]). */
export const FILTER_KEYS = {
  year: 'year',
  quarter: 'quarter',
  type: 'type',
  mode: 'mode',
  forest: 'forest_id',
} as const;

export interface ReportFilterValues {
  year: string;
  quarter: string;
  type: string;
  mode: string;
  forest_id: string;
}

export const EMPTY_FILTERS: ReportFilterValues = {
  year: '',
  quarter: '',
  type: '',
  mode: '',
  forest_id: '',
};

/** True when at least one facet is set. */
export function hasActiveFilters(f: ReportFilterValues): boolean {
  return Object.values(f).some((v) => v !== '');
}

/** Map UI filter values -> the backend filters object (omitting empties). */
export function toFilterParams(f: ReportFilterValues): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (f.year) out[FILTER_KEYS.year] = Number(f.year);
  if (f.quarter) out[FILTER_KEYS.quarter] = Number(f.quarter);
  if (f.type) out[FILTER_KEYS.type] = f.type;
  if (f.mode) out[FILTER_KEYS.mode] = f.mode;
  if (f.forest_id) out[FILTER_KEYS.forest] = f.forest_id;
  return out;
}

interface Option {
  value: string;
  label: string;
}

/** Pull an array of primitive values out of filter_limit under any alias. */
function facetValues(
  filterLimit: Record<string, unknown> | undefined,
  aliases: string[],
): Array<string | number> | null {
  if (!filterLimit) return null;
  for (const key of aliases) {
    const v = filterLimit[key];
    if (Array.isArray(v) && v.every((x) => typeof x === 'string' || typeof x === 'number')) {
      return v as Array<string | number>;
    }
  }
  return null;
}

export interface ReportFilterPopoverProps {
  open: boolean;
  onClose: () => void;
  /** raw filter_limit from reports/list (shape unknown — openQuestions[5]). */
  filterLimit: Record<string, unknown> | undefined;
  forestOptions: ForestOption[];
  value: ReportFilterValues;
  onApply: (next: ReportFilterValues) => void;
  onClear: () => void;
}

export function ReportFilterPopover({
  open,
  onClose,
  filterLimit,
  forestOptions,
  value,
  onApply,
  onClear,
}: ReportFilterPopoverProps) {
  const headingId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<ReportFilterValues>(value);

  // re-sync the draft whenever the popover (re)opens or committed value changes
  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  // close on Escape and on outside click
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    // defer so the opening click doesn't immediately close it
    const t = window.setTimeout(
      () => document.addEventListener('mousedown', onDown),
      0,
    );
    return () => {
      document.removeEventListener('keydown', onKey);
      window.clearTimeout(t);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open, onClose]);

  const yearOptions: Option[] = useMemo(() => {
    const fromMeta = facetValues(filterLimit, ['year', 'years']);
    if (fromMeta && fromMeta.length) {
      return fromMeta
        .map((y) => ({ value: String(y), label: String(y) }))
        .sort((a, b) => Number(b.value) - Number(a.value));
    }
    // Fallback: a small recent-years window (openQuestions[5]).
    const current = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => current - i).map((y) => ({
      value: String(y),
      label: String(y),
    }));
  }, [filterLimit]);

  const quarterOptions: Option[] = useMemo(() => {
    const fromMeta = facetValues(filterLimit, ['quarter', 'quarters']);
    if (fromMeta && fromMeta.length) {
      return fromMeta
        .map((q) => ({ value: String(q), label: `Q${q}` }))
        .sort((a, b) => Number(a.value) - Number(b.value));
    }
    return QUARTER_OPTIONS.map((o) => ({ value: o.value, label: o.label }));
  }, [filterLimit]);

  const typeOptions: Option[] = useMemo(() => {
    const fromMeta = facetValues(filterLimit, ['type', 'types']);
    if (fromMeta && fromMeta.length) {
      return fromMeta.map((t) => ({ value: String(t), label: String(t) }));
    }
    return TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }));
  }, [filterLimit]);

  const modeOptions: Option[] = useMemo(() => {
    const fromMeta = facetValues(filterLimit, ['mode', 'modes']);
    if (fromMeta && fromMeta.length) {
      return fromMeta.map((m) => ({ value: String(m), label: String(m) }));
    }
    return MODE_OPTIONS.map((o) => ({ value: o.value, label: o.label }));
  }, [filterLimit]);

  if (!open) return null;

  const set = (key: keyof ReportFilterValues, v: string) =>
    setDraft((d) => ({ ...d, [key]: v }));

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby={headingId}
      className="absolute right-0 top-full z-50 mt-2 w-72 rounded-card border border-border bg-surface p-4 shadow-dialog"
    >
      <h3 id={headingId} className="mb-3 text-sm font-semibold text-textPrimary">
        Filter reports
      </h3>

      <div className="flex flex-col gap-3">
        <FacetSelect
          label="Year"
          value={draft.year}
          options={yearOptions}
          onChange={(v) => set('year', v)}
        />
        <FacetSelect
          label="Quarter"
          value={draft.quarter}
          options={quarterOptions}
          onChange={(v) => set('quarter', v)}
        />
        <FacetSelect
          label="Forest"
          value={draft.forest_id}
          options={forestOptions}
          onChange={(v) => set('forest_id', v)}
        />
        <FacetSelect
          label="Type"
          value={draft.type}
          options={typeOptions}
          onChange={(v) => set('type', v)}
        />
        <FacetSelect
          label="Mode"
          value={draft.mode}
          options={modeOptions}
          onChange={(v) => set('mode', v)}
        />
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <Button
          variant="text"
          onClick={() => {
            setDraft(EMPTY_FILTERS);
            onClear();
          }}
        >
          Clear
        </Button>
        <div className="flex gap-2">
          <Button variant="outlined" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => onApply(draft)}>
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}

function FacetSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (v: string) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-textSecondary">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-input border border-border bg-surface px-2 py-1.5 text-sm text-textPrimary outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
