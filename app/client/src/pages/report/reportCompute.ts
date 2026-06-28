/**
 * Pure derivations for the quarterly report. Given a raw forest record +
 * (year, quarter), produce the `computed` block + `meta` block. No I/O, no
 * React — so Phase 2 can port the same rules to the server endpoint.
 *
 * Method notes (matching the PDF's documented method, slide 9):
 *   - oxygen/carbon use a per-tree annual rate × saplings; only 25% counted;
 *     value at ₹20/kg. The flat rates below are a Phase-1 placeholder — Phase 2
 *     replaces them with per-species rates from master_plantspecies.
 *   - maintenance/workforce roll up per the relations the PDF prints:
 *     total_days = calendar days in the quarter; working = total − offs;
 *     not_watered = total − watering − rainy; FT hrs = working×8×ftGardeners;
 *     PT hrs = ptLabourDays×9×ptGardeners. Till-date = sum over quarters ≤ sel.
 */
import type {
  FullForestPayload,
  MaintenanceWorkforceQuarter,
} from '../Forests/fullTypes';
import type {
  ApproxValueBlock,
  BoxSpeciesBreakdown,
  ComputedReport,
  GrowthChart,
  GrowthMilestone,
  MaintenanceRollup,
  ReportMeta,
  SiteMasterPlan,
  SpeciesRow,
  WorkforceRollup,
} from './reportTypes';
import { lookupSpeciesTraits } from './speciesTraits';

/** Phase-1 placeholder annual rates (kg/tree/yr). Refined per-species in P2. */
const O2_PER_TREE_YR = 20;
const CO2_PER_TREE_YR = 22;
const COUNTED_FRACTION = 0.25; // PDF: "only 25% considered"

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// FISCAL quarters (Indian FY, Apr-start): Q1 Apr–Jun, Q2 Jul–Sep, Q3 Oct–Dec,
// Q4 Jan–Mar. `year` is the fiscal year (the Apr it starts in); Q4's months fall
// in the next calendar year.
const FQ_START_MONTH: Record<number, number> = { 1: 3, 2: 6, 3: 9, 4: 0 };
function fqCalYear(fy: number, q: number): number {
  return q === 4 ? fy + 1 : fy;
}

function daysInQuarter(year: number, q: number): number {
  const startMonth = FQ_START_MONTH[q] ?? 0;
  const calYear = fqCalYear(year, q);
  let days = 0;
  for (let m = startMonth; m < startMonth + 3; m++) {
    days += new Date(calYear, m + 1, 0).getDate();
  }
  return days;
}

function quarterPeriodLabel(year: number, q: number): string {
  const startMonth = FQ_START_MONTH[q] ?? 0;
  const yy = String(fqCalYear(year, q)).slice(-2);
  return `${MONTHS[startMonth]} – ${MONTHS[startMonth + 2]} ${yy}`;
}

/** Sum actual saplings across boxes. Missing/zero count = 0 (never inflate). */
function totalSaplings(p: FullForestPayload): number {
  let n = 0;
  for (const b of p.box_data ?? []) {
    for (const s of b.species_data ?? []) {
      n += Math.max(0, num(s.count));
    }
  }
  return n;
}

function speciesInventory(p: FullForestPayload): SpeciesRow[] {
  const byKey = new Map<string, SpeciesRow>();
  for (const b of p.box_data ?? []) {
    for (const s of b.species_data ?? []) {
      const common = s.species_common_name?.trim() || s.species_name?.trim() || `Species ${s.species_id}`;
      // species_id may be "" (empty string) in hand-authored data — empty/0 must
      // fall through to the name, else every species collapses into one row.
      const key = s.species_id ? String(s.species_id) : common;
      const count = Math.max(0, num(s.count));
      const existing = byKey.get(key);
      if (existing) {
        existing.saplings += count;
      } else {
        byKey.set(key, {
          common_name: common,
          species_name: s.species_name,
          saplings: count,
          // description comes from master_plantspecies (Phase 2); traits resolved
          // from the species catalog (live reports use the DB join server-side).
          description: undefined,
          traits: lookupSpeciesTraits(s.species_name, s.species_common_name),
          oxygen_kg_year: 0,
          carbon_kg_year: 0,
        });
      }
    }
  }
  const rows = [...byKey.values()];
  for (const r of rows) {
    r.oxygen_kg_year = Math.round(r.saplings * O2_PER_TREE_YR * COUNTED_FRACTION);
    r.carbon_kg_year = Math.round(r.saplings * CO2_PER_TREE_YR * COUNTED_FRACTION);
  }
  return rows.sort((a, b) => b.saplings - a.saplings);
}

