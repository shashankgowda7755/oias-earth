/**
 * Per-step client-side validation for the Add/Edit Forest wizard.
 *
 * Each validator returns a FieldErrors map (empty == valid). Next is gated on
 * the current step; final Save re-validates every step.
 *
 * Required fields (CONFIRMED via live walk-through — spec flows
 * "Create Forest (2-step wizard)" + screens.Forests dataCollected; the `*`
 * markers list these as required, address/description optional):
 *   - Step 1: forest_name, forest_internal_id, city, state, country,
 *     coordinates (lat+long), Site Manager, Sponsor (>=1), User.
 *   - Step 2: box_rows, box_column, box_to_box_distance, tree_row, tree_column,
 *     tree_to_tree_distance, direction_angle, boundary_gap, pathway_spacing,
 *     project_site, project_period, plantation_date — all required.
 */
import type { FieldErrors, ForestFormState, StepKey } from './types';

const REQUIRED = 'This field is required.';

function isBlank(v: string): boolean {
  return v.trim().length === 0;
}

/** Positive (> 0) integer check for grid dimensions. */
function positiveIntError(v: string): string | undefined {
  if (isBlank(v)) return REQUIRED;
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) return 'Enter a whole number greater than 0.';
  return undefined;
}

/** Non-negative number check for distances/angles/gaps. */
function nonNegativeNumberError(v: string): string | undefined {
  if (isBlank(v)) return REQUIRED;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 'Enter a valid number (0 or more).';
  return undefined;
}

function validLat(v: string): boolean {
  const n = Number(v);
  return Number.isFinite(n) && n >= -90 && n <= 90;
}
function validLong(v: string): boolean {
  const n = Number(v);
  return Number.isFinite(n) && n >= -180 && n <= 180;
}

function validateBasic(f: ForestFormState): FieldErrors {
  const e: FieldErrors = {};
  if (isBlank(f.forest_name)) e.forest_name = REQUIRED;
  if (isBlank(f.forest_internal_id)) e.forest_internal_id = REQUIRED;
  if (isBlank(f.forest_city)) e.forest_city = REQUIRED;
  if (isBlank(f.forest_state)) e.forest_state = REQUIRED;
  if (isBlank(f.forest_country)) e.forest_country = REQUIRED;

  // Coordinates required (Google Places pick) per the flow's condition.
  if (isBlank(f.forest_geo_lat)) e.forest_geo_lat = REQUIRED;
  else if (!validLat(f.forest_geo_lat)) e.forest_geo_lat = 'Latitude must be between -90 and 90.';
  if (isBlank(f.forest_geo_long)) e.forest_geo_long = REQUIRED;
  else if (!validLong(f.forest_geo_long)) e.forest_geo_long = 'Longitude must be between -180 and 180.';

  if (isBlank(f.site_manager_id)) e.site_manager_id = REQUIRED;
  if (f.sponsor_ids.length === 0) e.sponsor_ids = 'Select at least one sponsor.';
  if (isBlank(f.user_id)) e.user_id = REQUIRED;
  return e;
}

function validateGrid(f: ForestFormState): FieldErrors {
  const e: FieldErrors = {};

  const posInt: (keyof ForestFormState)[] = [
    'box_rows', 'box_column', 'tree_row', 'tree_column',
  ];
  for (const k of posInt) {
    const msg = positiveIntError(f[k] as string);
    if (msg) e[k] = msg;
  }

  const nonNeg: (keyof ForestFormState)[] = [
    'box_to_box_distance', 'tree_to_tree_distance',
    'direction_angle', 'boundary_gap', 'pathway_spacing',
  ];
  for (const k of nonNeg) {
    const msg = nonNegativeNumberError(f[k] as string);
    if (msg) e[k] = msg;
  }

  if (isBlank(f.project_site)) e.project_site = REQUIRED;

  const ppMsg = positiveIntError(f.project_period);
  if (ppMsg) e.project_period = ppMsg;

  if (isBlank(f.plantation_date)) e.plantation_date = REQUIRED;

  // Tree setup
  const ttMsg = positiveIntError(f.total_trees);
  if (ttMsg) e.total_trees = ttMsg;
  if (f.total_trees.trim() && Number(f.total_trees) > 0) {
    if (isBlank(f.client_code)) e.client_code = REQUIRED;
    if (isBlank(f.forest_code)) e.forest_code = REQUIRED;
  }

  return e;
}

const VALIDATORS: Record<StepKey, (f: ForestFormState) => FieldErrors> = {
  basic: validateBasic,
  grid: validateGrid,
};

/** Validate a single step. */
export function validateStep(step: StepKey, form: ForestFormState): FieldErrors {
  return VALIDATORS[step](form);
}

/** Validate every step; returns merged errors + the first invalid step. */
export function validateAll(
  form: ForestFormState,
  steps: readonly StepKey[],
): { errors: FieldErrors; firstInvalidStep: StepKey | null } {
  let merged: FieldErrors = {};
  let firstInvalidStep: StepKey | null = null;
  for (const step of steps) {
    const e = VALIDATORS[step](form);
    if (Object.keys(e).length > 0 && firstInvalidStep === null) {
      firstInvalidStep = step;
    }
    merged = { ...merged, ...e };
  }
  return { errors: merged, firstInvalidStep };
}
