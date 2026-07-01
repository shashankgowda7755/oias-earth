/**
 * Per-step client-side validation for the Add/Edit Forest wizard.
 *
 * Each validator returns a FieldErrors map (empty == valid). Next is gated on
 * the current step; final Save re-validates every step.
 *
 * Required fields = the minimal safe core only, so operators who don't yet have
 * the rest of the data can still create/advance a forest:
 *   - Step 1: forest_name, forest_internal_id, coordinates (lat + long).
 *   - Step 2: none required.
 * Every other field is OPTIONAL. A value that IS entered is still format-checked
 * (a typed grid count must be a positive integer, a typed lat must be in range),
 * but a blank never blocks Next/Save.
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

/** Optional positive-integer: blank is allowed; a typed value must be valid. */
function optionalPositiveInt(v: string): string | undefined {
  return isBlank(v) ? undefined : positiveIntError(v);
}

/** Non-negative number check for distances/angles/gaps. */
function nonNegativeNumberError(v: string): string | undefined {
  if (isBlank(v)) return REQUIRED;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 'Enter a valid number (0 or more).';
  return undefined;
}

/** Optional non-negative number: blank is allowed; a typed value must be valid. */
function optionalNonNegativeNumber(v: string): string | undefined {
  return isBlank(v) ? undefined : nonNegativeNumberError(v);
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
  // Core identity — kept required so forests stay identifiable + dedup-safe.
  if (isBlank(f.forest_name)) e.forest_name = REQUIRED;
  if (isBlank(f.forest_internal_id)) e.forest_internal_id = REQUIRED;

  // Coordinates required (map + the server rejects create without them).
  if (isBlank(f.forest_geo_lat)) e.forest_geo_lat = REQUIRED;
  else if (!validLat(f.forest_geo_lat)) e.forest_geo_lat = 'Latitude must be between -90 and 90.';
  if (isBlank(f.forest_geo_long)) e.forest_geo_long = REQUIRED;
  else if (!validLong(f.forest_geo_long)) e.forest_geo_long = 'Longitude must be between -180 and 180.';

  // city / state / country + site_manager / user / sponsors are all OPTIONAL.
  return e;
}

function validateGrid(f: ForestFormState): FieldErrors {
  // All Step-2 fields are OPTIONAL. Only report an error when a value is entered
  // but malformed — a blank never blocks.
  const e: FieldErrors = {};

  const posInt: (keyof ForestFormState)[] = [
    'box_rows', 'box_column', 'tree_row', 'tree_column', 'total_trees', 'project_period',
  ];
  for (const k of posInt) {
    const msg = optionalPositiveInt(f[k] as string);
    if (msg) e[k] = msg;
  }

  const nonNeg: (keyof ForestFormState)[] = [
    'box_to_box_distance', 'tree_to_tree_distance',
    'direction_angle', 'boundary_gap', 'pathway_spacing',
  ];
  for (const k of nonNeg) {
    const msg = optionalNonNegativeNumber(f[k] as string);
    if (msg) e[k] = msg;
  }

  // project_site, plantation_date, client_code, forest_code: optional (no checks).
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
