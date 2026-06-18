/**
 * PublicMap (/map) — the full explorable Heartbeat Map. Living Instrument
 * design: keyless satellite basemap (Esri World Imagery) + dark CARTO labels,
 * forests pulsing bio-lime to signal alive, drill into a forest to see each
 * geo-tagged tree. No login. The shipped map, elevated to the centerpiece.
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import { fetchForestsMap, fetchForestTrees, fetchForestBoundary, type ForestPin } from '@/lib/publicApi';
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

const CENTER: [number, number] = [12.2, 79.2];
const SAT_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const LABELS_URL = 'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png';

function forestIcon(f: ForestPin): L.DivIcon {
  const logo = f.sponsor_logo;
  const inner = logo
    ? `<span class="badge"><img src="${logo}" alt="" referrerpolicy="no-referrer" onerror="this.remove();this.parentNode.classList.add('nologo')"/></span>`
    : '<span class="badge nologo"></span>';
  return L.divIcon({
    className: 'forest-logo-pin',
    html: inner,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
}
function treePin(): L.DivIcon {
  return L.divIcon({
    className: 'tree-pin',
    html: '<span class="core" style="position:relative;display:block;width:11px;height:11px;border-radius:50%"></span>',
    iconSize: [11, 11],
    iconAnchor: [5.5, 5.5],
  });
}

export default function PublicMap() {
  const elRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const forestLayer = useRef<L.MarkerClusterGroup | null>(null);
  const treeLayer = useRef<L.LayerGroup | null>(null);
  const boundaryLayer = useRef<L.LayerGroup | null>(null);

  const [forests, setForests] = useState<ForestPin[]>([]);
  const [selected, setSelected] = useState<ForestPin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [treeLoading, setTreeLoading] = useState(false);
  const [areaHa, setAreaHa] = useState<number | null>(null);

  const totals = forests.reduce(
    (a, f) => ({ tagged: a.tagged + f.tagged_trees, total: a.total + f.total_trees }),
    { tagged: 0, total: 0 },
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
      disableClusteringAtZoom: 16,
      chunkedLoading: true,
    }).addTo(map);
    treeLayer.current = L.layerGroup().addTo(map);
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
        ? `<span style="color:#9ab">sponsored by </span><span style="color:#b6ff3c">${f.sponsor_name}</span><br/>`
        : '';
      m.bindPopup(
        `<div style="font-family:'Plus Jakarta Sans',sans-serif"><strong style="color:#b6ff3c">${f.name ?? 'Forest'}</strong><br/>` +
          `<span style="color:#cdd">${place || '—'}</span><br/>` +
          sponsor +
          `<span style="font-family:'JetBrains Mono',monospace;color:#b6ff3c">${f.tagged_trees}</span><span style="color:#9ab"> / ${f.total_trees} trees alive</span></div>`,
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
            color: '#b6ff3c', weight: 2, fillColor: '#b6ff3c', fillOpacity: 0.08,
          }).addTo(boundaryLayer.current);
          setAreaHa(b.area_ha);
        }
      })
      .catch(() => undefined);
    setTreeLoading(true);
    try {
      const trees = await fetchForestTrees(f.id);
      const bounds: [number, number][] = [];
      for (const t of trees) {
        if (t.lat == null || t.lng == null) continue;
        L.marker([t.lat, t.lng], { icon: treePin() })
          .addTo(layer)
          .bindPopup(
            `<div style="font-family:'Plus Jakarta Sans',sans-serif"><strong style="color:#b6ff3c">${t.tree_unique_id ?? 'Tree'}</strong>` +
              (t.species ? `<br/><span style="color:#cdd">${t.species}</span>` : '') +
              `<br/><span style="font-family:'JetBrains Mono',monospace;color:#9ab;font-size:11px">${t.lat.toFixed(6)}, ${t.lng.toFixed(6)}</span>` +
              `<br/><a href="/tree/${t.id}" style="color:#b6ff3c;font-weight:600">View life record →</a></div>`,
          );
        bounds.push([t.lat, t.lng]);
      }
      if (bounds.length > 1) map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 18 });
    } catch {
      /* keep forest view */
    } finally {
      setTreeLoading(false);
    }
  }

  function showAll() {
    setSelected(null);
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
            <div className="mono" style={{ fontSize: 11, color: 'var(--alive)' }}>every pulse is a tree verified alive</div>
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
          <div><div className="mono" style={{ fontSize: 20, color: 'var(--alive)' }}>{totals.tagged.toLocaleString()}</div><div style={{ fontSize: 11, color: '#9fb0ad', textTransform: 'uppercase', letterSpacing: '.08em' }}>trees alive</div></div>
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
            forests.map((f) => (
              <button
                key={f.id}
                onClick={() => selectForest(f)}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '14px 18px', border: 'none', borderBottom: '1px solid var(--line)', cursor: 'pointer', background: selected?.id === f.id ? 'rgba(182,255,60,.08)' : 'transparent', color: 'var(--surface)' }}
              >
                <div style={{ fontWeight: 600, fontSize: 14 }}>{f.name ?? 'Forest'}</div>
                <div style={{ fontSize: 12, color: '#9fb0ad' }}>{[f.city, f.state].filter(Boolean).join(', ') || '—'}</div>
                <div className="mono" style={{ fontSize: 12, color: 'var(--alive)', marginTop: 4 }}>
                  {f.tagged_trees} / {f.total_trees} alive
                </div>
              </button>
            ))
          )}
        </aside>

        <div style={{ flex: 1, position: 'relative' }}>
          <div ref={elRef} style={{ position: 'absolute', inset: 0 }} />
          {treeLoading && (
            <div className="mono" style={{ position: 'absolute', top: 12, left: 12, zIndex: 1000, background: 'var(--ink)', color: 'var(--alive)', padding: '6px 12px', borderRadius: 6, fontSize: 12, border: '1px solid var(--line)' }}>
              loading trees…
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
