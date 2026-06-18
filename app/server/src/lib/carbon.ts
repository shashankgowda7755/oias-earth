/**
 * Credit-grade carbon math (replaces the linear carbon_offset_per_day model).
 *
 * Chain (see docs/carbon-credit-strategy.md):
 *   AGB  = 0.0673 * (WD * DBH^2 * H)^0.976   (Chave 2014 pantropical, kg)
 *   BGB  = 0.24 * AGB                        (IPCC dry-tropical root:shoot)
 *   C    = (AGB + BGB) * 0.47                (IPCC 2019 carbon fraction)
 *   CO2e = C * 3.667                         (44/12 molar ratio)
 * DBH in cm, H in m, WD in g/cm^3 -> CO2e in kg (STOCK at that measurement).
 * Sequestration = the DELTA in stock between two visits.
 *
 * Registry haircuts applied when aggregating to sellable removals.
 */
export const CARBON_METHOD = 'v1-chave2014';
export const CARBON_FRACTION = 0.47;
export const CO2_PER_C = 3.667;
export const ROOT_SHOOT = 0.24;

/** Default registry deductions (conservative). Net ~ 72% of gross. */
export const BUFFER_PCT = 0.18; // non-permanence buffer pool
export const UNCERTAINTY_PCT = 0.1; // allometric uncertainty deduction

export function agbKg(woodDensity: number, dbhCm: number, heightM: number): number {
  if (!(woodDensity > 0) || !(dbhCm > 0) || !(heightM > 0)) return 0;
  return 0.0673 * Math.pow(woodDensity * dbhCm * dbhCm * heightM, 0.976);
}

/** kg CO2e stock held by one tree at a given DBH/height (0 if unmeasurable). */
export function treeCo2eKg(woodDensity: number, dbhCm: number, heightM: number): number {
  const agb = agbKg(woodDensity, dbhCm, heightM);
  if (agb <= 0) return 0;
  const total = agb + ROOT_SHOOT * agb;
  return total * CARBON_FRACTION * CO2_PER_C;
}

/** gross kg -> net sellable kg after buffer + uncertainty. */
export function netCo2eKg(grossKg: number): number {
  return grossKg * (1 - BUFFER_PCT) * (1 - UNCERTAINTY_PCT);
}

/**
 * Oxygen generated, derived from the SAME measured carbon (not the old linear
 * per-day rate). Photosynthesis fixes 1 mol CO2 and releases 1 mol O2, so by
 * mass O2 ≈ (32/44) * CO2e ≈ 0.727 kg O2 per kg CO2e sequestered. Tying O2 to
 * the Chave carbon keeps the two numbers consistent + defensible.
 */
export const O2_PER_CO2 = 32 / 44; // ≈ 0.7273
export function oxygenKg(co2eKg: number): number {
  return co2eKg > 0 ? co2eKg * O2_PER_CO2 : 0;
}
