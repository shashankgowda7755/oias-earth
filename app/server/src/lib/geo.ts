/**
 * Geo + impact helpers shared by the forest upsert, bulk import, and the
 * sponsor/geo read endpoints.
 *
 * MODEL (from spec/geo_and_species.md, live-confirmed against PNB forest):
 *   - Each tree carries its own forest_tree_geo_lat/long.
 *   - Per-tree oxygen = species.oxygen_per_day * age_days
 *     carbon          = species.carbon_offset_per_day * age_days
 *     (verified: AK042 146.475 / 0.225 = 651 days; carbon 81.375 / 0.125 = 651).
 *   - Forest totals = sum across all its trees.
 *
 * The wizard payload only gives a single forest center (forest_geo_lat/long),
 * not per-tree coordinates. We spread the generated trees deterministically
 * around the center in a square grid so the map has distinct points and a
 * re-run produces identical coordinates (idempotent). This is a rebuild
 * convenience, NOT a documented business rule — the live system geo-tags trees
 * from field GPS. Flagged so it can be swapped for real coordinates later.
 */

/** Milliseconds per day. */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Whole days between a planted date and `asOf` (default: now). Clamped to >= 0
 * so a future planted_on never yields negative impact.
 */
export function ageDays(plantedOn: string | Date | null | undefined, asOf: Date = new Date()): number {
  if (!plantedOn) return 0;
  const planted = plantedOn instanceof Date ? plantedOn : new Date(plantedOn);
  if (Number.isNaN(planted.getTime())) return 0;
  const days = Math.floor((asOf.getTime() - planted.getTime()) / MS_PER_DAY);
  return days > 0 ? days : 0;
}

/** Per-tree oxygen (kg) = oxygen_per_day * age_days. Rounded to 3 dp. */
export function treeOxygen(oxygenPerDay: number | null | undefined, days: number): number {
  return round3((Number(oxygenPerDay) || 0) * days);
}

/** Per-tree carbon offset (kg) = carbon_offset_per_day * age_days. */
export function treeCarbon(carbonPerDay: number | null | undefined, days: number): number {
  return round3((Number(carbonPerDay) || 0) * days);
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Deterministic lat/long for the i-th tree (0-based) of a box, spread around the
 * forest center. Lays trees out on a √n × √n grid with a fixed step in degrees
 * (~0.00002° ≈ 2.2 m), offset by a per-box seed so different boxes don't overlap.
 *
 * Deterministic in (centerLat, centerLng, boxSeed, index) so re-running the
 * upsert reproduces the same coordinates.
 */
export function spreadTreeGeo(
  centerLat: number,
  centerLng: number,
  boxSeed: number,
  index: number
): { lat: string; lng: string } {
  const STEP = 0.00002; // ~2.2m per cell
  const side = 64; // up to 64 trees per row before wrapping
  const r = Math.floor(index / side);
  const c = index % side;
  // boxSeed shifts each box's block apart on the lat axis.
  const lat = centerLat + (r + boxSeed * side) * STEP;
  const lng = centerLng + c * STEP;
  return { lat: lat.toFixed(6), lng: lng.toFixed(6) };
}

/** Zero-pad a running number to `width` digits (AA001 etc.). width<=0 => no pad. */
export function padTreeNumber(n: number, width: number): string {
  if (width <= 0) return String(n);
  return String(n).padStart(width, '0');
}

/** Public certificate URL for a tree. */
export function treeCertUrl(forestUniqueId: string, treeUniqueId: string): string {
  return `https://bethetreehugger.co/tree/${forestUniqueId}/${treeUniqueId}`;
}
