/**
 * PublicMap (/map) — the full explorable Heartbeat Map. Living Instrument
 * design: keyless satellite basemap (Esri World Imagery) + dark CARTO labels,
 * forests pulsing bio-lime to signal alive, drill into a forest to see each
 * geo-tagged tree COLOURED BY HEALTH (alive / drying / damaged / dead), with a
 * rich per-tree card. No login. The centerpiece the incumbent never built:
 * their map collapses every tree to one logo blob — ours draws each living tree.
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import { fetchForestsMap, fetchForestTrees, fetchForestBoundary, type ForestPin, type PublicTree } from '@/lib/publicApi';
import '@/styles/earth.css';

function clusterIcon(cluster: L.MarkerCluster): L.DivIcon {
  const n = cluster.getChildCount();
  const size = n < 10 ? 42 : n < 50 ? 54 : 66;
  const fs = n < 100 ? 15 : 13;
  return L.divIcon({
    className: 'forest-cluster',
    html: `<div class="fc" style="font-size:${fs}px"><span>${n}</span><small>forests</small></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// Trees cluster too, so a 10k-tree forest stays smooth; individual health-
// coloured pins reappear at high zoom (disableClusteringAtZoom below).
function treeClusterIcon(cluster: L.MarkerCluster): L.DivIcon {
  const n = cluster.getChildCount();
  const size = n < 100 ? 30 : n < 1000 ? 38 : 46;
  return L.divIcon({
    className: 'tree-cluster',
    html: `<div class="tc" style="font-size:${n < 1000 ? 12 : 11}px">${n.toLocaleString()}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const CENTER: [number, number] = [12.2, 79.2];
const SAT_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const LABELS_URL = 'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png';

// Survival tier → ring colour modifier on the sponsor-logo forest pin.
function survivalClass(pct: number | null | undefined): string {
  if (pct == null) return '';
  if (pct >= 90) return '';
  if (pct >= 75) return ' warn';
  return ' risk';
}

function forestIcon(f: ForestPin): L.DivIcon {
  const logo = f.sponsor_logo;
  const inner = logo
    ? `<span class="badge"><img src="${esc(logo)}" alt="" referrerpolicy="no-referrer" onerror="this.remove();this.parentNode.classList.add('nologo')"/></span>`
    : '<span class="badge nologo"></span>';
  return L.divIcon({
    className: 'forest-logo-pin' + survivalClass(f.survival_pct),
    html: inner,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
}

// Tree pin coloured by health status (1 healthy, 2 drying, 3 damaged, 4 dead).
function treePin(statusId: number): L.DivIcon {
  return L.divIcon({
    className: `tree-pin s${statusId}`,
    html: '<span class="core" style="position:relative;display:block;width:11px;height:11px;border-radius:50%"></span>',
    iconSize: [11, 11],
    iconAnchor: [5.5, 5.5],
  });
}

const STATUS_LABEL: Record<number, string> = { 1: 'Healthy', 2: 'Drying', 3: 'Damaged', 4: 'Dead' };
const STATUS_COLOR: Record<number, string> = { 1: '#b6ff3c', 2: '#e8a33d', 3: '#f0792b', 4: '#6b7b82' };

// Escape any value interpolated into popup innerHTML (pet names are user-supplied
// on gift trees → stored-XSS vector without this).
function esc(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}
const fmtDate = (v: string | null | undefined): string => (v ? String(v).slice(0, 10) : '');

// Human age from age_days (fallback: derive from planted_on).
function ageStr(t: PublicTree): string {
  const days =
    t.age_days != null
      ? t.age_days
      : t.planted_on
        ? Math.floor((Date.now() - new Date(t.planted_on).getTime()) / 86400000)
        : null;
  if (days == null || days < 0) return '';
  if (days < 31) return `${days}d old`;
  if (days < 365) return `${Math.floor(days / 30.44)} mo old`;
  return `${(days / 365.25).toFixed(1)} yr old`;
}

function treePopupHtml(t: PublicTree): string {
  const sid = t.status_id ?? 1;
  const color = STATUS_COLOR[sid] ?? '#b6ff3c';
  // Latest field photo (proof the sapling is real). object-fit cover keeps it tidy.
  const photo = t.photo_url
    ? `<img src="${esc(t.photo_url)}" alt="" loading="lazy" style="width:100%;height:96px;object-fit:cover;border-radius:6px;margin-bottom:6px;display:block"/>`
    : '';
  const head = t.pet_name
    ? `<strong style="color:${color}">${esc(t.pet_name)}</strong><br/><span style="color:#9ab;font-size:11px">${esc(t.tree_unique_id)}</span>`
    : `<strong style="color:${color}">${esc(t.tree_unique_id) || 'Tree'}</strong>`;
  const sp = t.species ? `<br/><span style="color:#cdd">${esc(t.species)}</span>` : '';
  const badge = `<span style="display:inline-block;margin-top:6px;padding:1px 8px;border-radius:999px;border:1px solid ${color};color:${color};font-size:11px">${STATUS_LABEL[sid] ?? 'Alive'}</span>`;
  const stats: string[] = [];
  if (t.height != null) stats.push(`${t.height} m`);
  if (t.dbh != null) stats.push(`⌀ ${t.dbh} cm`);
  if (t.co2e_kg != null && sid !== 4) stats.push(`${t.co2e_kg} kg CO₂e`);
  if (t.oxygen_kg != null && sid !== 4) stats.push(`${t.oxygen_kg} kg O₂`);
  const age = ageStr(t);
  if (age) stats.push(age);
  const statLine = stats.length
    ? `<br/><span style="font-family:'JetBrains Mono',monospace;color:#9ab;font-size:11px">${stats.join('  ·  ')}</span>`
    : '';
  const seen = t.last_seen ? `<br/><span style="color:#7a8b91;font-size:10px">last measured ${fmtDate(t.last_seen)}</span>` : '';
  return (
    `<div style="font-family:'Plus Jakarta Sans',sans-serif;min-width:170px;max-width:210px">${photo}${head}${sp}<br/>${badge}${statLine}${seen}` +
    `<br/><a href="/tree/${encodeURIComponent(t.id)}" style="color:#b6ff3c;font-weight:600;display:inline-block;margin-top:6px">View life record →</a></div>`
  );
}

export default function PublicMap() {
  const elRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const forestLayer = useRef<L.MarkerClusterGroup | null>(null);
  const treeLayer = useRef<L.MarkerClusterGroup | null>(null);
  const boundaryLayer = useRef<L.LayerGroup | null>(null);

  const [forests, setForests] = useState<ForestPin[]>([]);
  const [selected, setSelected] = useState<ForestPin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [treeLoading, setTreeLoading] = useState(false);
  const [areaHa, setAreaHa] = useState<number | null>(null);
  const [treeStats, setTreeStats] = useState<{ alive: number; total: number } | null>(null);

  const totals = forests.reduce(
    (a, f) => ({ alive: a.alive + (f.alive_trees ?? f.tagged_trees), total: a.total + f.total_trees }),
    { alive: 0, total: 0 },
  );

  useEffect(() => {
    if (mapRef.current || !elRef.current) return;
    const map = L.map(elRef.current, { center: CENTER, zoom: 5 });
    L.tileLayer(SAT_URL, { maxZoom: 19, attribution: 'Imagery &copy; Esri' }).addTo(map);
    L.tileLayer(LABELS_URL, { maxZoom: 19, opacity: 0.85, attribution: '&copy; CARTO' }).addTo(map);
    forestLayer.current = L.markerClusterGroup({
      iconCreateFunction: clusterIcon,
      maxClusterRadius: 60,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: false,
      zoomToBoundsOnClick: true, // cluster click → zoom in until pins fan out
      disableClusteringAtZoom: 16,
      chunkedLoading: true,
    }).addTo(map);
    treeLayer.current = L.markerClusterGroup({
      iconCreateFunction: treeClusterIcon,
      maxClusterRadius: 40,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: false,
      disableClusteringAtZoom: 17, // flagship (sparse) shows individual pins; dense forests cluster
      chunkedLoading: true,
    }).addTo(map);
    boundaryLayer.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 60);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    fetchForestsMap()
      .then(setForests)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = forestLayer.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const bounds: [number, number][] = [];
    for (const f of forests) {
      if (f.lat == null || f.lng == null) continue;
      const m = L.marker([f.lat, f.lng], { icon: forestIcon(f) }).addTo(layer);
      const place = [f.city, f.state].filter(Boolean).join(', ');
      const sponsor = f.sponsor_name
        ? `<span style="color:#9ab">sponsored by </span><span style="color:#b6ff3c">${esc(f.sponsor_name)}</span><br/>`
        : '';
      const alive = f.alive_trees ?? f.tagged_trees;
      const surv = f.survival_pct != null ? ` · ${f.survival_pct}% alive` : '';
      m.bindPopup(
        `<div style="font-family:'Plus Jakarta Sans',sans-serif"><strong style="color:#b6ff3c">${esc(f.name) || 'Forest'}</strong><br/>` +
          `<span style="color:#cdd">${esc(place) || '—'}</span><br/>` +
          sponsor +
          `<span style="font-family:'JetBrains Mono',monospace;color:#b6ff3c">${alive.toLocaleString()}</span><span style="color:#9ab"> / ${f.total_trees.toLocaleString()} trees${surv}</span>` +
          `<br/><span style="color:#b6ff3c;font-weight:600;font-size:12px">click to explore trees →</span></div>`,
      );
      m.on('click', () => selectForest(f));
      bounds.push([f.lat, f.lng]);
    }
    if (!selected && bounds.length === 1) map.setView(bounds[0]!, 9);
    else if (!selected && bounds.length > 1)
      map.fitBounds(L.latLngBounds(bounds), { padding: [60, 60], maxZoom: 9 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forests, selected]);

  async function selectForest(f: ForestPin) {
    setSelected(f);
    setTreeStats(null);
    const map = mapRef.current;
    const layer = treeLayer.current;
    if (!map || !layer) return;
    layer.clearLayers();
    boundaryLayer.current?.clearLayers();
    setAreaHa(null);
    if (f.lat != null && f.lng != null) map.setView([f.lat, f.lng], 16);
    // Boundary polygon (EUDR) + area.
    fetchForestBoundary(f.id)
      .then((b) => {
        if (b.boundary.length >= 3 && boundaryLayer.current) {
          L.polygon(b.boundary.map((p) => [p.lat, p.lng] as [number, number]), {
            color: '#b6ff3c', weight: 2, fillColor: '#b6ff3c', fillOpacity: 0.06,
          }).addTo(boundaryLayer.current);
          setAreaHa(b.area_ha);
        }
      })
      .catch(() => undefined);
    setTreeLoading(true);
    try {
      const trees = await fetchForestTrees(f.id);
      const bounds: [number, number][] = [];
      let alive = 0;
      for (const t of trees) {
        if (t.lat == null || t.lng == null) continue;
        const sid = t.status_id ?? 1;
        if (sid !== 4) alive++;
        L.marker([t.lat, t.lng], { icon: treePin(sid) })
          .addTo(layer)
          .bindPopup(treePopupHtml(t));
        bounds.push([t.lat, t.lng]);
      }
      setTreeStats({ alive, total: trees.length });
      if (bounds.length > 1) map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 18 });
    } catch {
      /* keep forest view */
    } finally {
      setTreeLoading(false);
    }
  }

  function showAll() {
    setSelected(null);
    setTreeStats(null);
    treeLayer.current?.clearLayers();
    boundaryLayer.current?.clearLayers();
    setAreaHa(null);
  }

  // Open NASA Worldview at the current view with the MODIS NDVI layer — an
  // independent, NASA-hosted satellite vegetation cross-check (no API key).
  function openNdvi() {
    const m = mapRef.current;
    if (!m) return;
    const b = m.getBounds();
    const v = `${b.getWest().toFixed(3)},${b.getSouth().toFixed(3)},${b.getEast().toFixed(3)},${b.getNorth().toFixed(3)}`;
    const url =
      `https://worldview.earthdata.nasa.gov/?v=${v}` +
      `&l=Reference_Labels_15m,Coastlines_15m,MODIS_Terra_NDVI_8Day`;
    window.open(url, '_blank', 'noopener');
  }

  return (
    <div className="earth" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--ink)', color: 'var(--surface)' }}>
      <header style={{ background: 'var(--ink-2)', padding: '14px clamp(16px,3vw,28px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, borderBottom: '1px solid var(--line)' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'var(--surface)' }}>
          <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--alive)', boxShadow: '0 0 12px rgba(182,255,60,.7)' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Be The Tree Hugger — Heartbeat Map</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--alive)' }}>every pulse is a monitored tree</div>
          </div>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <button
            onClick={openNdvi}
            title="Open NASA Worldview satellite NDVI for this area"
            style={{
              fontFamily: 'var(--mono)', fontSize: 12, padding: '7px 13px', borderRadius: 999, cursor: 'pointer',
              border: '1px solid var(--line)', background: 'transparent', color: 'var(--surface)',
            }}
          >
            🛰 NDVI ↗
          </button>
          <div><div className="mono" style={{ fontSize: 20, color: 'var(--alive)' }}>{forests.length}</div><div style={{ fontSize: 11, color: '#9fb0ad', textTransform: 'uppercase', letterSpacing: '.08em' }}>forests</div></div>
          <div><div className="mono" style={{ fontSize: 20, color: 'var(--alive)' }}>{totals.alive.toLocaleString()}</div><div style={{ fontSize: 11, color: '#9fb0ad', textTransform: 'uppercase', letterSpacing: '.08em' }}>trees alive</div></div>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <aside style={{ width: 290, borderRight: '1px solid var(--line)', overflowY: 'auto', background: 'var(--ink-2)' }}>
          {selected && (
            <button onClick={showAll} style={{ width: '100%', textAlign: 'left', padding: '12px 18px', background: 'rgba(255,255,255,.04)', border: 'none', borderBottom: '1px solid var(--line)', cursor: 'pointer', fontSize: 13, color: 'var(--alive)', fontWeight: 600 }}>
              ← All forests
            </button>
          )}
          {loading ? (
            <p style={{ padding: 18, fontSize: 14, color: '#9fb0ad' }}>Loading forests…</p>
          ) : error ? (
            <p style={{ padding: 18, fontSize: 14, color: 'var(--amber)' }}>{error}</p>
          ) : forests.length === 0 ? (
            <p style={{ padding: 18, fontSize: 14, color: '#9fb0ad' }}>No geo-tagged forests yet.</p>
          ) : (
            forests.map((f) => {
              const alive = f.alive_trees ?? f.tagged_trees;
              return (
                <button
                  key={f.id}
                  onClick={() => selectForest(f)}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '14px 18px', border: 'none', borderBottom: '1px solid var(--line)', cursor: 'pointer', background: selected?.id === f.id ? 'rgba(182,255,60,.08)' : 'transparent', color: 'var(--surface)' }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{f.name ?? 'Forest'}</div>
                  <div style={{ fontSize: 12, color: '#9fb0ad' }}>{[f.city, f.state].filter(Boolean).join(', ') || '—'}</div>
                  <div className="mono" style={{ fontSize: 12, color: 'var(--alive)', marginTop: 4 }}>
                    {alive.toLocaleString()} / {f.total_trees.toLocaleString()} alive
                    {f.survival_pct != null && <span style={{ color: '#9fb0ad' }}> · {f.survival_pct}%</span>}
                  </div>
                </button>
              );
            })
          )}
        </aside>

        <div style={{ flex: 1, position: 'relative' }}>
          <div ref={elRef} style={{ position: 'absolute', inset: 0 }} />
          {treeLoading && (
            <div className="mono" style={{ position: 'absolute', top: 12, left: 12, zIndex: 1000, background: 'var(--ink)', color: 'var(--alive)', padding: '6px 12px', borderRadius: 6, fontSize: 12, border: '1px solid var(--line)' }}>
              loading trees…
            </div>
          )}
          {selected && treeStats && !treeLoading && (
            <div className="mono" style={{ position: 'absolute', top: 12, left: 12, zIndex: 1000, background: 'var(--ink)', color: 'var(--surface)', padding: '8px 12px', borderRadius: 6, fontSize: 12, border: '1px solid var(--line)', maxWidth: 240 }}>
              <div style={{ fontWeight: 700, color: 'var(--alive)', marginBottom: 2 }}>{selected.name}</div>
              <div style={{ color: '#9fb0ad' }}>
                {treeStats.alive} of {treeStats.total} trees alive
                {treeStats.total > 0 && ` · ${Math.round((treeStats.alive / treeStats.total) * 100)}%`}
              </div>
            </div>
          )}
          {/* Health legend — only meaningful once a forest's trees are drawn. */}
          {selected && (
            <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 1000, background: 'var(--ink)', color: 'var(--surface)', padding: '10px 12px', borderRadius: 8, fontSize: 11, border: '1px solid var(--line)' }}>
              <div className="mono" style={{ color: '#9fb0ad', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.08em' }}>tree health</div>
              {([1, 2, 3, 4] as const).map((s) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLOR[s], display: 'inline-block', boxShadow: s === 1 ? '0 0 6px rgba(182,255,60,.8)' : 'none' }} />
                  <span>{STATUS_LABEL[s]}</span>
                </div>
              ))}
            </div>
          )}
          {areaHa != null && (
            <div className="mono" style={{ position: 'absolute', bottom: 24, left: 12, zIndex: 1000, background: 'var(--ink)', color: 'var(--alive)', padding: '6px 12px', borderRadius: 6, fontSize: 12, border: '1px solid var(--line)' }}>
              boundary · {areaHa} ha
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
