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
  /** In-progress boundary being drawn (bright-green closed outline). */
  boundaryDraft?: { lat: number; lng: number }[];
  /** When true, boundaryDraft vertices become draggable + edge-insert + delete. */
  boundaryEdit?: boolean;
  /** Fired with the full updated ring on any vertex drag/insert/delete. */
  onBoundaryEdit?: (pts: { lat: number; lng: number }[]) => void;
  editable?: boolean;
  height?: number;
  onMapClick?: (lat: number, lng: number) => void;
  onSelectTree?: (t: MapTree) => void;
}

// Fallback view: roughly centre of India (most OIAS Earth forests are there).
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
  boundaryDraft = [],
  boundaryEdit = false,
  onBoundaryEdit,
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
  const editRef = useRef(onBoundaryEdit);
  editRef.current = onBoundaryEdit;

  // Init the map once.
  useEffect(() => {
    if (mapRef.current || !elRef.current) return;
    const map = L.map(elRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      scrollWheelZoom: true,
    });
    // Two keyless basemaps. Satellite (Esri World Imagery) is the default so a
    // forest boundary can be traced against the real land; Street (OSM) is the
    // toggle. maxNativeZoom 19 + maxZoom 21 lets you over-zoom for precise
    // corner placement. A reference overlay adds place/road labels on satellite.
    const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 21,
      maxNativeZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    });
    const satellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 21,
        maxNativeZoom: 19,
        attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics',
      },
    );
    const labels = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 21, maxNativeZoom: 19, opacity: 0.9 },
    );
    satellite.addTo(map);
    labels.addTo(map);
    L.control
      .layers(
        { Satellite: satellite, Street: street },
        { Labels: labels },
        { position: 'topright', collapsed: false },
      )
      .addTo(map);
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

    // Boundary polygon — bright-green closed outline (SayTrees style).
    if (boundary.length >= 3) {
      const ring = boundary.map((p) => [p.lat, p.lng] as [number, number]);
      L.polygon(ring, {
        color: '#b6ff3c',
        weight: 3,
        fillColor: '#b6ff3c',
        fillOpacity: 0.05,
        lineJoin: 'round',
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

    // In-progress boundary — CLOSED bright-green outline. In boundaryEdit mode
    // the vertices are draggable, edges carry insert handles, and double-click
    // deletes a vertex (Restor.eco-style editing). All in real lat/lng.
    if (boundaryDraft.length > 0) {
      const pts = boundaryDraft;
      const ring = pts.map((p) => [p.lat, p.lng] as [number, number]);
      if (ring.length >= 3) {
        L.polygon(ring, { color: '#b6ff3c', weight: 3, fillColor: '#b6ff3c', fillOpacity: 0.05, lineJoin: 'round' }).addTo(layer);
      } else if (ring.length === 2) {
        L.polyline(ring, { color: '#b6ff3c', weight: 3 }).addTo(layer);
      }

      if (boundaryEdit && editRef.current) {
        const emit = (next: { lat: number; lng: number }[]) => editRef.current?.(next);
        // Edge-insert handles (midpoints) — only when there's a closed ring.
        if (pts.length >= 2) {
          pts.forEach((p, i) => {
            const b = pts[(i + 1) % pts.length]!;
            const mid: [number, number] = [(p.lat + b.lat) / 2, (p.lng + b.lng) / 2];
            const h = L.circleMarker(mid, { radius: 4, color: '#b6ff3c', weight: 1.5, fillColor: '#0d1f17', fillOpacity: 1, pane: 'markerPane' }).addTo(layer);
            h.on('click', (e) => {
              L.DomEvent.stop(e);
              const next = pts.slice();
              next.splice(i + 1, 0, { lat: mid[0], lng: mid[1] });
              emit(next);
            });
          });
        }
        // Draggable vertex handles; double-click deletes (keep >= 3).
        pts.forEach((p, i) => {
          const m = L.marker([p.lat, p.lng], {
            draggable: true,
            icon: L.divIcon({
              className: 'bnd-vtx',
              html: '<span style="display:block;width:14px;height:14px;border-radius:50%;background:#fff;border:3px solid #b6ff3c;box-shadow:0 1px 3px rgba(0,0,0,.5)"></span>',
              iconSize: [14, 14],
              iconAnchor: [7, 7],
            }),
            zIndexOffset: 1500,
          }).addTo(layer);
          m.on('dragend', (e) => {
            const ll = (e.target as L.Marker).getLatLng();
            const next = pts.slice();
            next[i] = { lat: ll.lat, lng: ll.lng };
            emit(next);
          });
          m.on('dblclick', (e) => {
            L.DomEvent.stop(e);
            if (pts.length > 3) emit(pts.filter((_, j) => j !== i));
          });
        });
      } else {
        ring.forEach((c, i) =>
          L.circleMarker(c, { radius: i === 0 ? 6 : 5, color: '#b6ff3c', weight: 2, fillColor: '#ffffff', fillOpacity: 1 }).addTo(layer),
        );
      }
      bounds.push(...ring);
    }

    // Center pin (forest centre) — only used to seed the view if no trees.
    if (center?.lat != null && center?.lng != null && bounds.length === 0) {
      bounds.push([center.lat, center.lng]);
    }

    // Don't re-fit while actively editing the boundary (keeps the user's view
    // steady as they drag/insert/delete vertices).
    if (!boundaryEdit) {
      if (bounds.length === 1) {
        map.setView(bounds[0]!, 17);
      } else if (bounds.length > 1) {
        map.fitBounds(L.latLngBounds(bounds), { padding: [30, 30], maxZoom: 18 });
      }
    }
  }, [trees, boundary, center, selectedKey, draft, boundaryDraft, boundaryEdit]);

  return <div ref={elRef} style={{ height, width: '100%' }} className="rounded-input overflow-hidden border border-border" />;
}
