/**
 * matrixLayout — lay a forest's saplings out as a UNIFORM GRID clipped to the
 * drawn boundary polygon (Sample A "species matrix"), instead of plotting raw
 * GPS points that overlap and spiderfy into a cluster web.
 *
 * Given the boundary ring and a target count (the planting total), we build a
 * regular lattice over the polygon's bounding box, keep only cells whose centre
 * falls INSIDE the polygon (ray-cast point-in-polygon), and return them
 * row-major (north→south, west→east). Species colours are then block-allocated
 * across the returned points in proportion to each species' sapling count, so
 * the grid fills the real site shape and reads as a planting matrix.
 *
 * Pure + keyless. Degree-space math (no projection) is fine at a single site's
 * scale — we only need relative positions, not true distances.
 */
export interface LL {
  lat: number;
  lng: number;
}

/** Ray-cast point-in-polygon. poly is a ring of {lat,lng}. */
export function pointInPolygon(pt: LL, poly: LL[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i]!.lng;
    const yi = poly[i]!.lat;
    const xj = poly[j]!.lng;
    const yj = poly[j]!.lat;
    const intersect =
      yi > pt.lat !== yj > pt.lat &&
      pt.lng < ((xj - xi) * (pt.lat - yi)) / (yj - yi || 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Grid points inside a polygon, roughly `target` of them. Returns row-major
 * (north→south). May return slightly more/fewer than target (shape-dependent);
 * the caller subsamples to taste.
 */
export function gridInPolygon(poly: LL[], target: number): LL[] {
  if (poly.length < 3 || target <= 0) return [];
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of poly) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }
  const h = maxLat - minLat || 1e-4;
  const w = maxLng - minLng || 1e-4;

  // Polygon area as a fraction of its bbox (shoelace; unitless ratio).
  let area2 = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    area2 += (poly[j]!.lng + poly[i]!.lng) * (poly[j]!.lat - poly[i]!.lat);
  }
  const frac = Math.min(1, Math.max(0.05, Math.abs(area2 / 2) / (w * h)));

  // Enough bbox cells so the interior count lands near target.
  const bboxTarget = target / frac;
  const aspect = w / h;
  const cols = Math.max(1, Math.round(Math.sqrt(bboxTarget * aspect)));
  const rows = Math.max(1, Math.ceil(bboxTarget / cols));

  const pts: LL[] = [];
  for (let r = 0; r < rows; r++) {
    const lat = maxLat - (h * (r + 0.5)) / rows; // north first
    for (let c = 0; c < cols; c++) {
      const lng = minLng + (w * (c + 0.5)) / cols;
      const p = { lat, lng };
      if (pointInPolygon(p, poly)) pts.push(p);
    }
  }
  return pts;
}

/**
 * Fallback rectangular lattice centred on a point (used when no boundary is
 * drawn). Spacing-based, NOT a fixed span: each cell is `spacingM` metres apart,
 * so the grid physically grows with the tree count and always reads as evenly
 * spaced rows — never a cramped blob. Centred on `center`, square-ish.
 */
export function gridRect(center: LL, target: number, spacingM = 3): LL[] {
  if (target <= 0) return [];
  // metres → degrees (lat is ~constant; lng shrinks by cos(lat)).
  const dLat = spacingM / 111320;
  const dLng = spacingM / (111320 * Math.cos((center.lat * Math.PI) / 180) || 1);
  const cols = Math.max(1, Math.ceil(Math.sqrt(target)));
  const rows = Math.max(1, Math.ceil(target / cols));
  const pts: LL[] = [];
  for (let r = 0; r < rows; r++) {
    const lat = center.lat + (rows / 2 - r - 0.5) * dLat; // north → south
    for (let c = 0; c < cols && pts.length < target; c++) {
      const lng = center.lng + (c - cols / 2 + 0.5) * dLng;
      pts.push({ lat, lng });
    }
  }
  return pts;
}

/** Evenly subsample an array down to at most `n` items, preserving order. */
export function subsample<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr;
  const out: T[] = [];
  const step = arr.length / n;
  for (let i = 0; i < n; i++) out.push(arr[Math.floor(i * step)]!);
  return out;
}

export interface SpeciesShare {
  name: string;
  count: number;
  color: string;
}

/**
 * Block-allocate a species colour to each of `total` grid points in proportion
 * to each species' share. Returns colour + species name per point (row-major),
 * so contiguous regions of the matrix read as that species.
 */
export function allocateSpecies(
  total: number,
  species: SpeciesShare[],
): { color: string; name: string }[] {
  const out: { color: string; name: string }[] = [];
  const sum = species.reduce((s, x) => s + Math.max(0, x.count), 0);
  if (sum <= 0 || species.length === 0) {
    for (let i = 0; i < total; i++) out.push({ color: '#97C459', name: 'Tree' });
    return out;
  }
  for (const sp of species) {
    const n = Math.round((Math.max(0, sp.count) / sum) * total);
    for (let i = 0; i < n && out.length < total; i++) out.push({ color: sp.color, name: sp.name });
  }
  while (out.length < total) out.push({ color: species[species.length - 1]!.color, name: species[species.length - 1]!.name });
  return out;
}

/** Fixed species palette (Sample A colours first, then extras). */
export const SPECIES_PALETTE = [
  '#97C459',
  '#5DCAA5',
  '#EF9F27',
  '#F0997B',
  '#85B7EB',
  '#D4537E',
  '#B4B2A9',
  '#C0DD97',
];

/* ------------------------------------------------------------------ */
/* Real-dimensioned planting matrix (saplings → matrices → pathways)   */
/* ------------------------------------------------------------------ */

