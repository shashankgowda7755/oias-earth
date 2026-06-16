/**
 * TreeMap — interactive geo-tagging map (Leaflet + OpenStreetMap, keyless).
 *
 * Replaces the offline SVG BoundaryMap with a real slippy map so each tree can
 * be placed/verified on an actual basemap. No API key, no Google billing — OSM
 * tiles are free. A thin imperative wrapper over Leaflet (no react-leaflet) to
 * avoid peer-dependency churn with React 18.
 *
 * Markers use an inline divIcon (HTML/CSS dot) instead of Leaflet's default PNG
 * icon, which 404s under Vite bundling. Colours:
 *   - green  = tagged tree
 *   - dark green ring = selected tree
 *   - amber  = draft (unsaved) capture point
 *
 * When `editable`, clicking the map fires `onMapClick(lat,lng)` so the caller
 * can set the selected tree's draft coordinates (the "tap-to-place" method).
 */
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapTree {
  id?: string;
  tree_unique_id: string | null;
  lat: number | null;
  lng: number | null;
  species?: string | null;
}

export interface TreeMapProps {
  trees: MapTree[];
  center?: { lat: number | null; lng: number | null } | null;
  boundary?: { lat: number; lng: number }[];
  /** tree_unique_id (or id) of the currently selected tree. */
  selectedKey?: string | null;
  /** Unsaved capture point for the selected tree. */
  draft?: { lat: number; lng: number } | null;
  editable?: boolean;
  height?: number;
  onMapClick?: (lat: number, lng: number) => void;
  onSelectTree?: (t: MapTree) => void;
}

// Fallback view: roughly centre of India (most CommuniTREE forests are there).
const DEFAULT_CENTER: [number, number] = [11.0, 78.0];
const DEFAULT_ZOOM = 5;

function keyOf(t: MapTree): string {
  return t.id ?? t.tree_unique_id ?? `${t.lat},${t.lng}`;
}

function dot(color: string, ring: boolean): L.DivIcon {
  const size = ring ? 20 : 14;
  const border = ring ? '3px solid #0b5d06' : '2px solid #ffffff';
  return L.divIcon({
    className: 'tree-dot',
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:50%;background:${color};border:${border};box-shadow:0 1px 3px rgba(0,0,0,.4)"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function TreeMap({
  trees,
  center,
  boundary = [],
  selectedKey,
  draft,
  editable = false,
  height = 420,
  onMapClick,
  onSelectTree,
}: TreeMapProps) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  // Keep latest callbacks without re-binding the map click handler each render.
  const clickRef = useRef(onMapClick);
  clickRef.current = onMapClick;
  const selectRef = useRef(onSelectTree);
  selectRef.current = onSelectTree;

  // Init the map once.
  useEffect(() => {
    if (mapRef.current || !elRef.current) return;
    const map = L.map(elRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      scrollWheelZoom: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    map.on('click', (e: L.LeafletMouseEvent) => {
      clickRef.current?.(e.latlng.lat, e.latlng.lng);
    });
    mapRef.current = map;
    // Leaflet mis-measures size when created inside a just-opened dialog/tab.
    setTimeout(() => map.invalidateSize(), 0);
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Toggle the click cursor with editability.
  useEffect(() => {
    const c = mapRef.current?.getContainer();
    if (c) c.style.cursor = editable ? 'crosshair' : '';
  }, [editable]);

  // Redraw markers/boundary whenever inputs change.
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const bounds: [number, number][] = [];

    // Boundary polygon.
    if (boundary.length >= 3) {
      const ring = boundary.map((p) => [p.lat, p.lng] as [number, number]);
      L.polygon(ring, {
        color: '#17970E',
        weight: 2,
        fillColor: '#17970E',
        fillOpacity: 0.08,
      }).addTo(layer);
      bounds.push(...ring);
    }

    // Tree markers.
    for (const t of trees) {
      if (t.lat == null || t.lng == null) continue;
      const selected = selectedKey != null && keyOf(t) === selectedKey;
      const m = L.marker([t.lat, t.lng], {
        icon: dot('#22a818', selected),
        zIndexOffset: selected ? 1000 : 0,
      }).addTo(layer);
      const label = t.tree_unique_id ?? 'Tree';
      const sp = t.species ? `<br/><span style="color:#555">${t.species}</span>` : '';
      m.bindPopup(
        `<strong>${label}</strong>${sp}<br/><span style="color:#777;font-size:11px">${t.lat.toFixed(6)}, ${t.lng.toFixed(6)}</span>`,
      );
      m.on('click', () => selectRef.current?.(t));
      bounds.push([t.lat, t.lng]);
    }

    // Draft (unsaved) capture point.
    if (draft) {
      L.marker([draft.lat, draft.lng], { icon: dot('#f59e0b', true), zIndexOffset: 2000 })
        .addTo(layer)
        .bindPopup(`<strong>New location</strong><br/><span style="color:#777;font-size:11px">${draft.lat.toFixed(6)}, ${draft.lng.toFixed(6)}</span>`);
      bounds.push([draft.lat, draft.lng]);
    }

    // Center pin (forest centre) — only used to seed the view if no trees.
    if (center?.lat != null && center?.lng != null && bounds.length === 0) {
      bounds.push([center.lat, center.lng]);
    }

    if (bounds.length === 1) {
      map.setView(bounds[0]!, 17);
    } else if (bounds.length > 1) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [30, 30], maxZoom: 18 });
    }
  }, [trees, boundary, center, selectedKey, draft]);

  return <div ref={elRef} style={{ height, width: '100%' }} className="rounded-input overflow-hidden border border-border" />;
}
