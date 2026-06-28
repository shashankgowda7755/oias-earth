/**
 * Data contract for the quarterly forest report (the 21-slide CGI-style PDF).
 *
 * A `ForestReportData` is everything the report page needs to render: the raw
 * forest record (the same `FullForestPayload` shape the upsert accepts + the
 * detail view reads), a `meta` block (which quarter, labels, who created it),
 * and a `computed` block holding the derived numbers the PDF shows but the raw
 * record does not store (sapling totals, per-species oxygen/carbon, quarter +
 * till-date rollups, workforce hours, growth milestones, site-plan totals).
 *
 * Phase 1 builds this client-side from a JSON fixture (see reportCompute +
 * reportFixture). Phase 2 has the server return the identical shape from
 * GET /public/forest/:id/report. The renderer never recomputes — it only reads.
 */
import type { FullForestPayload } from '../Forests/fullTypes';

export interface ReportMeta {
  /** Fiscal year (the April it starts in). */
  year: number;
  /** Fiscal quarter 1–4 (Indian FY: Q1 Apr–Jun, Q2 Jul–Sep, Q3 Oct–Dec, Q4 Jan–Mar of the next year). */
  quarter: number;
  /** "Q2" */
  quarter_label: string;
  /** "Apr – Jun 26" */
  period_label: string;
  /** "24 June 2026" (report-dated). */
  report_date: string;
  /** Plantation month label for the cover, e.g. "January 2026". */
  plantation_label: string;
  /** Assigned site supervisor (employee) name — shown on the OSR Land slide. */
  supervisor?: string;
  created_by_name?: string;
  created_by_phone?: string;
  /** Top-right header brand (the sponsor/client). */
  client_name?: string;
  client_logo?: string;
  communitree_logo?: string;
}

/** One row of the slide-9 native-species analysis + slide-18 inventory. */
export interface SpeciesRow {
  common_name: string;
  species_name?: string;
  saplings: number;
  description?: string;
  /** Functional traits shown as icons on slide 18. */
  traits: { timber: boolean; pollination: boolean; nesting: boolean; fruit: boolean };
  /** Annual O₂ (kg/yr) for the species' saplings — slide 9. */
  oxygen_kg_year: number;
  /** Annual CO₂ sequestered (kg/yr) for the species' saplings — slide 9. */
  carbon_kg_year: number;
}

/** Maintenance day counts (a single quarter, or cumulative "till date"). */
export interface MaintenanceRollup {
  total_days: number;
  working_days: number;
  watering_days: number;
  rainy_days: number;
  not_watered_days: number;
  weekly_off: number;
  festival: number;
}

/** Workforce effort (a single quarter, or cumulative "till date"). */
export interface WorkforceRollup {
  total_hours: number;
  ft_share_pct: number;
  pt_share_pct: number;
  ft_hours: number;
  pt_hours: number;
  ft_gardeners: number;
  pt_gardeners: number;
  ft_labour_days: number;
  pt_labour_days: number;
  total_days: number;
  working_days: number;
  weekly_off: number;
  festival: number;
}

export interface GrowthMilestone {
  label: string;
  range: string;
  date: string;
  current: boolean;
}

/** Slide-9 forest-value blocks (₹). 100% and 75%-survival variants. */
export interface ApproxValueBlock {
  saplings: number;
  oxygen_kg_year: number;
  carbon_kg_year: number;
}

export interface SiteMasterPlan {
  box_count: number;
  total_saplings: number;
  grid_label: string;       // "3 × 4"
  per_matrix_label: string; // "350 × 1 = 350 Nos"
  spacing_grids?: number;
  spacing_plants?: number;
  spacing_pathway?: number;
}

export interface ComputedReport {
  total_saplings: number;
  species_count: number;
  species_inventory: SpeciesRow[];
  /** Slide 8 net impact projection per horizon. UNIT = ₹ Crore (the impact-report
   * fields are stored in Cr, per the PDF method) — display appends " Cr", no rescale. */
  value_flow: { short: number | null; medium: number | null; long: number | null };
  /** Slide 9. */
  approx_value_100: ApproxValueBlock | null;
  approx_value_75: ApproxValueBlock | null;
  maintenance_quarter: MaintenanceRollup | null;
  maintenance_tilldate: MaintenanceRollup | null;
  workforce_quarter: WorkforceRollup | null;
  workforce_tilldate: WorkforceRollup | null;
  growth_milestones: GrowthMilestone[];
  /** Current height label for slide 13 (from latest actual_height_range). */
  current_height_label: string | null;
  site_master_plan: SiteMasterPlan | null;
  /** Per-box species placement (granular grid layout) for the Site Master Plan. */
  site_plan_boxes?: BoxSpeciesBreakdown[];
}

/** One box's species counts, for the Site Master Plan box-wise breakdown. */
export interface BoxSpeciesBreakdown {
  label: string;
  species: { name: string; count: number }[];
}

export interface ForestReportData {
  meta: ReportMeta;
  forest: FullForestPayload;
  computed: ComputedReport;
}

/** Props every slide component receives. */
export interface SlideProps {
  data: ForestReportData;
}
