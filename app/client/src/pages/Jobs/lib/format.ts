/**
 * Small, module-local formatting helpers for the Jobs monitor.
 *
 * Kept inside the Jobs dir per the module contract (no edits to shared code).
 * If other sections later need the same date/JSON helpers, the integrator can
 * promote these into a shared `@/lib/format` module.
 */

/**
 * Format an ISO-ish timestamp for display. The live REST shape returns
 * `created_at` / `updated_at` as strings (e.g. "2026-06-12T20:20:31.770Z").
 * We render a locale date+time and fall back to the raw value if it doesn't
 * parse, so unexpected shapes never crash the table.
 */
export function formatTimestamp(value: string | null | undefined): string {
  if (!value) return '—';
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return value;
  return new Date(ms).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Pretty-print any JSON-ish value (or report when it is empty/null). */
export function prettyJson(value: unknown): string {
  if (value == null) return '';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    // Circular or otherwise non-serialisable — show best-effort string.
    return String(value);
  }
}

/** True when a JSON-ish value has no meaningful content to display. */
export function isEmptyJson(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'object') return Object.keys(value as object).length === 0;
  return false;
}

/**
 * Short, human one-line preview of a `job_description` object for the table
 * cell. The live shape is freeform JSON (openQuestions[6] — Job queue schema is
 * not documented), so we just join the top-level key/value pairs and truncate.
 */
export function describeJob(
  description: Record<string, unknown> | null | undefined,
  maxLen = 80,
): string {
  if (!description || Object.keys(description).length === 0) return '—';
  const parts = Object.entries(description).map(([key, val]) => {
    const v =
      val != null && typeof val === 'object' ? JSON.stringify(val) : String(val);
    return `${key}: ${v}`;
  });
  const joined = parts.join(', ');
  return joined.length > maxLen ? `${joined.slice(0, maxLen - 1)}…` : joined;
}
