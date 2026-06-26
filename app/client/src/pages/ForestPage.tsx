/**
 * ForestPage (/forest/:id) — the individual page for ONE forest. The hub a
 * sponsor/visitor lands on from the map popup: hero + live stats, a clustered
 * mini-map of its geo-tagged trees (boundary + health-coloured pins), the
 * embedded 360° walk-through (when scenes exist), a tree grid → per-tree proof,
 * and report/▸full-screen CTAs. Works for empty forests (0 trees) with an
 * honest empty state. Leaflet + markercluster load with this route chunk; PSV
 * (360) is dynamic-imported inside ForestTour only when there are scenes.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import ForestTour from '@/components/ForestTour';
import {
  fetchForestsMap, fetchForestTrees, fetchForestScenes, fetchForestBoundary, fetchForestReport,
  type ForestPin, type PublicTree, type ForestScene,
} from '@/lib/publicApi';
import { buildPlantingLayout, allocateSpecies, SPECIES_PALETTE, type SpeciesShare, type LayoutStyle } from './Forests/matrixLayout';
import '@/styles/earth.css';

const OSM_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const SAT_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const LABELS_URL = 'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png';
const STATUS_COLOR: Record<number, string> = { 1: '#b6ff3c', 2: '#e8a33d', 3: '#f0792b', 4: '#6b7b82' };
const REVEAL_ZOOM = 17; // saplings render at/above this zoom; outline-only below
const PLANT_TOTAL = 10000; // target saplings laid as the matrix
const LAYOUTS: { id: LayoutStyle; label: string }[] = [
  { id: 'aisle', label: 'Aisle rows' },
  { id: 'grid', label: 'Pathway grid' },
  { id: 'ring', label: 'Ringed' },
];

function esc(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export default function ForestPage() {
  const { id = '' } = useParams();
  const [forest, setForest] = useState<ForestPin | null>(null);
  const [trees, setTrees] = useState<PublicTree[]>([]);
  const [scenes, setScenes] = useState<ForestScene[]>([]);
  const [boundary, setBoundary] = useState<{ lat: number; lng: number }[]>([]);
  const [areaHa, setAreaHa] = useState<number | null>(null);
  const [species, setSpecies] = useState<SpeciesShare[]>([]);
  const [plantTotal, setPlantTotal] = useState(0);
  const [layoutStyle, setLayoutStyle] = useState<LayoutStyle>('aisle');
  const [zoomedIn, setZoomedIn] = useState(false);
  const sapRef = useRef<L.LayerGroup | null>(null);
  const revealedRef = useRef(false);
  const buildRef = useRef<((style: LayoutStyle, animate: boolean) => void) | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    let off = false;
    setLoading(true);
    Promise.all([
      fetchForestsMap().catch(() => [] as ForestPin[]),
      fetchForestTrees(id).catch(() => [] as PublicTree[]),
      fetchForestScenes(id).catch(() => [] as ForestScene[]),
      fetchForestBoundary(id).catch(() => ({ boundary: [], area_ha: null })),
      fetchForestReport(id).catch(() => null),
    ])
      .then(([fmap, tr, sc, bd, rep]) => {
        if (off) return;
        const f = fmap.find((x) => x.id === id) ?? null;
        if (!f) { setErr('Forest not found'); return; }
        setForest(f); setTrees(tr); setScenes(sc);
        setBoundary(bd.boundary ?? []); setAreaHa(bd.area_ha ?? null);
        const inv = rep?.computed?.species_inventory ?? [];
        setSpecies(
          inv
            .filter((s) => (s.saplings ?? 0) > 0)
            .map((s, i) => ({
              name: s.species_name || `Species ${i + 1}`,
              count: s.saplings ?? 0,
              color: SPECIES_PALETTE[i % SPECIES_PALETTE.length]!,
            })),
        );
        setPlantTotal(rep?.computed?.total_saplings ?? f.total_trees ?? 0);
      })
      .finally(() => { if (!off) setLoading(false); });
    return () => { off = true; };
  }, [id]);

  // Carbon + oxygen rolled up from the per-tree estimates (alive trees only).
  const totals = useMemo(() => {
    let co2 = 0, o2 = 0, withCarbon = 0;
    for (const t of trees) {
      if (t.status_id === 4) continue;
      if (t.co2e_kg != null) { co2 += t.co2e_kg; withCarbon++; }
      if (t.oxygen_kg != null) o2 += t.oxygen_kg;
    }
    return { co2: Math.round(co2 * 10) / 10, o2: Math.round(o2 * 10) / 10, withCarbon };
  }, [trees]);

  // Mini-map: boundary polygon + a real-dimensioned SAPLING MATRIX (~10k) laid
  // as 10×10 "matrices" (1ft sapling / 2ft matrix-gap / 10ft pathway), scaled to
  // fit the boundary (or a synthetic square when none drawn) and clipped to it.
  // Zoom-gated: below REVEAL_ZOOM only the outline shows; zooming in reveals the
  // saplings with a fade-in. Canvas renderer keeps 10k points smooth. The layout
  // toggle rebuilds ONLY the sapling layer (preserves zoom) via buildRef.
  useEffect(() => {
    if (loading || err || !mapEl.current) return;
    const map = L.map(mapEl.current, { zoomControl: true, attributionControl: false, preferCanvas: true });
    mapRef.current = map;
    revealedRef.current = false;
    L.tileLayer(OSM_URL, { maxZoom: 19, opacity: 0.6 }).addTo(map);
    L.tileLayer(SAT_URL, { maxZoom: 21, maxNativeZoom: 19 }).addTo(map);
    L.tileLayer(LABELS_URL, { maxZoom: 21, maxNativeZoom: 19, opacity: 0.85 }).addTo(map);

    const polyPts: [number, number][] = [];
    if (boundary.length >= 3) {
      L.polygon(boundary.map((p) => [p.lat, p.lng] as [number, number]), {
        color: '#b6ff3c', weight: 2, fillColor: '#b6ff3c', fillOpacity: 0.05,
      }).addTo(map);
      boundary.forEach((p) => polyPts.push([p.lat, p.lng]));
    }

    // Layout area: the drawn boundary, or a synthetic square around the centre.
    const area: { lat: number; lng: number }[] =
      boundary.length >= 3
        ? boundary
        : forest?.lat != null && forest?.lng != null
          ? (() => {
              const d = 0.0009; // ~100m half-span
              const c = { lat: forest.lat, lng: forest.lng };
              return [
                { lat: c.lat + d, lng: c.lng - d }, { lat: c.lat + d, lng: c.lng + d },
                { lat: c.lat - d, lng: c.lng + d }, { lat: c.lat - d, lng: c.lng - d },
              ];
            })()
          : [];
    const shares = species.length ? species : [{ name: 'Saplings', count: 1, color: '#b6ff3c' }];
    // Per-forest sapling count (real total), capped for render perf. Falls back
    // to a sensible sample only when a forest has no recorded total.
    const total = Math.min(
      plantTotal > 0 ? plantTotal : forest?.total_trees && forest.total_trees > 0 ? forest.total_trees : PLANT_TOTAL,
      12000,
    );

    // (Re)build just the sapling layer for a layout style; keep current zoom.
    let rendererCanvas: HTMLCanvasElement | undefined;
    let matrixBounds: L.LatLngBounds | null = null;
    const buildSaplings = (style: LayoutStyle, animate: boolean) => {
      if (sapRef.current) { sapRef.current.remove(); sapRef.current = null; }
      const pts = area.length >= 3 ? buildPlantingLayout(area, { total, layout: style }).points.slice(0, 12000) : [];
      matrixBounds = pts.length ? L.latLngBounds(pts.map((p) => [p.lat, p.lng] as [number, number])) : null;
      const colored = allocateSpecies(pts.length, shares);
      const renderer = L.canvas({ padding: 0.5 });
      const sap = L.layerGroup();
      pts.forEach((p, i) => {
        L.circleMarker([p.lat, p.lng], { renderer, radius: 2.4, stroke: false, fillColor: colored[i]!.color, fillOpacity: 0.95 }).addTo(sap);
      });
      sapRef.current = sap;
      rendererCanvas = (renderer as unknown as { _container?: HTMLCanvasElement })._container;
      if (polyPts.length < 3 || map.getZoom() >= REVEAL_ZOOM) {
        sap.addTo(map);
        setZoomedIn(true);
        if (animate && rendererCanvas) {
          const cv = rendererCanvas;
          cv.style.transition = 'none'; cv.style.opacity = '0';
          requestAnimationFrame(() => { cv.style.transition = 'opacity .55s ease'; cv.style.opacity = '1'; });
        }
      }
    };
    buildRef.current = buildSaplings;

    // Species legend.
    if (shares.length > 1 || shares[0]!.name !== 'Saplings') {
      const legend = new L.Control({ position: 'bottomright' });
      legend.onAdd = () => {
        const d = L.DomUtil.create('div');
        d.style.cssText = 'background:rgba(13,21,24,.82);padding:8px 10px;border-radius:8px;font:12px/1.6 sans-serif;color:#cdd';
        d.innerHTML =
          `<div style="color:#9fb0ad;margin-bottom:4px">${total.toLocaleString()} saplings</div>` +
          shares.map((s) => `<div style="display:flex;align-items:center;gap:6px"><span style="width:9px;height:9px;border-radius:50%;background:${s.color};display:inline-block"></span>${esc(s.name)} <span style="color:#9fb0ad;margin-left:auto">${s.count.toLocaleString()}</span></div>`).join('');
        return d;
      };
      legend.addTo(map);
    }

    // Zoom gate: reveal/hide the (already-built) sapling layer on zoom crossing.
    map.on('zoomend', () => {
      if (polyPts.length < 3) return; // no boundary → matrix always shown
      const show = map.getZoom() >= REVEAL_ZOOM;
      setZoomedIn(show);
      const sap = sapRef.current;
      if (!sap) return;
      if (show && !map.hasLayer(sap)) {
        sap.addTo(map);
        if (rendererCanvas && !revealedRef.current) {
          const cv = rendererCanvas;
          cv.style.transition = 'none'; cv.style.opacity = '0';
          requestAnimationFrame(() => { cv.style.transition = 'opacity .55s ease'; cv.style.opacity = '1'; });
        }
        revealedRef.current = true;
      } else if (!show && map.hasLayer(sap)) {
        sap.remove();
      }
    });

    buildSaplings(layoutStyle, false);
    // Fit the view: a real boundary stays zoomed out (outline first); a synthetic
    // area fits the matrix itself so it FILLS the map (never a tiny patch).
    if (polyPts.length) {
      // Fill the view with the plot. Small boundaries land >= REVEAL_ZOOM (matrix
      // shows immediately); large ones land below it (outline first, zoom to reveal).
      map.fitBounds(L.latLngBounds(polyPts), { padding: [28, 28], maxZoom: 19, animate: false });
    } else if (matrixBounds) {
      map.fitBounds(matrixBounds, { padding: [18, 18], maxZoom: 19, animate: false });
    } else if (forest?.lat != null && forest?.lng != null) {
      map.setView([forest.lat, forest.lng], 16);
    } else {
      map.setView([12.2, 79.2], 6);
    }
    // Apply the gate at the fitted zoom (fitBounds doesn't always fire zoomend).
    {
      const show = polyPts.length < 3 || map.getZoom() >= REVEAL_ZOOM;
      setZoomedIn(show);
      const sap = sapRef.current;
      if (sap) {
        if (show && !map.hasLayer(sap)) { sap.addTo(map); revealedRef.current = true; }
        else if (!show && map.hasLayer(sap)) sap.remove();
      }
    }
    setTimeout(() => map.invalidateSize(), 60);

    return () => { map.remove(); mapRef.current = null; sapRef.current = null; buildRef.current = null; };
    // layoutStyle intentionally excluded — handled by the rebuild effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, err, boundary, forest, species, plantTotal]);

  // Layout toggle: rebuild only the sapling layer, keeping the current zoom.
  useEffect(() => {
    buildRef.current?.(layoutStyle, true);
  }, [layoutStyle]);

  if (loading) return <Shell><div style={{ color: '#9fb0ad', padding: 60 }}>Loading forest…</div></Shell>;
  if (err || !forest) return <Shell><div style={{ color: '#e8a33d', padding: 60 }}>{err || 'Forest not found'}. <Link to="/map" style={{ color: '#b6ff3c' }}>← Live map</Link></div></Shell>;

  const place = [forest.city, forest.state].filter(Boolean).join(', ');
  const tagged = forest.tagged_trees || trees.length;
  const stat = (v: string, l: string) => (
    <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 16px' }}>
      <div className="mono" style={{ fontSize: 22, color: 'var(--alive)' }}>{v}</div>
      <div style={{ fontSize: 11, color: '#9fb0ad', textTransform: 'uppercase', letterSpacing: '.08em', marginTop: 5 }}>{l}</div>
    </div>
  );

  return (
    <Shell>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(20px,4vw,40px)' }}>
        <Link to="/map" style={{ color: '#9fb0ad', fontSize: 13 }}>← Live map</Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginTop: 10 }}>
          <div>
            <h1 className="serif" style={{ fontWeight: 600, fontSize: 'clamp(28px,4vw,44px)', margin: 0, color: '#fff' }}>{forest.name || 'Forest'}</h1>
            <p style={{ color: '#aebcb9', marginTop: 6 }}>{place || '—'}{forest.sponsor_name ? <> · sponsored by <span style={{ color: 'var(--alive)' }}>{forest.sponsor_name}</span></> : null}</p>
          </div>
          {forest.sponsor_logo && <img src={forest.sponsor_logo} alt="" referrerPolicy="no-referrer" style={{ height: 44, borderRadius: 8 }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 12, marginTop: 22 }}>
          {stat(forest.total_trees.toLocaleString(), 'trees')}
          {stat(tagged.toLocaleString(), 'geo-tagged')}
          {stat(forest.alive_trees != null ? forest.alive_trees.toLocaleString() : '—', 'alive')}
          {stat(forest.survival_pct != null ? `${forest.survival_pct}%` : '—', 'survival')}
          {stat(totals.co2 ? `${totals.co2} kg` : '—', 'CO₂e · est.')}
          {stat(totals.o2 ? `${totals.o2} kg` : '—', 'O₂ · est.')}
          {stat(areaHa != null ? `${areaHa} ha` : '—', 'area')}
        </div>

        {/* Mini map */}
        <h2 className="serif" style={{ color: '#fff', fontWeight: 600, fontSize: 20, margin: '34px 0 12px' }}>Where it stands</h2>
        <div style={{ position: 'relative', height: 440, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line)' }}>
          <div ref={mapEl} style={{ width: '100%', height: '100%' }} />

          {/* Layout toggle (top-left, clear of the zoom control) */}
          <div style={{ position: 'absolute', top: 12, left: 56, zIndex: 500, display: 'flex', gap: 4, background: 'rgba(13,21,24,.82)', padding: 4, borderRadius: 999 }}>
            {LAYOUTS.map((l) => (
              <button
                key={l.id}
                onClick={() => setLayoutStyle(l.id)}
                style={{
                  border: 'none', cursor: 'pointer', borderRadius: 999, padding: '5px 12px', fontSize: 12, fontWeight: 600,
                  background: layoutStyle === l.id ? '#b6ff3c' : 'transparent',
                  color: layoutStyle === l.id ? '#0d1518' : '#cdd',
                }}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Zoom hint — only when a real boundary exists (reveal-on-zoom) */}
          {boundary.length >= 3 && !zoomedIn && (
            <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 500, pointerEvents: 'none' }}>
              <span style={{ background: 'rgba(13,21,24,.85)', color: '#b6ff3c', padding: '7px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600 }}>
                Zoom in to reveal the saplings
              </span>
            </div>
          )}
        </div>

        {/* 360 tour */}
        <h2 className="serif" style={{ color: '#fff', fontWeight: 600, fontSize: 20, margin: '34px 0 12px' }}>360° walk-through</h2>
        {scenes.length > 0 ? (
          <>
            <div style={{ height: 480, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line)', position: 'relative' }}>
              <ForestTour scenes={scenes} />
            </div>
            <Link to={`/forest/${id}/tour`} style={{ display: 'inline-block', marginTop: 10, color: '#b6ff3c', fontWeight: 600 }}>Open full-screen 360° →</Link>
          </>
        ) : (
          <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: '28px 20px', color: '#9fb0ad' }}>
            No 360° walk-through set up for this forest yet.
          </div>
        )}

        {/* Trees */}
        {trees.length > 0 && (
          <>
            <h2 className="serif" style={{ color: '#fff', fontWeight: 600, fontSize: 20, margin: '34px 0 12px' }}>Trees <span style={{ color: '#9fb0ad', fontWeight: 400, fontSize: 14 }}>({trees.length.toLocaleString()})</span></h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10 }}>
              {trees.slice(0, 48).map((t) => {
                const color = STATUS_COLOR[t.status_id ?? 1] ?? '#b6ff3c';
                return (
                  <Link key={t.id} to={`/tree/${t.id}`} style={{ textDecoration: 'none', background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px', display: 'block' }}>
                    <div style={{ color, fontWeight: 600, fontSize: 13 }}>{t.tree_unique_id || 'Tree'}</div>
                    <div style={{ color: '#cdd', fontSize: 12 }}>{t.species || '—'}</div>
                    <div className="mono" style={{ color: '#9ab', fontSize: 11, marginTop: 4 }}>{t.co2e_kg != null ? `${t.co2e_kg} kg CO₂e` : '—'}</div>
                  </Link>
                );
              })}
            </div>
            {trees.length > 48 && <div style={{ color: '#9fb0ad', fontSize: 13, marginTop: 10 }}>+ {(trees.length - 48).toLocaleString()} more — <Link to="/map" style={{ color: '#b6ff3c' }}>explore all on the live map →</Link></div>}
          </>
        )}

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 36 }}>
          <Link to="/map" style={{ color: '#b6ff3c', border: '1px solid var(--line)', borderRadius: 999, padding: '10px 18px', fontWeight: 600 }}>← Live map</Link>
          <Link to={`/forest/${id}/tour`} style={{ color: '#b6ff3c', border: '1px solid var(--line)', borderRadius: 999, padding: '10px 18px', fontWeight: 600 }}>🌲 360° walk-through</Link>
          <Link to="/carbon" style={{ color: '#b6ff3c', border: '1px solid var(--line)', borderRadius: 999, padding: '10px 18px', fontWeight: 600 }}>Carbon methodology</Link>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return <div style={{ minHeight: '100vh', background: 'var(--ink, #16282e)', color: '#dfe9e6' }}>{children}</div>;
}
