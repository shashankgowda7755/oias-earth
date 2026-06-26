/**
 * Types for the FULL forest/upsert payload — the canonical "rich forest" record
 * (spec/forest_create_payload.jsonc, Vandalur sample; spec/forest_and_bulk_contracts.md §1).
 *
 * This is the complete `POST /api/v1/forest/upsert` body that populates the many
 * jsonb columns on `forests` AND generates `forest_boxes` + `forest_trees` from
 * `box_data[].species_data[]`. It is far richer than the 2-step quick wizard
 * (which only collects Basic Info + Grid Config) — this shape is produced by the
 * `forest-report-to-json` skill (report -> JSON -> forest/upsert) and consumed by
 * the "Create from JSON" import path + the read-only Forest DETAIL view.
 *
 * Every field is OPTIONAL here: the import accepts whatever the report produced
 * and the detail view degrades gracefully on missing sections. Enum string
 * unions are kept exact (per spec) but widened with the source literals only —
 * we never invent values.
 *
 * NOTE: the live record read back from the server may use slightly different
 * casing/keys for some nested fields (the upsert WRITE shape is authoritative
 * here; the per-forest READ shape was not captured — see GAPS in index notes).
 * The detail renderer therefore reads defensively (optional chaining + helpers).
 */

/* ------------------------------ enums (exact) ------------------------------ */

export type PlantationStrategy = 'mixed_species' | 'intense_plantation' | 'others';
export type IrrigationMethod = 'borewell' | 'drip' | 'sprinkler' | 'others';
export type Climate = 'summer' | 'winter' | 'monsoon' | 'others';
export type SoilType = 'red_soil' | 'black_soil' | 'sandy_soil' | 'others';
export type AgreementStatus =
  | 'agreement_confirmed'
  | 'agreement_pending'
  | 'no_agreement';
export type SpeciesHealth = 'good' | 'average' | 'poor' | 'others';
export type SponsorLogoType =
  | 'initiated_by'
  | 'sponsored_by'
  | 'supported_by'
  | 'in_collaboration_with';
export type ReportSlideType = 'first_slide' | 'content_slide' | 'project_impact_slide';

/** Human labels for the enum values used in the detail render. */
export const SPONSOR_LOGO_TYPE_LABELS: Record<SponsorLogoType, string> = {
  initiated_by: 'Initiated By',
  sponsored_by: 'Sponsored By',
  supported_by: 'Supported By',
  in_collaboration_with: 'In Collaboration With',
};

export const REPORT_SLIDE_TYPE_LABELS: Record<ReportSlideType, string> = {
  first_slide: 'First Slide',
  content_slide: 'Content Slide',
  project_impact_slide: 'Project Impact Slide',
};

export const AGREEMENT_STATUS_LABELS: Record<AgreementStatus, string> = {
  agreement_confirmed: 'Agreement Confirmed',
  agreement_pending: 'Agreement Pending',
  no_agreement: 'No Agreement',
};

/* ------------------------------ nested shapes ------------------------------ */

export interface SpeciesData {
  species_id: number | string;
  planted_on?: string;
  count?: number;
  height?: number;
  diameter?: number;
  species_common_name?: string;
  species_name?: string;
}

export interface BoxData {
  id?: string;
  row: number;
  column: number;
  tree_to_tree_distance?: number;
  prefix?: string;
  start?: string | number;
  row_position?: number;
  column_position?: number;
  species_data?: SpeciesData[];
}

export interface SponsorLogoTypeRef {
  label: string;
  value: SponsorLogoType | string;
}

export interface AdditionalSponsorLogo {
  type?: SponsorLogoTypeRef;
  name?: string;
  logo?: string;
}

export interface LandOwnership {
  name?: string;
  agreement_status?: AgreementStatus | string;
}

export interface LandArea {
  total_area?: number;
  planted_area?: number;
}

export interface AuthorizationDetails {
  authorized_by_name?: string;
  authorized_by_designation?: string;
  authorized_date?: string;
  authorized_period?: string | number;
  project_context?: string;
}

export interface GoogleEarthImage {
  image?: string;
  year?: number;
  population?: number;
}

export interface AreaPopulationStatistics {
  total_jurisdiction_area?: number;
  population?: number;
  population_density?: number;
  green_cover?: string;
  environmental_need?: string;
  google_earth_image?: GoogleEarthImage[];
}

export interface Beneficiaries {
  site_supervisor?: number | string;
  watering_team?: number | string;
  de_weeding_crew?: number | string;
  plant_health_specialist?: number | string;
  people_visiting?: number | string;
  people_living_near?: number | string;
  schools_colleges?: number | string;
}

