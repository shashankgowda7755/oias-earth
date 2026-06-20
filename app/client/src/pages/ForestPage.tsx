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
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import ForestTour from '@/components/ForestTour';
import {
  fetchForestsMap, fetchForestTrees, fetchForestScenes, fetchForestBoundary,
  type ForestPin, type PublicTree, type ForestScene,
} from '@/lib/publicApi';
import '@/styles/earth.css';

const SAT_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const LABELS_URL = 'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png';
const STATUS_COLOR: Record<number, string> = { 1: '#b6ff3c', 2: '#e8a33d', 3: '#f0792b', 4: '#6b7b82' };
const STATUS_LABEL: Record<number, string> = { 1: 'Healthy', 2: 'Drying', 3: 'Damaged', 4: 'Dead' };

function esc(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
function treePin(statusId: number): L.DivIcon {
  return L.divIcon({
    className: `tree-pin s${statusId}`,
    html: '<span class="core" style="position:relative;display:block;width:11px;height:11px;border-radius:50%"></span>',
    iconSize: [11, 11], iconAnchor: [5.5, 5.5],
  });
}
function treeClusterIcon(c: L.MarkerCluster): L.DivIcon {
  const n = c.getChildCount();
  const size = n < 100 ? 30 : n < 1000 ? 38 : 46;
  return L.divIcon({ className: 'tree-cluster', html: `<div class="tc" style="font-size:${n < 1000 ? 12 : 11}px">${n.toLocaleString()}</div>`, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
}
const num = (v: unknown): number | null => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

export default function ForestPage() {
  const { id = '' } = useParams();
  const [forest, setForest] = useState<ForestPin | null>(null);
  const [trees, setTrees] = useState<PublicTree[]>([]);
  const [scenes, setScenes] = useState<ForestScene[]>([]);
  const [boundary, setBoundary] = useState<{ lat: number; lng: number }[]>([]);
  const [areaHa, setAreaHa] = useState<number | null>(null);
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
    ])
      .then(([fmap, tr, sc, bd]) => {
        if (off) return;
        const f = fmap.find((x) => x.id === id) ?? null;
        if (!f) { setErr('Forest not found'); return; }
        setForest(f); setTrees(tr); setScenes(sc);
        setBoundary(bd.boundary ?? []); setAreaHa(bd.area_ha ?? null);
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

  // Mini-map: boundary polygon + clustered, health-coloured tree pins.
  useEffect(() => {
    if (loading || err || !mapEl.current || mapRef.current) return;
    const map = L.map(mapEl.current, { zoomControl: true, attributionControl: false });
    mapRef.current = map;
    L.tileLayer(SAT_URL, { maxZoom: 19 }).addTo(map);
    L.tileLayer(LABELS_URL, { maxZoom: 19, opacity: 0.85 }).addTo(map);

    const pts: [number, number][] = [];
    if (boundary.length >= 3) {
      const poly = L.polygon(boundary.map((p) => [p.lat, p.lng] as [number, number]), {
        color: '#b6ff3c', weight: 2, fillColor: '#b6ff3c', fillOpacity: 0.06,
      }).addTo(map);
      boundary.forEach((p) => pts.push([p.lat, p.lng]));
      void poly;
    }

    const cluster = L.markerClusterGroup({ iconCreateFunction: treeClusterIcon, maxClusterRadius: 50, disableClusteringAtZoom: 18, chunkedLoading: true });
    for (const t of trees) {
      const lat = num(t.lat), lng = num(t.lng);
      if (lat == null || lng == null) continue;
      const sid = t.status_id ?? 1;
      const color = STATUS_COLOR[sid] ?? '#b6ff3c';
      const stats = [t.height != null ? `${t.height} m` : '', t.co2e_kg != null && sid !== 4 ? `${t.co2e_kg} kg CO₂e` : '', t.oxygen_kg != null && sid !== 4 ? `${t.oxygen_kg} kg O₂` : ''].filter(Boolean).join(' · ');
      L.marker([lat, lng], { icon: treePin(sid) })
        .bindPopup(
          `<div style="font-family:'Plus Jakarta Sans',sans-serif;min-width:150px"><strong style="color:${color}">${esc(t.tree_unique_id) || 'Tree'}</strong>` +
          (t.species ? `<br/><span style="color:#cdd">${esc(t.species)}</span>` : '') +
          `<br/><span style="border:1px solid ${color};color:${color};border-radius:999px;padding:1px 8px;font-size:11px">${STATUS_LABEL[sid] ?? 'Alive'}</span>` +
          (stats ? `<br/><span style="font-family:monospace;color:#9ab;font-size:11px">${stats}</span>` : '') +
          `<br/><a href="/tree/${encodeURIComponent(t.id)}" style="color:#b6ff3c;font-weight:600">View life record →</a></div>`,
        )
        .addTo(cluster);
      pts.push([lat, lng]);
    }
    map.addLayer(cluster);

    if (pts.length) map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 18 });
    else if (forest?.lat != null && forest?.lng != null) map.setView([forest.lat, forest.lng], 15);
    else map.setView([12.2, 79.2], 6);
    setTimeout(() => map.invalidateSize(), 60);

    return () => { map.remove(); mapRef.current = null; };
  }, [loading, err, trees, boundary, forest]);

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
          {trees.length === 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <span style={{ background: 'rgba(13,21,24,.8)', color: '#cdd', padding: '8px 16px', borderRadius: 10, fontSize: 13 }}>No trees geo-tagged yet</span>
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
