/**
 * Form model, defaults, validation, and payload mapping for the Reports module.
 *
 * The Report row that reports/list returns is mostly flat metadata
 * (spec/rest_list_shapes.json -> reports/list) plus three joined objects
 * (Forest, CreatedBy, UpdatedBy). The writable columns are confirmed by the
 * backend CRUD whitelist (server/src/routes/crud.ts -> ENTITIES.report) and by
 * the Report data-model table (spec/data_model_full.json):
 *
 *   year, quarter, report_date, plantation_date, start_date, end_date,
 *   mode, type, version, report_data (JSON), project_period, skip (JSON),
 *   forest_id, is_active
 *
 * NOTE (spec openQuestions[6]): the `report_data` JSON schema is NOT documented
 * ("Reports 'reportData' JSON schema ... not captured"). We therefore expose it
 * as a free-form JSON textarea with structural (parse-only) validation rather
 * than inventing a field-by-field schema. Same applies to `skip` (JSON).
 */
import type { ReportRow } from '../../types/entities';

/** Quarters are 1-4 (FISCAL quarters, Indian FY: Q1 Apr–Jun … Q4 Jan–Mar). */
export const QUARTER_OPTIONS = [
  { value: '1', label: 'Q1' },
  { value: '2', label: 'Q2' },
  { value: '3', label: 'Q3' },
  { value: '4', label: 'Q4' },
] as const;

/**
 * Mode / type option lists.
 * Observed live values: mode "automatic", type "quarterly" (rest_list_shapes).
 * The full enum set is NOT documented (openQuestions[6]); we offer the observed
 * values plus the obvious complements and keep them editable should the backend
 * accept others. TODO(openQuestions[6]): confirm the authoritative enums.
 */
export const MODE_OPTIONS = [
  { value: 'automatic', label: 'Automatic' },
  { value: 'manual', label: 'Manual' },
] as const;

export const TYPE_OPTIONS = [
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
  { value: 'monthly', label: 'Monthly' },
] as const;

/** Editable form state. All values are strings (controlled fields). */
export interface ReportFormState {
  forest_id: string;
  year: string;
  quarter: string;
  report_date: string; // yyyy-mm-dd
  plantation_date: string;
  start_date: string;
  end_date: string;
  mode: string;
  type: string;
  version: string;
  project_period: string;
  report_data: string; // raw JSON text
}

export const EMPTY_REPORT_FORM: ReportFormState = {
  forest_id: '',
  year: String(new Date().getFullYear()),
  quarter: '',
  report_date: '',
  plantation_date: '',
  start_date: '',
  end_date: '',
  // Sensible defaults so a non-technical operator only picks Forest/Year/Quarter.
  // These are index metadata the renderer does not read; editable under "Advanced".
  mode: 'automatic',
  type: 'quarterly',
  version: '1',
  project_period: '',
  report_data: '',
};

/** ISO/Datetime -> yyyy-mm-dd for a native date input. */
export function toDateInput(value: string | null | undefined): string {
  if (!value) return '';
  // Values arrive as "2026-06-09T00:00:00.000Z" or "2024-03-01".
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    // Already a plain date string we can't parse via Date in this tz? slice it.
    return typeof value === 'string' ? value.slice(0, 10) : '';
  }
  // Use UTC parts so a 00:00:00Z timestamp doesn't shift a day in -ve offsets.
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Build form state from an existing row (edit mode). */
export function formFromRow(row: ReportRow): ReportFormState {
  let reportDataText = '';
  // reports/list does not return report_data, but if a future detail fetch
  // includes it we render it; otherwise the textarea starts empty on edit.
  const rd = (row as unknown as { report_data?: unknown }).report_data;
  if (rd != null && typeof rd === 'object') {
    reportDataText = JSON.stringify(rd, null, 2);
  }
  return {
    forest_id: row.forest_id ?? row.Forest?.id ?? '',
    year: row.year != null ? String(row.year) : '',
    quarter: row.quarter != null ? String(row.quarter) : '',
    report_date: toDateInput(row.report_date),
    plantation_date: toDateInput(row.plantation_date),
    start_date: toDateInput(row.start_date),
    end_date: toDateInput(row.end_date),
    mode: row.mode ?? '',
    type: row.type ?? '',
    version: row.version != null ? String(row.version) : '',
    project_period: row.project_period != null ? String(row.project_period) : '',
    report_data: reportDataText,
  };
}

export type ReportFormErrors = Partial<Record<keyof ReportFormState, string>>;

/**
 * Client-side validation. Required of the operator: only forest, year, quarter.
 * mode/type/version/project_period are index metadata with sensible defaults (the
 * renderer does not read them), so they are validated only for FORMAT when an
 * operator changes them under "Advanced". Dates are optional, but when present we
 * sanity-check ordering (plantation ≤ start ≤ end). report_data must parse as JSON.
 */
export function validateReportForm(s: ReportFormState): ReportFormErrors {
  const e: ReportFormErrors = {};

  if (!s.forest_id) e.forest_id = 'Forest is required';

  const yearNum = Number(s.year);
  if (!s.year) e.year = 'Year is required';
  else if (!Number.isInteger(yearNum) || yearNum < 2000 || yearNum > 2100)
    e.year = 'Enter a valid year (2000-2100)';

  if (!s.quarter) e.quarter = 'Quarter is required';

  // Format-only checks for the optional/advanced metadata.
  if (s.version) {
    const versionNum = Number(s.version);
    if (!Number.isInteger(versionNum) || versionNum < 1)
      e.version = 'Version must be a positive whole number';
  }
  if (s.project_period) {
    const ppNum = Number(s.project_period);
    if (!Number.isInteger(ppNum) || ppNum < 0)
      e.project_period = 'Enter a valid number of years';
  }

  // Date ordering: plantation ≤ start ≤ end (only when the pair is present).
  if (s.plantation_date && s.start_date && s.plantation_date > s.start_date) {
    e.start_date = 'Start date must be on or after the plantation date';
  }
  if (s.start_date && s.end_date && s.start_date > s.end_date) {
    e.end_date = 'End date must be on or after the start date';
  }

  if (s.report_data.trim()) {
    try {
      JSON.parse(s.report_data);
    } catch {
      e.report_data = 'Report data must be valid JSON';
    }
  }

  return e;
}

/** The write payload sent to POST /report or PATCH /report/:id. */
export interface ReportWritePayload {
  forest_id: string;
  year: number;
  quarter: number;
  report_date: string | null;
  plantation_date: string | null;
  start_date: string | null;
  end_date: string | null;
  mode: string;
  type: string;
  version: number;
  project_period: number;
  report_data?: unknown;
}

/** Map validated form state to the backend payload (snake_case columns). */
export function formToPayload(s: ReportFormState): ReportWritePayload {
  const payload: ReportWritePayload = {
    forest_id: s.forest_id,
    year: Number(s.year),
    quarter: Number(s.quarter),
    report_date: s.report_date || null,
    plantation_date: s.plantation_date || null,
    start_date: s.start_date || null,
    end_date: s.end_date || null,
    // Defaults so the NOT-NULL columns are always satisfied when the operator
    // never opens "Advanced".
    mode: s.mode || 'automatic',
    type: s.type || 'quarterly',
    version: Number(s.version) || 1,
    project_period: s.project_period ? Number(s.project_period) : 0,
  };
  if (s.report_data.trim()) {
    // validated to parse already; send the object so the server can store jsonb.
    payload.report_data = JSON.parse(s.report_data);
  }
  return payload;
}