export interface ImpactTermValues {
  land_value?: number;
  tree_value?: number;
  oxygen_generated?: number;
  carbon_sequestration?: number;
}

export interface ForestValueFlowImpactReport {
  short_term?: ImpactTermValues;
  medium_term?: ImpactTermValues;
  long_term?: ImpactTermValues;
}

export interface SpeciesDetails {
  health?: SpeciesHealth | string;
  health_other?: string;
  mortality_rate?: number;
  other_issues?: string;
  additional_scope?: string;
}

export interface MaintenanceWorkforceQuarter {
  year: number;
  quarter: number;
  total_holidays_weekly_off?: number;
  total_holidays_festival?: number;
  total_watering_days?: number;
  total_raining_days?: number;
  full_time_gardeners?: number;
  part_time_gardeners?: number;
  total_part_time_labour_days?: number;
}

export interface TargetHeightRange {
  year: number;
  min?: number;
  max?: number;
}

export interface ActualHeightRange {
  year: number;
  quarter: number;
  min?: number;
  max?: number;
}

export interface PlantGrowthData {
  target_height_range?: TargetHeightRange[];
  actual_height_range?: ActualHeightRange[];
}

export interface SoilPhReading {
  year: number;
  quarter: number;
  reading_date?: string;
  meter_image?: string;
  meter_reading?: number;
}

export interface TempHumidityPoint {
  image?: string;
  humidity?: number;
  temperature?: number;
}

export interface TemperatureHumidityReading {
  year: number;
  quarter: number;
  reading_date?: string;
  inside_plantation?: TempHumidityPoint;
  outside_plantation?: TempHumidityPoint;
}

export interface EnvironmentalNeedIndicator {
  heading?: string;
  description?: string;
}

export interface SecurityImageItem {
  name?: string;
  description?: string;
  image?: string;
}

export interface SecurityAndInfrastructure {
  description?: string;
  image_data?: SecurityImageItem[];
}

export interface PlantationProgressQuarter {
  year: number;
  quarter: number;
  image?: string;
}

export interface NamedImage {
  name?: string;
  description?: string;
  image?: string;
}

export interface ReportImage {
  slide_type?: ReportSlideType | string;
  image?: string;
}

/** A boundary polygon vertex (spec/geo_and_species.md). */
export interface BoundaryPoint {
  lat: number;
  lng: number;
}

/* ------------------------------ full payload ------------------------------ */

/**
 * The complete forest/upsert body. All optional so the JSON import accepts a
 * partial report and the detail view degrades gracefully. `id` (when present)
 * makes the upsert an UPDATE (Forest Edit prefill).
 */
export interface FullForestPayload {
  /** EDIT mode -> upsert UPDATE; absent -> INSERT. */
  id?: string;

  /* Basic */
  forest_name?: string;
  forest_desc?: string;
  forest_internal_id?: string;
  forest_unique_id?: string;
  forest_geo_lat?: string | number;
  forest_geo_long?: string | number;
  forest_address?: string;
  forest_contact_email?: string;
  forest_city?: string;
  forest_state?: string;
  forest_country?: string;

  /** Perimeter polygon. Live forests store this as a JSON STRING; we accept
   * either an already-parsed array or the raw string. */
  forest_boundary?: BoundaryPoint[] | string;

  /* Grid */
  box_rows?: number;
  box_columns?: number;
  box_to_box_distance?: number;
  tree_rows?: number;
  tree_columns?: number;
  tree_to_tree_distance?: number;
  direction_angle?: number;
  boundary_gap?: number;
  pathway_spacing?: number;

  /* Project */
  project_site?: string;
  project_period?: number;
  plantation_date?: string;

  /* Assignees (UUIDs looked up from list endpoints) */
  employee_id?: string;
  sponsor_id?: string;
  user_role_id?: string;

  /* Box layout -> generates forest_boxes + forest_trees */
  box_data?: BoxData[];

  /* Rich / reporting jsonb columns */
  additional_sponsor_logo?: AdditionalSponsorLogo[];
  land_ownership?: LandOwnership;
  land_area?: LandArea;
  plantation_strategy?: PlantationStrategy | string;
  plantation_strategy_other?: string;
  irrigation_method?: IrrigationMethod | string;
  irrigation_method_other?: string;
  climate?: Climate | string;
  climate_other?: string;
  soil_type?: SoilType | string;
  soil_type_other?: string;
  digipin?: string;
  last_inspection_date?: string;
  permission_letter?: string;
  site_layout?: string;
  authorization_details?: AuthorizationDetails;
  area_population_statistics_details?: AreaPopulationStatistics;
  direct_and_indirect_beneficiaries?: Beneficiaries;
  forest_value_flow_impact_report?: ForestValueFlowImpactReport;
  species_details?: SpeciesDetails;
  maintenance_workforce?: MaintenanceWorkforceQuarter[];
  plant_growth_data?: PlantGrowthData;
  soil_ph_level?: SoilPhReading[];
  temperature_humidity?: TemperatureHumidityReading[];
  environmental_need_indicators?: EnvironmentalNeedIndicator[];
  security_and_infrastructure?: SecurityAndInfrastructure;
  plantation_progress?: PlantationProgressQuarter[];
  dashboard_images?: NamedImage[];
  report_images?: ReportImage[];
}

