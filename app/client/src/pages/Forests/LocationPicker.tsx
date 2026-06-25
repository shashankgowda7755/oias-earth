/**
 * MapLocationPicker — real interactive Leaflet map (Esri satellite + labels).
 *
 * Click anywhere on the map (or drag the pin) to set the forest coordinates;
 * the Latitude / Longitude inputs stay the source of truth and a typed value
 * moves the pin + recentres. Keyless (Esri/OSM tiles, no Google SDK). Reuses
 * the same tile sources as TreeMap.tsx.
 */
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TextField } from '@/components';

export interface LocationPickerProps {
  lat: string;
  long: string;
  onChange: (next: { lat: string; long: string }) => void;
  /** Called with a reverse-geocoded address after the pin moves / search picks. */
  onAddress?: (address: string) => void;
  latError?: string;
  longError?: string;
  required?: boolean;
  disabled?: boolean;
}

const INDIA_CENTER: [number, number] = [22.0, 79.0];
const fmt = (n: number): string => n.toFixed(6);

/** Keyless OSM Nominatim geocoding (admin-volume; browser sends Referer). */
async function geocodeSearch(q: string): Promise<{ lat: string; long: string; address: string } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=0&q=${encodeURIComponent(q)}`;
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) return null;
  const j = (await r.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  const top = j[0];
  return top ? { lat: fmt(Number(top.lat)), long: fmt(Number(top.lon)), address: top.display_name } : null;
}
async function reverseGeocode(la: number, lo: number): Promise<string | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${la}&lon=${lo}`;
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) return null;
  const j = (await r.json()) as { display_name?: string };
  return j.display_name ?? null;
}

/** Lime map pin (divIcon avoids Vite's broken default-marker-image path). */
const pinIcon = L.divIcon({
  className: '',
  html:
    '<div style="transform:translate(-50%,-100%)"><svg width="30" height="30" viewBox="0 0 24 24" fill="#17a673" stroke="#fff" stroke-width="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z"/><circle cx="12" cy="10" r="3" fill="#fff" stroke="none"/></svg></div>',
  iconSize: [30, 30],
  iconAnchor: [0, 0],
});

export function LocationPicker({
  lat,
  long,
  onChange,
  onAddress,
  latError,
  longError,
  required,
  disabled,
}: LocationPickerProps) {
  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onAddressRef = useRef(onAddress);
  onAddressRef.current = onAddress;

  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState('');
  // Skip reverse-geocode on the first coord sync (don't clobber a saved address
  // on Edit); only auto-fill after a user-initiated move/search.
  const didMountRef = useRef(false);

  const runSearch = async () => {
    const q = search.trim();
    if (!q || searching) return;
    setSearching(true);
    setSearchErr('');
    try {
      const hit = await geocodeSearch(q);
      if (!hit) { setSearchErr('No match found'); return; }
      didMountRef.current = true; // search counts as user-initiated
      onChangeRef.current({ lat: hit.lat, long: hit.long });
      onAddressRef.current?.(hit.address);
    } catch {
      setSearchErr('Search failed');
    } finally {
      setSearching(false);
    }
  };

  // Reverse-geocode the address whenever coords change (debounced). Fills the
  // editable Address field; skips the initial mount so existing data is kept.
  useEffect(() => {
    if (!onAddressRef.current) return;
    const la = Number(lat);
    const lo = Number(long);
    if (lat === '' || long === '' || !Number.isFinite(la) || !Number.isFinite(lo)) return;
    if (!didMountRef.current) { didMountRef.current = true; return; }
    const t = setTimeout(() => {
      reverseGeocode(la, lo).then((addr) => { if (addr) onAddressRef.current?.(addr); }).catch(() => undefined);
    }, 800);
    return () => clearTimeout(t);
  }, [lat, long]);

  // Init the map once.
  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;
    const map = L.map(mapElRef.current, { zoomControl: true, attributionControl: false });
    const hasInit = lat !== '' && long !== '' && Number.isFinite(Number(lat)) && Number.isFinite(Number(long));
    map.setView(hasInit ? [Number(lat), Number(long)] : INDIA_CENTER, hasInit ? 16 : 4);
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 20 },
    ).addTo(map);
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 20 },
    ).addTo(map);

    if (hasInit) {
      markerRef.current = L.marker([Number(lat), Number(long)], { icon: pinIcon, draggable: true })
        .addTo(map)
        .on('dragend', (e) => {
          const p = (e.target as L.Marker).getLatLng();
          onChangeRef.current({ lat: fmt(p.lat), long: fmt(p.lng) });
        });
    }

    map.on('click', (e: L.LeafletMouseEvent) => {
      onChangeRef.current({ lat: fmt(e.latlng.lat), long: fmt(e.latlng.lng) });
    });

    mapRef.current = map;
    // Leaflet needs a size recalc once the container has real dimensions.
    setTimeout(() => map.invalidateSize(), 80);
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync marker + view whenever lat/long change (typed or clicked).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const la = Number(lat);
    const lo = Number(long);
    if (lat === '' || long === '' || !Number.isFinite(la) || !Number.isFinite(lo)) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([la, lo]);
    } else {
      markerRef.current = L.marker([la, lo], { icon: pinIcon, draggable: true })
        .addTo(map)
        .on('dragend', (e) => {
          const p = (e.target as L.Marker).getLatLng();
          onChangeRef.current({ lat: fmt(p.lat), long: fmt(p.lng) });
        });
    }
    if (map.getZoom() < 10) map.setView([la, lo], 16);
    else map.panTo([la, lo]);
  }, [lat, long]);

  return (
    <fieldset className="rounded-card border border-border p-3" disabled={disabled}>
      <legend className="px-1 text-sm font-medium text-textSecondary">
        Pick Location on Map{required ? <span aria-hidden="true"> *</span> : null}
      </legend>

      {/* Place search → drops the pin + auto-fills the address. */}
      <div className="mb-2 flex items-center gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void runSearch(); } }}
            disabled={disabled}
            placeholder="Search a place or address…"
            aria-label="Search for a place to set the forest location"
            className="w-full rounded-input border border-border bg-transparent py-2 pl-9 pr-3 text-sm text-textPrimary placeholder:text-textSecondary focus:border-primary focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => void runSearch()}
          disabled={disabled || searching || !search.trim()}
          className="rounded-input border border-border px-3 py-2 text-sm font-medium text-textPrimary hover:bg-white/5 disabled:opacity-50"
        >
          {searching ? 'Searching…' : 'Search'}
        </button>
      </div>
      {searchErr ? <p className="mb-1 text-label text-danger">{searchErr}</p> : null}

      <div
        ref={mapElRef}
        role="application"
        aria-label="Interactive map — click to set the forest coordinates"
        className="h-64 w-full overflow-hidden rounded-input border border-border"
        style={{ background: '#0d1f17' }}
      />
      <p className="mt-1 text-label text-textSecondary">Search, click the map, or drag the pin — the address fills automatically and stays editable</p>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextField
          label="Latitude"
          type="number"
          inputMode="numeric"
          value={lat}
          onChange={(v) => onChange({ lat: v, long })}
          required={required}
          disabled={disabled}
          {...(latError ? { error: latError } : {})}
          placeholder="e.g. 12.94418"
        />
        <TextField
          label="Longitude"
          type="number"
          inputMode="numeric"
          value={long}
          onChange={(v) => onChange({ lat, long: v })}
          required={required}
          disabled={disabled}
          {...(longError ? { error: longError } : {})}
          placeholder="e.g. 77.50847"
        />
      </div>
    </fieldset>
  );
}
