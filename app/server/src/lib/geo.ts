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
  return `https://oiasearth.com/tree/${forestUniqueId}/${treeUniqueId}`;
}

/* ------------------------------------------------------------------ */
/* Modeled position from a 360 tap (Tap-to-Tag Studio).               */
/*                                                                    */
/* IMPORTANT (council-reviewed): the lat/lng this produces is         */
/* INDICATIVE only, never surveyed. The tap itself (yaw/pitch) is     */
/* exact and is the stored source of truth; this projection assumes   */
/* flat level ground at a known camera height and that the scene      */
/* heading = true north. Always store with geo_is_modeled = TRUE and  */
/* never feed it into the carbon/blockchain anchor.                   */
/* ------------------------------------------------------------------ */

const EARTH_R = 6378137; // metres
const D2R = (d: number) => (d * Math.PI) / 180;
const R2D = (r: number) => (r * 180) / Math.PI;

/** Forward geodesic: from (lat,lng) travel `distM` metres on bearing `brgDeg`. */
export function destPoint(lat: number, lng: number, brgDeg: number, distM: number): { lat: number; lng: number } {
  const br = D2R(brgDeg), la1 = D2R(lat), lo1 = D2R(lng), dr = distM / EARTH_R;
  const la2 = Math.asin(Math.sin(la1) * Math.cos(dr) + Math.cos(la1) * Math.sin(dr) * Math.cos(br));
  const lo2 = lo1 + Math.atan2(Math.sin(br) * Math.sin(dr) * Math.cos(la1), Math.cos(dr) - Math.sin(la1) * Math.sin(la2));
  return { lat: R2D(la2), lng: R2D(lo2) };
}

/**
 * Estimate an INDICATIVE ground position for a tree tapped in a 360 scene.
 * @param camLat,camLng  camera (scene) position
 * @param yawDeg         tapped horizontal angle (0-360, scene heading assumed = N)
 * @param pitchDeg       tapped vertical angle (negative = looking down)
 * @param camH           camera eye height in metres (default 1.6)
 * @param maxDistM       hard cap so a near-horizon tap can't project to infinity
 * Returns null when the tap is at/above the horizon (no flat-ground intersection).
 */
export function projectFromCamera(
  camLat: number,
  camLng: number,
  yawDeg: number,
  pitchDeg: number,
  camH = 1.6,
  maxDistM = 60,
): { lat: string; lng: string; distM: number } | null {
  const down = -pitchDeg; // positive when looking down at the ground
  if (down <= 1) return null; // at/above horizon -> no usable intersection
  let d = camH / Math.tan(D2R(down));
  if (!Number.isFinite(d) || d <= 0) return null;
  d = Math.min(Math.max(d, 0.3), maxDistM); // clamp [0.3 m, cap]
  const p = destPoint(camLat, camLng, ((yawDeg % 360) + 360) % 360, d);
  return { lat: p.lat.toFixed(7), lng: p.lng.toFixed(7), distM: Math.round(d * 100) / 100 };
}
