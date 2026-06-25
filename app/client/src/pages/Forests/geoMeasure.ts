/**
 * geoMeasure — real-coordinate area/perimeter + boundary file import for the
 * Restor.eco-style boundary editor. All inputs/outputs are geographic {lat,lng}.
 */
export interface LL {
  lat: number;
  lng: number;
}

const M_PER_DEG = 111320; // metres per degree latitude

/** Polygon area in hectares (metric shoelace about the ring's centroid). */
export function polygonAreaHa(pts: LL[]): number {
  if (pts.length < 3) return 0;
  const cLat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
  const cosLat = Math.cos((cLat * Math.PI) / 180) || 1;
  // project to local metres
  const xy = pts.map((p) => ({ x: p.lng * M_PER_DEG * cosLat, y: p.lat * M_PER_DEG }));
  let a = 0;
  for (let i = 0, j = xy.length - 1; i < xy.length; j = i++) {
    a += (xy[j]!.x + xy[i]!.x) * (xy[j]!.y - xy[i]!.y);
  }
  return Math.abs(a / 2) / 10000;
}

/** Perimeter in metres (haversine around the closed ring). */
export function perimeterM(pts: LL[]): number {
  if (pts.length < 2) return 0;
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  let total = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    total += 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  return total;
}

/** Human label, e.g. "1.84 ha" or "640 m²" for tiny plots. */
export function areaLabel(ha: number): string {
  if (ha <= 0) return '—';
  if (ha < 0.1) return `${Math.round(ha * 10000)} m²`;
  return `${ha.toFixed(2)} ha`;
}

/** Largest ring of [lng,lat] pairs from a GeoJSON geometry (Polygon/MultiPolygon). */
function ringsFromGeoJson(obj: unknown): number[][] {
  const out: number[][][] = [];
  const visit = (g: { type?: string; coordinates?: unknown; geometry?: unknown; features?: unknown[]; geometries?: unknown[] }) => {
    if (!g || typeof g !== 'object') return;
    if (Array.isArray(g.features)) g.features.forEach((f) => visit(f as never));
    if (g.geometry) visit(g.geometry as never);
    if (Array.isArray(g.geometries)) g.geometries.forEach((x) => visit(x as never));
    if (g.type === 'Polygon' && Array.isArray(g.coordinates)) out.push(g.coordinates[0] as number[][]);
    if (g.type === 'MultiPolygon' && Array.isArray(g.coordinates)) {
      (g.coordinates as number[][][][]).forEach((poly) => out.push(poly[0] as number[][]));
    }
  };
  visit(obj as never);
  // pick the ring with the most points (usually the outer site)
  return out.sort((a, b) => (b?.length ?? 0) - (a?.length ?? 0))[0] ?? [];
}

/**
 * Parse a boundary file (GeoJSON or KML) into a {lat,lng}[] ring. Returns [] on
 * failure. GeoJSON coords are [lng,lat]; KML <coordinates> are "lng,lat,alt".
 */
export function parseBoundaryFile(text: string, filename: string): LL[] {
  const name = (filename || '').toLowerCase();
  const looksKml = name.endsWith('.kml') || /<kml[\s>]|<coordinates>/i.test(text);
  try {
    if (!looksKml) {
      const ring = ringsFromGeoJson(JSON.parse(text));
      return ring
        .map((c) => ({ lat: Number(c[1]), lng: Number(c[0]) }))
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    }
  } catch {
    /* fall through to KML attempt */
  }
  // KML
  try {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    const nodes = Array.from(doc.getElementsByTagName('coordinates'));
    if (!nodes.length) return [];
    // largest coordinate block
    const blocks = nodes
      .map((n) => (n.textContent ?? '').trim())
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);
    const raw = blocks[0] ?? '';
    const pts = raw
      .split(/\s+/)
      .map((tok) => tok.split(',').map(Number))
      .filter((c) => c.length >= 2 && Number.isFinite(c[0]) && Number.isFinite(c[1]))
      .map((c) => ({ lat: c[1]!, lng: c[0]! }));
    // drop the trailing closing point if it duplicates the first
    if (pts.length > 1) {
      const a = pts[0]!;
      const z = pts[pts.length - 1]!;
      if (Math.abs(a.lat - z.lat) < 1e-9 && Math.abs(a.lng - z.lng) < 1e-9) pts.pop();
    }
    return pts;
  } catch {
    return [];
  }
}
