/**
 * PublicMap — public, no-login live map of every geo-tagged forest.
 *
 * The consumer-facing "living proof" surface: anyone can open /map and see
 * where the forests are, how many trees are tagged, and drill into a forest to
 * see individual geo-tagged trees. Keyless Leaflet + OpenStreetMap (no Google
 * billing). To switch to Google Maps tiles later, set VITE_GOOGLE_MAPS_KEY and
 * swap the tileLayer for the Google Maps JS SDK — the data layer is unchanged.
 */
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchForestsMap, fetchForestTrees, type ForestPin } from '@/lib/publicApi';

const DEFAULT_CENTER: [number, number] = [11.0, 78.0];
const DEFAULT_ZOOM = 5;

function forestIcon(count: number, selected: boolean): L.DivIcon {
  const bg = selected ? '#0b5d06' : '#17970E';
  return L.divIcon({
    className: 'forest-pin',
    html: `<div style="display:flex;align-items:center;gap:6px;background:${bg};color:#fff;padding:5px 9px;border-radius:14px;font:600 12px 'Plus Jakarta Sans',sans-serif;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.35);border:2px solid #fff">🌳 ${count}</div>`,
    iconSize: [0, 0],
    iconAnchor: [20, 14],
  });
}

function treeDot(): L.DivIcon {
  return L.divIcon({
    className: 'tree-dot',
    html: `<span style="display:block;width:12px;height:12px;border-radius:50%;background:#22a818;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4)"></span>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

export default function PublicMap() {
  const elRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const forestLayer = useRef<L.LayerGroup | null>(null);
  const treeLayer = useRef<L.LayerGroup | null>(null);

  const [forests, setForests] = useState<ForestPin[]>([]);
  const [selected, setSelected] = useState<ForestPin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [treeLoading, setTreeLoading] = useState(false);

  const totals = forests.reduce(
    (a, f) => ({ tagged: a.tagged + f.tagged_trees, total: a.total + f.total_trees }),
    { tagged: 0, total: 0 },
  );

  // Init map once.
  useEffect(() => {
    if (mapRef.current || !elRef.current) return;
    const map = L.map(elRef.current, { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    forestLayer.current = L.layerGroup().addTo(map);
    treeLayer.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 0);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Load forests.
  useEffect(() => {
    fetchForestsMap()
      .then((f) => setForests(f))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  // Draw forest markers + fit.
  useEffect(() => {
    const map = mapRef.current;
    const layer = forestLayer.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const bounds: [number, number][] = [];
    for (const f of forests) {
      if (f.lat == null || f.lng == null) continue;
      const m = L.marker([f.lat, f.lng], {
        icon: forestIcon(f.tagged_trees, selected?.id === f.id),
      }).addTo(layer);
      const place = [f.city, f.state].filter(Boolean).join(', ');
      m.bindPopup(
        `<strong>${f.name ?? 'Forest'}</strong><br/>` +
          `<span style="color:#555">${place || '—'}</span><br/>` +
          `<span style="color:#17970E;font-weight:600">${f.tagged_trees} tagged</span> / ${f.total_trees} trees`,
      );
      m.on('click', () => selectForest(f));
      bounds.push([f.lat, f.lng]);
    }
    if (!selected && bounds.length === 1) map.setView(bounds[0]!, 13);
    else if (!selected && bounds.length > 1)
      map.fitBounds(L.latLngBounds(bounds), { padding: [50, 50], maxZoom: 12 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forests, selected]);

  async function selectForest(f: ForestPin) {
    setSelected(f);
    const map = mapRef.current;
    const layer = treeLayer.current;
    if (!map || !layer) return;
    layer.clearLayers();
    if (f.lat != null && f.lng != null) map.setView([f.lat, f.lng], 16);
    setTreeLoading(true);
    try {
      const trees = await fetchForestTrees(f.id);
      const bounds: [number, number][] = [];
      for (const t of trees) {
        if (t.lat == null || t.lng == null) continue;
        L.marker([t.lat, t.lng], { icon: treeDot() })
          .addTo(layer)
          .bindPopup(
            `<strong>${t.tree_unique_id ?? 'Tree'}</strong>` +
              (t.species ? `<br/><span style="color:#555">${t.species}</span>` : '') +
              `<br/><span style="color:#777;font-size:11px">${t.lat.toFixed(6)}, ${t.lng.toFixed(6)}</span>`,
          );
        bounds.push([t.lat, t.lng]);
      }
      if (bounds.length > 1)
        map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 18 });
    } catch {
      /* keep forest view */
    } finally {
      setTreeLoading(false);
    }
  }

  function showAll() {
    setSelected(null);
    treeLayer.current?.clearLayers();
  }

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Brand bar */}
      <header style={{ background: '#1d2a1f', color: '#f7f8f0', padding: '14px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>🌳</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Be The Tree Hugger — Live Forest Map</div>
            <div style={{ fontSize: 12, color: '#b8d44a' }}>Every pin is a real, geo-tagged forest. Click to see the trees.</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
          <div><b style={{ fontSize: 18 }}>{forests.length}</b><div style={{ color: '#8a9a86' }}>forests</div></div>
          <div><b style={{ fontSize: 18 }}>{totals.tagged.toLocaleString()}</b><div style={{ color: '#8a9a86' }}>tagged trees</div></div>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Forest list */}
        <aside style={{ width: 280, borderRight: '1px solid #cdd2bb', overflowY: 'auto', background: '#f7f8f0' }}>
          {selected && (
            <button onClick={showAll} style={{ width: '100%', textAlign: 'left', padding: '10px 16px', background: '#eef0e4', border: 'none', borderBottom: '1px solid #cdd2bb', cursor: 'pointer', fontSize: 13, color: '#2f4a33', fontWeight: 600 }}>
              ← All forests
            </button>
          )}
          {loading ? (
            <p style={{ padding: 16, fontSize: 14, color: '#5a6452' }}>Loading forests…</p>
          ) : error ? (
            <p style={{ padding: 16, fontSize: 14, color: '#a04a2e' }}>{error}</p>
          ) : forests.length === 0 ? (
            <p style={{ padding: 16, fontSize: 14, color: '#5a6452' }}>No geo-tagged forests yet.</p>
          ) : (
            forests.map((f) => (
              <button
                key={f.id}
                onClick={() => selectForest(f)}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px', border: 'none', borderBottom: '1px solid #e2e6d4', cursor: 'pointer', background: selected?.id === f.id ? '#f1f5dd' : 'transparent' }}
              >
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1d2a1f' }}>{f.name ?? 'Forest'}</div>
                <div style={{ fontSize: 12, color: '#5a6452' }}>{[f.city, f.state].filter(Boolean).join(', ') || '—'}</div>
                <div style={{ fontSize: 12, color: '#17970E', fontWeight: 600, marginTop: 2 }}>
                  {f.tagged_trees} tagged / {f.total_trees} trees
                </div>
              </button>
            ))
          )}
        </aside>

        {/* Map */}
        <div style={{ flex: 1, position: 'relative' }}>
          <div ref={elRef} style={{ position: 'absolute', inset: 0 }} />
          {treeLoading && (
            <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 1000, background: '#1d2a1f', color: '#b8d44a', padding: '6px 12px', borderRadius: 4, fontSize: 12, fontFamily: 'monospace' }}>
              loading trees…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