function approxValue(saplings: number): ApproxValueBlock {
  return {
    saplings,
    oxygen_kg_year: Math.round(saplings * O2_PER_TREE_YR * COUNTED_FRACTION),
    carbon_kg_year: Math.round(saplings * CO2_PER_TREE_YR * COUNTED_FRACTION),
  };
}

function maintenanceRollup(entries: MaintenanceWorkforceQuarter[], year: number, q: number, tillDate: boolean): MaintenanceRollup | null {
  const rows = tillDate
    ? entries.filter((e) => e.year < year || (e.year === year && e.quarter <= q))
    : entries.filter((e) => e.year === year && e.quarter === q);
  if (rows.length === 0) return null;

  let total = 0, weekly_off = 0, festival = 0, watering = 0, rainy = 0;
  for (const e of rows) {
    total += daysInQuarter(e.year, e.quarter);
    weekly_off += num(e.total_holidays_weekly_off);
    festival += num(e.total_holidays_festival);
    watering += num(e.total_watering_days);
    rainy += num(e.total_raining_days);
  }
  const working = Math.max(0, total - weekly_off - festival);
  const not_watered = Math.max(0, total - watering - rainy);
  return { total_days: total, working_days: working, watering_days: watering, rainy_days: rainy, not_watered_days: not_watered, weekly_off, festival };
}

function workforceRollup(entries: MaintenanceWorkforceQuarter[], year: number, q: number, tillDate: boolean): WorkforceRollup | null {
  const rows = tillDate
    ? entries.filter((e) => e.year < year || (e.year === year && e.quarter <= q))
    : entries.filter((e) => e.year === year && e.quarter === q);
  if (rows.length === 0) return null;

  let total_days = 0, weekly_off = 0, festival = 0, ft_hours = 0, pt_hours = 0;
  let ft_labour_days = 0, pt_labour_days = 0, ft_gardeners = 0, pt_gardeners = 0;
  for (const e of rows) {
    const total = daysInQuarter(e.year, e.quarter);
    const wOff = num(e.total_holidays_weekly_off);
    const fest = num(e.total_holidays_festival);
    const working = Math.max(0, total - wOff - fest);
    const ftG = num(e.full_time_gardeners);
    const ptG = num(e.part_time_gardeners);
    const ptDays = num(e.total_part_time_labour_days);
    total_days += total;
    weekly_off += wOff;
    festival += fest;
    ft_labour_days += working;
    pt_labour_days += ptDays;
    ft_gardeners = Math.max(ft_gardeners, ftG); // representative (latest/max)
    pt_gardeners = Math.max(pt_gardeners, ptG);
    ft_hours += working * 8 * ftG;
    pt_hours += ptDays * 9 * ptG;
  }
  const total_hours = ft_hours + pt_hours;
  const working_days = Math.max(0, total_days - weekly_off - festival);
  return {
    total_hours,
    ft_share_pct: total_hours ? Math.round((ft_hours / total_hours) * 1000) / 10 : 0,
    pt_share_pct: total_hours ? Math.round((pt_hours / total_hours) * 1000) / 10 : 0,
    ft_hours,
    pt_hours,
    ft_gardeners,
    pt_gardeners,
    ft_labour_days,
    pt_labour_days,
    total_days,
    working_days,
    weekly_off,
    festival,
  };
}

