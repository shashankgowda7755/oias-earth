/**
 * HeartbeatMap — the signature element. A real satellite basemap (Esri World
 * Imagery, free/keyless) where every geo-tagged forest pulses in bio-lime to
 * say "alive". Used full-bleed behind the landing hero and as the /map explorer.
 *
 * The pulse encodes proof-of-life as a live visual fact — the thing every
 * competitor promises in copy and never shows. Keyless satellite tiles give the
 * "Google-maps satellite" look the brief wanted, with no GCP key or billing.
 */
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import type { ForestPin } from '@/lib/publicApi';

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

const INDIA_CENTER: [number, number] = [12.2, 79.2];

const SAT_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const LABELS_URL =
  'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png';

// Escape values interpolated into Leaflet divIcon/popup innerHTML — sponsor
// name + logo URL are admin free-text and would otherwise be a stored-XSS sink.
function esc(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

function forestIcon(f: ForestPin): L.DivIcon {
  const logo = f.sponsor_logo;
  const inner = logo
    ? `<span class="badge"><img src="${esc(logo)}" alt="" referrerpolicy="no-referrer" onerror="this.remove();this.parentNode.classList.add('nologo')"/></span>`
    : '<span class="badge nologo"></span>';
  return L.divIcon({
    className: 'forest-logo-pin',
    html: inner,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
}

export interface HeartbeatMapProps {
  forests: ForestPin[];
  height?: string | number;
  interactive?: boolean;
  zoom?: number;
  onForest?: (f: ForestPin) => void;
}

export function HeartbeatMap({
  forests,
  height = '100%',
  interactive = true,
  zoom = 5,
  onForest,
}: HeartbeatMapProps) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.MarkerClusterGroup | null>(null);
  const cb = useRef(onForest);
  cb.current = onForest;

  useEffect(() => {
    if (mapRef.current || !elRef.current) return;
    const map = L.map(elRef.current, {
      center: INDIA_CENTER,
      zoom,
      preferCanvas: true,
      zoomControl: interactive,
      scrollWheelZoom: interactive,
      dragging: interactive,
      doubleClickZoom: interactive,
      attributionControl: true,
      keyboard: interactive,
    });
    L.tileLayer(SAT_URL, {
      maxZoom: 19,
      attribution: 'Imagery &copy; Esri',
    }).addTo(map);
    L.tileLayer(LABELS_URL, { maxZoom: 19, opacity: 0.85, attribution: '&copy; CARTO' }).addTo(map);
    layerRef.current = L.markerClusterGroup({
      iconCreateFunction: clusterIcon,
      maxClusterRadius: 60,
      showCoverageOnHover: false,
      // Cluster at all zooms so dense pins never pile into a blob; click to fan out.
      spiderfyOnMaxZoom: true,
      chunkedLoading: true,
    }).addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 60);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [interactive, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const pts: [number, number][] = [];
    for (const f of forests) {
      if (f.lat == null || f.lng == null) continue;
      const m = L.marker([f.lat, f.lng], { icon: forestIcon(f) }).addTo(layer);
      const place = [f.city, f.state].filter(Boolean).join(', ');
      const sponsor = f.sponsor_name
        ? `<span style="color:#9ab">sponsored by </span><span style="color:#b6ff3c">${esc(f.sponsor_name)}</span><br/>`
        : '';
      m.bindPopup(
        `<div style="font-family:'Plus Jakarta Sans',sans-serif">` +
          `<strong style="color:#b6ff3c">${esc(f.name) || 'Forest'}</strong><br/>` +
          `<span style="color:#cdd">${esc(place) || '—'}</span><br/>` +
          sponsor +
          `<span style="font-family:'JetBrains Mono',monospace;color:#b6ff3c">${f.tagged_trees}</span>` +
          `<span style="color:#9ab"> / ${f.total_trees} trees alive</span></div>`,
      );
      if (cb.current) m.on('click', () => cb.current?.(f));
      pts.push([f.lat, f.lng]);
    }
    if (pts.length === 1) map.setView(pts[0]!, interactive ? 9 : 6);
    else if (pts.length > 1)
      map.fitBounds(L.latLngBounds(pts), { padding: [60, 60], maxZoom: 9 });
  }, [forests, interactive]);

  return <div ref={elRef} style={{ height, width: '100%' }} />;
}
