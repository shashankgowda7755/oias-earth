/**
 * Forest FULL upsert + JSON-import helpers (Forests-rich path).
 *
 * GAP / DIVERGENCE: the orchestrator brief said a shared `api.forestUpsertFull`
 * already exists in `lib/api.ts`. It does NOT in the current tree (grep clean).
 * Rather than reach outside my owned `pages/Forests/**`, I implement it here as
 * a thin wrapper over the shared `upsertEntity('forest', …)`. If/when the core
 * `api.forestUpsertFull` lands, swap the body of `forestUpsertFull` to call it
 * and delete this note. (See index.tsx GAPS.)
 *
 * The full payload carries nested arrays/objects (box_data, the many jsonb
 * report columns). The confirmed write contract POSTs scalars as multipart/JSON;
 * nested values are sent as JSON-string fields so the async `forest_upsert_v1`
 * job can parse them — mirroring how AddForestWizard already serialises `boxes`.
 */
import { api, upsertEntity, type UpsertValues } from '@/lib/api';
import type { FullForestPayload } from './fullTypes';

/** Top-level keys that are scalars and can go on the wire as-is. */
const SCALAR_KEYS = new Set<keyof FullForestPayload>([
  'id',
  'forest_name',
  'forest_desc',
  'forest_internal_id',
  'forest_unique_id',
  'forest_geo_lat',
  'forest_geo_long',
  'forest_address',
  'forest_city',
  'forest_state',
  'forest_country',
  'box_rows',
  'box_columns',
  'box_to_box_distance',
  'tree_rows',
  'tree_columns',
  'tree_to_tree_distance',
  'direction_angle',
  'boundary_gap',
  'pathway_spacing',
  'project_site',
  'project_period',
  'plantation_date',
  'employee_id',
  'sponsor_id',
  'user_role_id',
  'plantation_strategy',
  'plantation_strategy_other',
  'irrigation_method',
  'irrigation_method_other',
  'climate',
  'climate_other',
  'soil_type',
  'soil_type_other',
  'digipin',
  'last_inspection_date',
  'permission_letter',
  'site_layout',
]);

/**
 * Flatten a FullForestPayload into UpsertValues: scalars pass through; every
 * nested object/array is JSON-stringified under its own key. Empty values are
 * dropped (upsertEntity also omits null/undefined, but we keep the body tight).
 */
