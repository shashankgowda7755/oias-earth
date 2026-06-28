/**
 * Form-state + payload types for the Add/Edit Forest flow.
 *
 * CONFIRMED via live walk-through (spec/communitree_admin_spec.json screens.Forests
 * dataCollected + flows "Create Forest (2-step wizard)"): the wizard is TWO steps —
 *   1. 'Basic Info'  2. 'Grid Config'.
 * The earlier "6-step" / "1-6" reading was the forest LIST pagination behind the
 * modal, not wizard steps. This file replaces the old 6-step model.
 *
 * Field naming maps to the Forest data model (snake_case). The shared field
 * components are string-controlled, so every scalar lives here as a STRING and
 * is coerced once, at submit, in AddForestWizard.buildForestValues().
 */

/* ------------------------------ box / species ------------------------------ */

/** One species row in the global species mix (Layer 1). */
export interface GlobalSpeciesRow {
  species_id: string;
  species_label: string;
  count: string;
}

/** One species row inside an EditBoxDialog: a picked species + a planted count. */
export interface BoxSpeciesRow {
  /** Master plant-species id (from POST /master-plantspecies/search). */
  species_id: string;
  /** Display label kept so the AutocompleteField shows it without a refetch. */
  species_label: string;
  /** Trees of this species planted in the box (string-controlled input). */
  count: string;
}

/**
 * Per-box configuration the user sets via EditBoxDialog. The box GRID itself is
 * derived from box_rows x box_column; each cell maps to one BoxConfig keyed by
 * `${row}-${col}` (1-based) in ForestFormState.boxes.
 *
 * `prefix`  — tree-id prefix (e.g. "A"); once set, species rows can be added.
 * `start_digits` — zero-pad width for the running number (default "1").
 * `start`   — first running number for this box. Auto-calculated = previous
 *             box's (start + capacity) but user-editable (spec EditBoxDialog
 *             "Start (number, auto-calculated)").
 */
export interface BoxConfig {
  row: number;            // 1-based grid row
  col: number;            // 1-based grid column
  prefix: string;
  start_digits: string;   // default "1"
  start: string;          // auto-calc; editable
  species: BoxSpeciesRow[];
  box_lat?: string;
  box_lng?: string;
  overridden?: boolean;
}

/** Stable key for a box cell in the boxes map. */
export function boxKey(row: number, col: number): string {
  return `${row}-${col}`;
}

/** Trees a single box can hold = tree_row * tree_column (spec: capacity). */
export function boxCapacity(treeRow: number, treeColumn: number): number {
  const r = Number.isFinite(treeRow) ? treeRow : 0;
  const c = Number.isFinite(treeColumn) ? treeColumn : 0;
  return Math.max(0, r) * Math.max(0, c);
}

/** Trees already assigned to a box = sum of its species row counts. */
export function boxPlanted(box: BoxConfig | undefined): number {
  if (!box) return 0;
  return box.species.reduce((sum, s) => {
    const n = Number(s.count);
    return sum + (Number.isFinite(n) && n > 0 ? n : 0);
  }, 0);
}

/* ------------------------------ form state ------------------------------ */

export interface ForestFormState {
  /** Present only in EDIT mode -> upsert UPDATE; absent -> INSERT. */
  id?: string;

  /* ---- Step 1: Basic Info (CONFIRMED) ---- */
  forest_name: string;
  forest_internal_id: string;
  forest_city: string;
  forest_state: string;
  forest_country: string;
  forest_address: string;
  forest_desc: string;
  forest_geo_lat: string;
  forest_geo_long: string;
  site_manager_id: string;   // employee id (Site Manager*) — AutocompleteField
  site_manager_label: string;
  sponsor_ids: string[];     // sponsor ids (Sponsor*, multi) — AutocompleteField
  sponsor_labels: Record<string, string>; // id -> name for chip display
  user_id: string;           // user id (User*) — AutocompleteField
  user_label: string;

  /* ---- Step 2: Grid Config (CONFIRMED) ---- */
  box_rows: string;
  box_column: string;
  box_to_box_distance: string;  // (ft)
  tree_row: string;
  tree_column: string;
  tree_to_tree_distance: string; // (ft)
  direction_angle: string;
  boundary_gap: string;          // (ft)
  pathway_spacing: string;       // (ft)  — CONFIRMED field
  project_site: string;          // CONFIRMED field
  project_period: string;        // (years)
  plantation_date: string;       // yyyy-mm-dd

  /** Per-box config keyed by `${row}-${col}` (1-based). */
  boxes: Record<string, BoxConfig>;

  /* ---- Tree setup (Layer 1) ---- */
  total_trees: string;
  client_code: string;
  forest_code: string;
  species_mix: GlobalSpeciesRow[];
  geo_tag_mode: boolean;
}

export type StepKey = 'basic' | 'grid';

export const STEP_KEYS: readonly StepKey[] = ['basic', 'grid'] as const;

/** Numbered labels exactly as the live stepper renders them. */
export const STEP_LABELS: Record<StepKey, string> = {
  basic: 'Basic Info',
  grid: 'Grid Config',
};

/** Map from form field name -> error message (only invalid fields present). */
export type FieldErrors = Partial<Record<keyof ForestFormState, string>>;

/** An empty, ready-to-edit form. */
export function emptyForestForm(): ForestFormState {
  return {
    forest_name: '',
    forest_internal_id: '',
    forest_city: '',
    forest_state: '',
    forest_country: '',
    forest_address: '',
    forest_desc: '',
    forest_geo_lat: '',
    forest_geo_long: '',
    site_manager_id: '',
    site_manager_label: '',
    sponsor_ids: [],
    sponsor_labels: {},
    user_id: '',
    user_label: '',

    box_rows: '',
    box_column: '',
    box_to_box_distance: '',
    tree_row: '',
    tree_column: '',
    tree_to_tree_distance: '',
    direction_angle: '',
    boundary_gap: '',
    pathway_spacing: '',
    project_site: '',
    project_period: '',
    plantation_date: '',

    boxes: {},

    total_trees: '',
    client_code: '',
    forest_code: '',
    species_mix: [],
    geo_tag_mode: false,
  };
}

/** A fresh, empty box config for a given cell. */
export function emptyBox(row: number, col: number): BoxConfig {
  return { row, col, prefix: '', start_digits: '1', start: '', species: [], box_lat: '', box_lng: '', overridden: false };
}