export type LayoutStyle = 'aisle' | 'grid' | 'ring';

export interface PlantingOpts {
  /** target sapling count (≈10,000). */
  total?: number;
  layout?: LayoutStyle;
  /** RELATIVE spacings (ft). Proportions preserved; whole thing scaled to fit. */
  saplingGap?: number; // 1 ft
  matrixGap?: number; // 2 ft (matrix → matrix)
  pathway?: number; // 10 ft
  matrixRows?: number; // 10
  matrixCols?: number; // 10
  /** super-block size (matrices per side) for the 'grid' layout. */
  superBlock?: number; // 5
  /** fraction of the polygon bbox the layout may fill (margin). */
  fitFraction?: number; // 0.92
}

const FT_M = 0.3048; // feet → metres
const M_PER_DEG = 111320; // metres per degree latitude

/**
 * buildPlantingLayout — lay ~`total` saplings as 10×10 "matrices" with real
 * RELATIVE spacing (1 ft sapling / 2 ft matrix-gap / 10 ft pathway), in one of
 * three pathway layouts, then UNIFORMLY scale the whole arrangement to fit
 * inside the boundary polygon (proportions + square spacing preserved) and clip
 * to the polygon. Returns the sapling points (row-major) and the matrix centres.
 */
export function buildPlantingLayout(
  poly: LL[],
  opts: PlantingOpts = {},
): { points: LL[]; blocks: LL[]; count: number } {
  if (poly.length < 3) return { points: [], blocks: [], count: 0 };
  const total = opts.total ?? 10000;
  const mR = Math.max(1, Math.round(opts.matrixRows ?? 10));
  const mC = Math.max(1, Math.round(opts.matrixCols ?? 10));
  const perMatrix = mR * mC;
  const nMatrices = Math.max(1, Math.round(total / perMatrix));
  const s = opts.saplingGap ?? 1;
  const g = opts.matrixGap ?? 2;
  const p = opts.pathway ?? 10;
  const layout = opts.layout ?? 'aisle';
  const k = Math.max(1, Math.round(opts.superBlock ?? 5));
  const fit = opts.fitFraction ?? 0.92;

  // arrange matrices in a near-square grid of matrices
  const mGridCols = Math.max(1, Math.round(Math.sqrt(nMatrices)));
  const mGridRows = Math.ceil(nMatrices / mGridCols);
  const blockW = (mC - 1) * s;
  const blockH = (mR - 1) * s;

  const local: { x: number; y: number }[] = [];
  const blocksLocal: { x: number; y: number }[] = [];
  const placeMatrix = (ox: number, oy: number) => {
    for (let r = 0; r < mR; r++) for (let c = 0; c < mC; c++) local.push({ x: ox + c * s, y: oy + r * s });
    blocksLocal.push({ x: ox + blockW / 2, y: oy + blockH / 2 });
  };

  const gapX = (mc: number) =>
    layout === 'ring' ? p : layout === 'grid' ? ((mc + 1) % k === 0 ? p : g) : g;
  const gapY = (mr: number) =>
    layout === 'aisle' || layout === 'ring' ? p : (mr + 1) % k === 0 ? p : g;

  let placed = 0;
  let y = 0;
  for (let mr = 0; mr < mGridRows; mr++) {
    let x = 0;
    for (let mc = 0; mc < mGridCols && placed < nMatrices; mc++) {
      placeMatrix(x, y);
      placed++;
      x += blockW + gapX(mc);
    }
    y += blockH + gapY(mr);
  }

  // local bbox
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const q of local) {
    minX = Math.min(minX, q.x); maxX = Math.max(maxX, q.x);
    minY = Math.min(minY, q.y); maxY = Math.max(maxY, q.y);
  }
  const bw = maxX - minX || 1;
  const bh = maxY - minY || 1;
  const lcx = (minX + maxX) / 2;
  const lcy = (minY + maxY) / 2;

  // polygon bbox + centroid
  let pMinLat = Infinity, pMaxLat = -Infinity, pMinLng = Infinity, pMaxLng = -Infinity;
  for (const pt of poly) {
    pMinLat = Math.min(pMinLat, pt.lat); pMaxLat = Math.max(pMaxLat, pt.lat);
    pMinLng = Math.min(pMinLng, pt.lng); pMaxLng = Math.max(pMaxLng, pt.lng);
  }
  const cLat = (pMinLat + pMaxLat) / 2;
  const cLng = (pMinLng + pMaxLng) / 2;
  const cosLat = Math.cos((cLat * Math.PI) / 180) || 1;
  const polyWm = (pMaxLng - pMinLng) * M_PER_DEG * cosLat;
  const polyHm = (pMaxLat - pMinLat) * M_PER_DEG;

  // uniform scale (multiplier on the literal feet) so the layout fits the bbox
  const sX = (polyWm * fit) / (bw * FT_M || 1);
  const sY = (polyHm * fit) / (bh * FT_M || 1);
  const scale = Math.max(0.001, Math.min(sX, sY));

  const toLL = (q: { x: number; y: number }): LL => {
    const xm = (q.x - lcx) * FT_M * scale;
    const ym = (q.y - lcy) * FT_M * scale;
    return { lat: cLat - ym / M_PER_DEG, lng: cLng + xm / (M_PER_DEG * cosLat) };
  };

  const points: LL[] = [];
  for (const q of local) {
    const ll = toLL(q);
    if (pointInPolygon(ll, poly)) points.push(ll);
  }
  const blocks = blocksLocal.map(toLL).filter((b) => pointInPolygon(b, poly));
  return { points, blocks, count: points.length };
}
