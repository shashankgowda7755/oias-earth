/**
 * Species module — form model, validation, and REST payload mapping for the
 * admin "Manage Species" page (master_plantspecies).
 *
 * Traits (timber / pollination / nesting / fruit) feed the forest wizard picker
 * and report slide 18 icons. The server reads them straight from this table, so
 * a species added here shows correct traits in live reports automatically.
 *
 * Backend CRUD whitelist (server/src/routes/crud.ts `SPECIES`): the columns
 * accepted on create/update are exactly the snake_case keys built below.
 */
import type { SpeciesRow } from '../../types/entities';

/** Controlled form state. Numbers kept as strings for the shared Field API. */
export interface SpeciesFormValues {
  species_name: string;
  common_name: string;
  species_category: string;
  species_desc: string;
  oxygen_per_day: string;
  carbon_offset_per_day: string;
  rate: string;
  wood_density: string;
  /** traits + active — rendered via toggles, not text Fields. */
  is_timber_production: boolean;
  is_flowering_plant: boolean;
  is_fruit_bearing: boolean;
  is_nesting_habitat: boolean;
  is_active: boolean;
}

/** Per-field error messages; absent key === valid. */
export type SpeciesFormErrors = Partial<
  Record<
    Exclude<
      keyof SpeciesFormValues,
      | 'is_timber_production'
      | 'is_flowering_plant'
      | 'is_fruit_bearing'
      | 'is_nesting_habitat'
      | 'is_active'
    >,
    string
  >
>;

export const EMPTY_SPECIES_FORM: SpeciesFormValues = {
  species_name: '',
  common_name: '',
  species_category: 'Tree',
  species_desc: '',
  oxygen_per_day: '0.225',
  carbon_offset_per_day: '0.125',
  rate: '100',
  wood_density: '',
  is_timber_production: false,
  is_flowering_plant: false,
  is_fruit_bearing: false,
  is_nesting_habitat: false,
  is_active: true,
};

const numOrEmpty = (n: number | null): string =>
  n === null || n === undefined ? '' : String(n);

/** Map a list row into editable form values. */
export function speciesRowToForm(row: SpeciesRow): SpeciesFormValues {
  return {
    species_name: row.speciesName ?? '',
    common_name: row.commonName ?? '',
    species_category: row.speciesCategory ?? '',
    species_desc: row.speciesDesc ?? '',
    oxygen_per_day: numOrEmpty(row.oxygenPerDay),
    carbon_offset_per_day: numOrEmpty(row.carbonOffsetPerDay),
    rate: numOrEmpty(row.rate),
    wood_density: numOrEmpty(row.woodDensity),
    is_timber_production: Boolean(row.isTimberProduction),
    is_flowering_plant: Boolean(row.isFloweringPlant),
    is_fruit_bearing: Boolean(row.isFruitBearing),
    is_nesting_habitat: Boolean(row.isNestingHabitat),
    is_active: Boolean(row.isActive),
  };
}

const NUMERIC_FIELDS = [
  'oxygen_per_day',
  'carbon_offset_per_day',
  'rate',
  'wood_density',
] as const;

/** Required: species_name (botanical). Numeric fields must parse when present. */
export function validateSpeciesForm(values: SpeciesFormValues): SpeciesFormErrors {
  const errors: SpeciesFormErrors = {};

  if (!values.species_name.trim()) {
    errors.species_name = 'Botanical name is required';
  }

  for (const field of NUMERIC_FIELDS) {
    const raw = values[field].trim();
    if (raw && !Number.isFinite(Number(raw))) {
      errors[field] = 'Enter a number';
    }
  }

  return errors;
}

export function hasErrors(errors: SpeciesFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * Build the REST write payload. Keys match the backend `species` column
 * whitelist exactly. Empty optional strings -> null; numeric strings -> Number.
 */
export function speciesFormToPayload(
  values: SpeciesFormValues,
): Record<string, unknown> {
  const orNull = (s: string): string | null => {
    const t = s.trim();
    return t === '' ? null : t;
  };
  const numOrNull = (s: string): number | null => {
    const t = s.trim();
    return t === '' ? null : Number(t);
  };
  return {
    species_name: values.species_name.trim(),
    common_name: orNull(values.common_name),
    species_category: orNull(values.species_category),
    species_desc: orNull(values.species_desc),
    oxygen_per_day: numOrNull(values.oxygen_per_day),
    carbon_offset_per_day: numOrNull(values.carbon_offset_per_day),
    rate: numOrNull(values.rate),
    wood_density: numOrNull(values.wood_density),
    is_timber_production: values.is_timber_production,
    is_flowering_plant: values.is_flowering_plant,
    is_fruit_bearing: values.is_fruit_bearing,
    is_nesting_habitat: values.is_nesting_habitat,
    is_active: values.is_active,
  };
}
