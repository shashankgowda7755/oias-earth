/**
 * Shared fiscal-year helpers (Indian FY, Apr-start).
 *
 * Convention (mirrors reportCompute.ts / PfaUploader.tsx): `year` is the FISCAL
 * year — the calendar year of the April it starts in. Q1 Apr–Jun, Q2 Jul–Sep,
 * Q3 Oct–Dec, Q4 Jan–Mar; Q4's calendar months fall in the next calendar year.
 */

/**
 * Human label for a fiscal year, e.g. fiscalYearLabel(2024) -> "FY 2024–25".
 * `year` is the fiscal (April-start) year.
 */
export function fiscalYearLabel(year: number): string {
  if (!Number.isFinite(year)) return '—';
  const start = Math.trunc(year);
  const endTwo = String((start + 1) % 100).padStart(2, '0');
  return `FY ${start}–${endTwo}`;
}