/* ------------------------------ helpers ------------------------------ */

/**
 * Parse a forest_boundary value (array or JSON string) into BoundaryPoint[].
 * Tolerant of {lat,lng} and {lat,long} keys and string numerics. Returns [] on
 * anything unparseable so the map can decide to fall back to the center pin.
 */
export function parseBoundary(
  raw: BoundaryPoint[] | string | null | undefined,
): BoundaryPoint[] {
  if (!raw) return [];
  let arr: unknown = raw;
  if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];
  const out: BoundaryPoint[] = [];
  for (const p of arr) {
    if (!p || typeof p !== 'object') continue;
    const o = p as Record<string, unknown>;
    const lat = Number(o.lat);
    const lng = Number(o.lng ?? o.long ?? o.lon);
    if (Number.isFinite(lat) && Number.isFinite(lng)) out.push({ lat, lng });
  }
  return out;
}

/**
 * Adapt a forest LIST row into a FullForestPayload so the DETAIL view's Overview
 * tab renders immediately from list data. The list response carries only scalar
 * columns + sponsor summaries — NOT the rich jsonb columns — so the other detail
 * tabs read "No data" until a per-forest read-one fetch hydrates them. See the
 * ForestDetailView header + index.tsx GAPS. Typed loosely (`ListRowLike`) to
 * avoid coupling fullTypes to the shared entities module.
 */
export interface ListRowLike {
  id?: string;
  forest_name?: string | null;
  forest_internal_id?: string | null;
  forest_unique_id?: string | null;
  forest_geo_lat?: string | null;
  forest_geo_long?: string | null;
  forest_address?: string | null;
  forest_city?: string | null;
  forest_state?: string | null;
  forest_country?: string | null;
  box_rows?: number | null;
  box_column?: number | null;
  tree_row?: number | null;
  tree_column?: number | null;
  project_period?: number | null;
  plantation_date?: string | null;
}

export function rowToFullPayload(row: ListRowLike): FullForestPayload {
  return {
    id: row.id,
    forest_name: row.forest_name ?? undefined,
    forest_internal_id: row.forest_internal_id ?? undefined,
    forest_unique_id: row.forest_unique_id ?? undefined,
    forest_geo_lat: row.forest_geo_lat ?? undefined,
    forest_geo_long: row.forest_geo_long ?? undefined,
    forest_address: row.forest_address ?? undefined,
    forest_city: row.forest_city ?? undefined,
    forest_state: row.forest_state ?? undefined,
    forest_country: row.forest_country ?? undefined,
    // List uses singular box_column/tree_row/tree_column; full payload is plural.
    box_rows: row.box_rows ?? undefined,
    box_columns: row.box_column ?? undefined,
    tree_rows: row.tree_row ?? undefined,
    tree_columns: row.tree_column ?? undefined,
    project_period: row.project_period ?? undefined,
    plantation_date: row.plantation_date ?? undefined,
  };
}

/** A flat summary of a parsed payload for the import confirm screen. */
export interface ForestImportSummary {
  forestName: string;
  boxCount: number;
  speciesCount: number;
  treeCount: number;
}

/**
 * Summarise a parsed full payload: forest name, #boxes, #distinct species,
 * #trees (sum of species_data[].count across all boxes; defaults count=1 when
 * a species row omits it, matching the "generate `count` trees each" rule).
 */
export function summarizePayload(p: FullForestPayload): ForestImportSummary {
  const boxes = Array.isArray(p.box_data) ? p.box_data : [];
  const speciesIds = new Set<string>();
  let treeCount = 0;
  for (const b of boxes) {
    for (const s of b.species_data ?? []) {
      if (s.species_id != null) speciesIds.add(String(s.species_id));
      const c = Number(s.count);
      treeCount += Number.isFinite(c) && c > 0 ? c : 1;
    }
  }
  return {
    forestName: p.forest_name?.trim() || 'Untitled forest',
    boxCount: boxes.length,
    speciesCount: speciesIds.size,
    treeCount,
  };
}