/** Plantation month + N months → "Jun 2025". */
function growthDateLabel(plantD: Date | null, monthsFromPlant: number): string {
  if (!plantD) return '—';
  const d = new Date(plantD.getFullYear(), plantD.getMonth() + monthsFromPlant, 1);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Linear-interpolate height (midFeet) across the milestone curve at `months`. */
function interpGrowthFeet(ms: GrowthMilestone[], months: number): number | null {
  if (ms.length === 0) return null;
  const first = ms[0]!;
  const last = ms[ms.length - 1]!;
  if (months <= first.months) return first.midFeet;
  if (months >= last.months) return last.midFeet;
  for (let i = 0; i < ms.length - 1; i++) {
    const a = ms[i]!;
    const b = ms[i + 1]!;
    if (months >= a.months && months <= b.months) {
      const span = b.months - a.months;
      const t = span > 0 ? (months - a.months) / span : 0;
      return a.midFeet + t * (b.midFeet - a.midFeet);
    }
  }
  return last.midFeet;
}

/**
 * Slide-13 growth chart. Milestones are anchored to the plantation month and
 * carried for the full project (none hidden). The report period's end month is
 * the "as of" date: months elapsed → arrow x-position; height is INTERPOLATED
 * across the per-forest target curve (actual_height_range is not used here).
 */
/**
 * Standard 3-year growth curve. Used when a forest has no manually-entered
 * targets, so Slide 13 auto-renders from the plantation date with nothing typed.
 * Each year's band is divided equally across its 4 quarters by the interpolation
 * below (linear month→height), and the report period picks the current point.
 */
const DEFAULT_GROWTH_TARGETS: { year: number; min: number; max: number }[] = [
  { year: 0, min: 2, max: 3 },
  { year: 1, min: 7, max: 8 },
  { year: 2, min: 8, max: 9 },
  { year: 3, min: 10, max: 14 },
];

function buildGrowth(p: FullForestPayload, fy: number, q: number): GrowthChart | null {
  const entered = (p.plant_growth_data?.target_height_range ?? [])
    .filter(t => t.min != null && t.max != null)
    .slice()
    .sort((a, b) => a.year - b.year);
  // Auto: no manual curve → standard 3-year default so the slide is never blank.
  const targets = entered.length > 0 ? entered : DEFAULT_GROWTH_TARGETS;

  const ft = (v: number): number => Math.max(0, Math.min(50, v));
  const plantD = p.plantation_date ? new Date(p.plantation_date) : null;

  // Report-period end month (fiscal quarter end) is the "as of" reference.
  // FQ_START_MONTH: Q1→3(Apr), Q2→6(Jul), Q3→9(Oct), Q4→0(Jan)
  const reportEndMonthIdx = (FQ_START_MONTH[q] ?? 0) + 2; // 0-indexed
  const reportCalYear = fqCalYear(fy, q);

  const maxYear = targets[targets.length - 1]!.year;
  const maxMonths = Math.max(12, maxYear * 12);

  // Months elapsed from plantation → report-period end.
  let elapsed = 0;
  if (plantD) {
    elapsed = (reportCalYear - plantD.getFullYear()) * 12
      + (reportEndMonthIdx - plantD.getMonth());
  }
  const currentMonths = Math.max(0, Math.min(maxMonths, elapsed));

  // All milestones, year-ordered. Nothing hidden.
  const milestones: GrowthMilestone[] = targets.map(t => {
    const lo = ft(t.min!);
    const hi = ft(t.max!);
    return {
      label: t.year === 0 ? 'Year 0' : `End of Year ${t.year}`,
      range: `${lo}–${hi} Feet`,
      date: growthDateLabel(plantD, t.year * 12),
      year: t.year,
      months: t.year * 12,
      midFeet: (lo + hi) / 2,
      current: false,
    };
  });

  const currentFeet = interpGrowthFeet(milestones, currentMonths);
  const maxHi = Math.max(...targets.map(t => ft(t.max!)));
  const maxFeet = Math.max(2, Math.ceil(maxHi / 2) * 2);

  // Injected "Existing growth" row — always interpolated.
  const existing: GrowthMilestone | null = plantD ? {
    label: 'Existing Growth',
    range: currentFeet != null ? `${Math.round(currentFeet * 10) / 10} Feet` : '—',
    date: growthDateLabel(plantD, currentMonths),
    year: -1,
    months: currentMonths,
    midFeet: currentFeet ?? 0,
    current: true,
  } : null;

  // Band label for the readout.
  let band = '';
  if (elapsed <= 0) band = 'At plantation';
  else if (elapsed >= maxMonths) band = `Project complete (Year ${maxYear}+)`;
  else {
    for (let i = 0; i < milestones.length - 1; i++) {
      if (elapsed >= milestones[i]!.months && elapsed < milestones[i + 1]!.months) {
        band = `Between Year ${milestones[i]!.year} and Year ${milestones[i + 1]!.year}`;
        break;
      }
    }
  }

  return {
    milestones,
    existing,
    elapsed_months: elapsed,
    current_months: currentMonths,
    current_feet: currentFeet,
    max_months: maxMonths,
    max_feet: maxFeet,
    band_label: band,
  };
}

function siteMasterPlan(p: FullForestPayload): SiteMasterPlan | null {
  const boxRows = num(p.box_rows);
  const boxCols = num(p.box_column ?? p.box_columns);
  const treeRows = num(p.tree_row ?? p.tree_rows);
  const treeCols = num(p.tree_column ?? p.tree_columns);
  const boxes = p.box_data ?? [];
  const boxCount = boxes.length || boxRows * boxCols;
  if (!boxCount && !treeRows) return null;

  // Projected capacity = sum of each box's own tree matrix (boxes can differ).
  // Falls back to the forest-level tree matrix when a box omits its dims.
  const fallbackMatrix = treeRows * treeCols;
  const caps = boxes.length
    ? boxes.map((b) => (num(b.row) * num(b.column)) || fallbackMatrix)
    : [fallbackMatrix];
  const first = caps[0] ?? 0;
  // ACTUAL saplings = sum of every box's species counts (what was really planted).
  // Prefer this over projected grid capacity so the slide total matches the cover
  // (the old code showed 4,200 grid-capacity for a 670-sapling forest).
  const actual = boxes.reduce(
    (s, b) => s + (b.species_data ?? []).reduce((ss, sp) => ss + num(sp.count), 0),
    0,
  );
  const total = actual || caps.reduce((s, c) => s + c, 0) * (boxes.length ? 1 : boxCount);
  const uniform = caps.every((c) => c === first);
  let perMatrixLabel = '—';
  if (uniform && first > 0) {
    const r = boxes[0] ? num(boxes[0].row) || treeRows : treeRows;
    const c = boxes[0] ? num(boxes[0].column) || treeCols : treeCols;
    perMatrixLabel = `${r} × ${c} = ${first} Nos`;
  } else if (caps.length) {
    perMatrixLabel = caps.join(' + ');
  }
  return {
    box_count: boxCount,
    total_saplings: total,
    grid_label: boxRows && boxCols ? `${boxRows} × ${boxCols}` : '—',
    per_matrix_label: perMatrixLabel,
    spacing_grids: p.box_to_box_distance,
    spacing_plants: p.tree_to_tree_distance,
    spacing_pathway: p.pathway_spacing,
  };
}

/** Per-box species placement for the Site Master Plan box-wise breakdown. */
function sitePlanBoxes(p: FullForestPayload): BoxSpeciesBreakdown[] {
  const out: BoxSpeciesBreakdown[] = [];
  for (const b of p.box_data ?? []) {
    const species = (b.species_data ?? [])
      .map((s) => ({
        name: s.species_common_name?.trim() || s.species_name?.trim() || `Species ${s.species_id}`,
        count: Math.max(0, num(s.count)),
      }))
      .filter((s) => s.count > 0);
    if (species.length === 0) continue;
    const rc = b.row != null && b.column != null ? ` (${b.row}-${b.column})` : '';
    out.push({ label: `${b.prefix || 'Box'}${rc}`, species });
  }
  return out;
}

function valueNet(term?: { land_value?: number; tree_value?: number; oxygen_generated?: number; carbon_sequestration?: number }): number | null {
  if (!term) return null;
  const vals = [term.land_value, term.tree_value, term.oxygen_generated, term.carbon_sequestration];
  if (vals.every((v) => v == null)) return null;
  return vals.reduce<number>((s, v) => s + num(v), 0);
}

export function computeReport(p: FullForestPayload, year: number, quarter: number): ComputedReport {
  const total = totalSaplings(p);
  const inv = speciesInventory(p);
  const vf = p.forest_value_flow_impact_report;
  const survival75 = Math.round(total * 0.75); // whole saplings — drives kg math
  return {
    total_saplings: total,
    species_count: inv.length,
    species_inventory: inv,
    value_flow: {
      short: valueNet(vf?.short_term),
      medium: valueNet(vf?.medium_term),
      long: valueNet(vf?.long_term),
    },
    approx_value_100: total > 0 ? approxValue(total) : null,
    approx_value_75: total > 0 ? approxValue(survival75) : null,
    maintenance_quarter: maintenanceRollup(p.maintenance_workforce ?? [], year, quarter, false),
    maintenance_tilldate: maintenanceRollup(p.maintenance_workforce ?? [], year, quarter, true),
    workforce_quarter: workforceRollup(p.maintenance_workforce ?? [], year, quarter, false),
    workforce_tilldate: workforceRollup(p.maintenance_workforce ?? [], year, quarter, true),
    growth: buildGrowth(p, year, quarter),
    site_master_plan: siteMasterPlan(p),
    site_plan_boxes: sitePlanBoxes(p),
  };
}

export function buildMeta(
  p: FullForestPayload,
  year: number,
  quarter: number,
  opts?: { report_date?: string; created_by_name?: string; created_by_phone?: string },
): ReportMeta {
  const sponsoredBy = (p.additional_sponsor_logo ?? []).find((l) => l.type?.value === 'sponsored_by');
  const initiatedBy = (p.additional_sponsor_logo ?? []).find((l) => l.type?.value === 'initiated_by');
  const plantD = p.plantation_date ? new Date(p.plantation_date) : null;
  return {
    year,
    quarter,
    quarter_label: `Q${quarter}`,
    period_label: quarterPeriodLabel(year, quarter),
    report_date: opts?.report_date ?? new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
    plantation_label: plantD ? `${MONTHS[plantD.getMonth()]} ${plantD.getFullYear()}` : '—',
    created_by_name: opts?.created_by_name,
    created_by_phone: opts?.created_by_phone,
    client_name: sponsoredBy?.name,
    client_logo: sponsoredBy?.logo,
    communitree_logo: initiatedBy?.logo,
  };
}