export function flattenFullPayload(p: FullForestPayload): UpsertValues {
  const out: UpsertValues = {};
  for (const [key, value] of Object.entries(p)) {
    if (value === undefined || value === null || value === '') continue;
    if (SCALAR_KEYS.has(key as keyof FullForestPayload)) {
      out[key] =
        typeof value === 'object' ? JSON.stringify(value) : (value as UpsertValues[string]);
    } else {
      // Nested arrays/objects -> JSON string for the upsert job to parse.
      out[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }
  }
  return out;
}

/**
 * POST /api/v1/forest/upsert with the FULL rich payload (jsonb columns +
 * box_data). No `id` => INSERT; `id` present => UPDATE. Runs server-side as the
 * async `forest_upsert_v1` job (visible in the Jobs tab).
 */
export async function forestUpsertFull<TRecord = unknown>(
  payload: FullForestPayload,
): Promise<TRecord> {
  return upsertEntity<TRecord>('forest', flattenFullPayload(payload));
}

/**
 * Update ONLY the report sections (rich jsonb + report scalars) of an existing
 * forest — POST /forest/:id/report-data. Unlike forestUpsertFull this never
 * regenerates forest_boxes/forest_trees, so editing report data cannot wipe
 * geotagged trees. Send the report fields as plain JSON.
 */
export async function updateForestReportData(
  forestId: string,
  body: Partial<FullForestPayload>,
): Promise<{ id: string; updated: number }> {
  const res = await api.post(`/forest/${forestId}/report-data`, body);
  return (res.data?.data ?? res.data) as { id: string; updated: number };
}

/**
 * Atomic per-ITEM edit of a report list column (gallery, maintenance, soil pH,
 * temperature, progress, env indicators, sponsor/dashboard/report images).
 * Safe for many editors on the same list — the server mutates just this item
 * under a row lock, so concurrent adds/edits/deletes don't clobber each other.
 *
 *  - add     → saveReportListItem(id, col, null, item)
 *  - update  → saveReportListItem(id, col, {year,quarter}, item)   (match keys)
 *  - delete  → saveReportListItem(id, col, {year,quarter}, null)
 */
export async function saveReportListItem(
  forestId: string,
  column: string,
  match: Record<string, unknown> | null,
  item: Record<string, unknown> | null,
): Promise<{ column: string; op: string; length: number }> {
  const res = await api.post(`/forest/${forestId}/report-data/list-item`, { column, match, item });
  return (res.data?.data ?? res.data) as { column: string; op: string; length: number };
}

/** Auto-derived weather for a forest's fiscal quarter (Open-Meteo). */
export interface ForestWeather {
  available: boolean;
  year: number;
  quarter: number;
  period?: { start: string; end: string };
  raining_days?: number;
  rainfall_mm?: number | null;
  dry_spell_days?: number;
  outside_temperature_avg?: number | null;
  outside_temperature_max?: number | null;
  outside_temperature_min?: number | null;
  outside_humidity_avg?: number | null;
  source?: string;
  /** True when called with `write` — the outside readings were persisted (estimated). */
  persisted?: boolean;
  reason?: string;
}

/** PFA uploader: clear (delete) a report photo slot. */
export async function clearReportImage(
  forestId: string,
  slot: string,
  opts?: { year?: number; quarter?: number; url?: string },
): Promise<void> {
  await api.post(`/forest/${forestId}/report-image/clear`, { slot, ...opts });
}

/** PFA uploader: POST a report photo to a slot; returns the stored URL. */
export async function uploadReportImage(
  forestId: string,
  slot: string,
  file: File,
  opts?: { year?: number; quarter?: number },
): Promise<{ url: string; slot: string }> {
  const fd = new FormData();
  fd.append('photo', file);
  fd.append('slot', slot);
  if (opts?.year) fd.append('year', String(opts.year));
  if (opts?.quarter) fd.append('quarter', String(opts.quarter));
  const { data } = await api.post(`/forest/${forestId}/report-image`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return (data?.data ?? data) as { url: string; slot: string };
}

/** PFA: upsert a sponsor/initiator logo entry (multipart: logo file + meta). */
export async function uploadSponsorLogo(
  forestId: string,
  opts: { title: string; name?: string; value: 'sponsored_by' | 'initiated_by'; index?: number; file?: File | null },
): Promise<{ index: number; logo?: string; entries: unknown[] }> {
  const fd = new FormData();
  fd.append('title', opts.title);
  fd.append('name', opts.name ?? '');
  fd.append('value', opts.value);
  if (opts.index != null && opts.index >= 0) fd.append('index', String(opts.index));
  if (opts.file) fd.append('logo', opts.file);
  const { data } = await api.post(`/forest/${forestId}/sponsor-logo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  return (data?.data ?? data) as { index: number; logo?: string; entries: unknown[] };
}

/** PFA: delete a sponsor logo entry by index. */
export async function deleteSponsorLogo(forestId: string, index: number): Promise<void> {
  await api.post(`/forest/${forestId}/sponsor-logo/delete`, { index });
}

/** GET /forest/:id/weather?year=&quarter= — derive weather from forest lat/long. */
export async function fetchForestWeather(
  forestId: string,
  year: number,
  quarter: number,
  opts?: { write?: boolean },
): Promise<ForestWeather> {
  const params: Record<string, unknown> = { year, quarter };
  if (opts?.write) params.write = 1;
  const res = await api.get(`/forest/${forestId}/weather`, { params });
  return (res.data?.data ?? res.data) as ForestWeather;
}

/** Result of attempting to parse pasted/uploaded forest JSON. */
export type ParseResult =
  | { ok: true; payload: FullForestPayload }
  | { ok: false; error: string };

/**
 * Parse a JSON string into a FullForestPayload. Tolerates `// line comments`
 * (the sample is a `.jsonc`) and a leading BOM. Validates only that the result
 * is an object with at least a `forest_name` — we don't enforce business rules
 * the contract doesn't state, just guard against pasting non-forest JSON.
 */
export function parseForestJson(text: string): ParseResult {
  const trimmed = text.replace(/^﻿/, '').trim();
  if (!trimmed) return { ok: false, error: 'Paste or upload the forest JSON first.' };

  const stripped = stripJsonComments(trimmed);
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid JSON.';
    return { ok: false, error: `Could not parse JSON: ${msg}` };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'Expected a JSON object (the forest/upsert body).' };
  }
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.forest_name !== 'string' || !obj.forest_name.trim()) {
    return {
      ok: false,
      error: 'This does not look like a forest payload (missing "forest_name").',
    };
  }
  return { ok: true, payload: obj as FullForestPayload };
}

/**
 * Remove `//` line comments and `/* *\/` block comments while preserving them
 * inside strings. Lightweight (no full tokenizer) but correct for the JSONC the
 * report-to-JSON skill produces (comments only outside string literals).
 */
function stripJsonComments(input: string): string {
  let out = '';
  let inString = false;
  let stringQuote = '';
  let i = 0;
  while (i < input.length) {
    const ch = input[i]!;
    const next = input[i + 1];
    if (inString) {
      out += ch;
      if (ch === '\\') {
        // copy the escaped char verbatim
        if (i + 1 < input.length) {
          out += input[i + 1]!;
          i += 2;
          continue;
        }
      } else if (ch === stringQuote) {
        inString = false;
      }
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = true;
      stringQuote = ch;
      out += ch;
      i += 1;
      continue;
    }
    if (ch === '/' && next === '/') {
      // line comment -> skip to EOL
      i += 2;
      while (i < input.length && input[i] !== '\n') i += 1;
      continue;
    }
    if (ch === '/' && next === '*') {
      // block comment -> skip to */
      i += 2;
      while (i < input.length && !(input[i] === '*' && input[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}
