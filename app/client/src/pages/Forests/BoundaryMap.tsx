/**
 * BoundaryMap — keyless, dependency-free render of a forest's geo:
 *  - the perimeter polygon (`forest_boundary`, parsed to BoundaryPoint[]), and
 *  - the center point (forest_geo_lat/long) as a pin.
 *
 * GAP / DIVERGENCE: the brief referenced a shared `MapView`. It does NOT exist
 * in the current tree, so the Overview detail tab renders this local, offline
 * SVG instead (no Google Maps JS key required — consistent with the existing
 * keyless LocationPicker). It projects lat/lng with a simple equirectangular
 * fit to the data's bounding box — enough to convey shape/scale read-only. A
 * "View on Google Maps" deep-link opens the real map. Swap in the Maps SDK +
 * a VITE_* key when wiring the live map.
 *
 * Renders nothing meaningful-but-empty: with no boundary and no center it shows
 * a graceful "No geo data" placeholder (sections degrade gracefully per spec).
 */
import { useMemo } from 'react';
import type { BoundaryPoint } from './fullTypes';

export interface BoundaryMapProps {
  boundary: BoundaryPoint[];
  centerLat?: number | null;
  centerLng?: number | null;
  /** SVG height in px. Default 280. */
  height?: number;
  className?: string;
}

const PAD = 16; // inner padding in viewBox units
const VB_W = 600;

export function BoundaryMap({
  boundary,
  centerLat,
  centerLng,
  height = 280,
  className,
}: BoundaryMapProps) {
  const hasCenter =
    centerLat != null &&
    centerLng != null &&
    Number.isFinite(centerLat) &&
    Number.isFinite(centerLng);

  const projection = useMemo(() => {
    const pts: BoundaryPoint[] = [...boundary];
    if (hasCenter) pts.push({ lat: centerLat as number, lng: centerLng as number });
    if (pts.length === 0) return null;

    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;
    for (const p of pts) {
      minLat = Math.min(minLat, p.lat);
      maxLat = Math.max(maxLat, p.lat);
      minLng = Math.min(minLng, p.lng);
      maxLng = Math.max(maxLng, p.lng);
    }
    // Guard against a single point (zero-span) so we don't divide by zero.
    const latSpan = maxLat - minLat || 0.0008;
    const lngSpan = maxLng - minLng || 0.0008;
    // Keep the polygon's aspect ratio by deriving height from the lat/lng spans.
    const innerW = VB_W - PAD * 2;
    const innerH = Math.max(
      80,
      Math.min(360, (innerW * latSpan) / lngSpan || innerW * 0.6),
    );
    const vbH = innerH + PAD * 2;

    const project = (p: BoundaryPoint): { x: number; y: number } => {
      const x = PAD + ((p.lng - minLng) / lngSpan) * innerW;
      // invert lat so north is up
      const y = PAD + ((maxLat - p.lat) / latSpan) * innerH;
      return { x, y };
    };
    return { project, vbH };
  }, [boundary, hasCenter, centerLat, centerLng]);

  const gmapsHref = useMemo(() => {
    if (hasCenter) {
      return `https://www.google.com/maps/search/?api=1&query=${centerLat},${centerLng}`;
    }
    if (boundary.length > 0) {
      const p = boundary[0]!;
      return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
    }
    return null;
  }, [hasCenter, centerLat, centerLng, boundary]);

  if (!projection) {
    return (
      <div
        className={`flex items-center justify-center rounded-card border border-dashed border-border bg-[#e8eef2] text-sm text-textSecondary ${className ?? ''}`}
        style={{ height }}
      >
        No geo data
      </div>
    );
  }

  const { project, vbH } = projection;
  const polyPoints = boundary.map(project).map((p) => `${p.x},${p.y}`).join(' ');
  const center = hasCenter
    ? project({ lat: centerLat as number, lng: centerLng as number })
    : null;

  return (
    <div className={className}>
      <div
        className="relative overflow-hidden rounded-card border border-border bg-[#eef3f1]"
        style={{ height }}
      >
        <svg
          viewBox={`0 0 ${VB_W} ${vbH}`}
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={
            boundary.length
              ? `Forest boundary polygon with ${boundary.length} vertices`
              : 'Forest center location'
          }
        >
          {/* faux map grid */}
          <defs>
            <pattern id="bm-grid" width="28" height="28" patternUnits="userSpaceOnUse">
              <path
                d="M 28 0 L 0 0 0 28"
                fill="none"
                stroke="rgba(0,0,0,0.06)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect x="0" y="0" width={VB_W} height={vbH} fill="url(#bm-grid)" />

          {boundary.length >= 3 ? (
            <polygon
              points={polyPoints}
              fill="rgba(23,151,14,0.15)"
              stroke="#17970E"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          ) : boundary.length === 2 ? (
            <polyline points={polyPoints} fill="none" stroke="#17970E" strokeWidth="2" />
          ) : null}

          {/* boundary vertices */}
          {boundary.map((p, i) => {
            const xy = project(p);
            return <circle key={i} cx={xy.x} cy={xy.y} r="2.5" fill="#17970E" />;
          })}

          {/* center pin */}
          {center ? (
            <g transform={`translate(${center.x}, ${center.y})`}>
              <circle cx="0" cy="0" r="6" fill="#d32f2f" stroke="#fff" strokeWidth="2" />
            </g>
          ) : null}
        </svg>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-label text-textSecondary">
        <span>
          {boundary.length
            ? `${boundary.length} boundary point${boundary.length === 1 ? '' : 's'}`
            : 'Center point only'}
          {hasCenter ? ` · center ${(centerLat as number).toFixed(5)}, ${(centerLng as number).toFixed(5)}` : ''}
        </span>
        {gmapsHref ? (
          <a
            href={gmapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            View on Google Maps ↗
          </a>
        ) : null}
      </div>
    </div>
  );
}
