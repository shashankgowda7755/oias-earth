/**
 * Shared fiscal-year helpers (Indian FY, Apr-start). Mirrors the server
 * (reportData.ts FQ_START_MONTH / fqCalYear / quarterPeriodLabel) so client,
 * PFA, and report labels all match. `year` is the FISCAL year — the calendar
 * year of the April it starts in. Q1 Apr–Jun, Q2 Jul–Sep, Q3 Oct–Dec,
 * Q4 Jan–Mar; Q4's calendar months fall in the next calendar year.
 */

export interface FQ {
  year: number;
  quarter: number;
}

const FQ_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 0-based calendar start month of each fiscal quarter. */
export const FQ_START_MONTH: Record<number, number> = { 1: 3, 2: 6, 3: 9, 4: 0 };

/** Fiscal year+quarter that a calendar Date falls into. */
export function fiscalQuarterOf(d: Date): FQ {
  const m = d.getMonth();
  if (m >= 3 && m <= 5) return { year: d.getFullYear(), quarter: 1 };
  if (m >= 6 && m <= 8) return { year: d.getFullYear(), quarter: 2 };
  if (m >= 9) return { year: d.getFullYear(), quarter: 3 };
  return { year: d.getFullYear() - 1, quarter: 4 };
}

/** Human period label for a fiscal year+quarter, e.g. quarterPeriodLabel(2025, 1) -> "Apr – Jun 25". */
export function quarterPeriodLabel(year: number, q: number): string {
  const startMonth = FQ_START_MONTH[q] ?? 0;
  const calYear = q === 4 ? year + 1 : year;
  return `${FQ_MONTHS[startMonth]} – ${FQ_MONTHS[startMonth + 2]} ${String(calYear).slice(-2)}`;
}

/** Ascending list of fiscal quarters from `from`'s quarter up to `to`'s quarter (inclusive). */
export function quartersFrom(from: Date, to: Date): FQ[] {
  const a = fiscalQuarterOf(from);
  const b = fiscalQuarterOf(to);
  const out: FQ[] = [];
  let y = a.year, q = a.quarter;
  // Cap iterations defensively so a bad date can never spin forever.
  for (let guard = 0; guard < 400; guard++) {
    out.push({ year: y, quarter: q });
    if (y === b.year && q === b.quarter) break;
    if (y > b.year || (y === b.year && q >= b.quarter)) break;
    q += 1;
    if (q > 4) { q = 1; y += 1; }
  }
  return out;
}

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
