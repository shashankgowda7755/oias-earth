/**
 * GeoTagSection — geo-tag every tree in a forest and let sponsors verify on a
 * real map. Lives as the "Geo-tagging" tab in ForestDetailView.
 *
 * Three capture methods (all POST to /forest/:id/trees/geo):
 *   1. Device GPS  — "Use my location" (navigator.geolocation). For field
 *      workers physically standing at the tree. Needs HTTPS (Vercel is).
 *   2. Tap the map — click the Leaflet map to drop/move the pin.
 *   3. Manual lat/long — type or paste coordinates.
 *
 * Role: SuperAdmin and Admin (sponsor with forest access) can capture/edit.
 * Any read-only viewer still sees every tagged tree + popups to VERIFY against
 * what was mapped (the sponsor's "check what we mapped" requirement).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Spinner, TextField, useToast } from '@/components';
import { useAuth } from '@/auth/AuthContext';
import type { FullForestPayload } from './fullTypes';
import { TreeMap, type MapTree } from './TreeMap';
import {
  getForestGeo,
  listForestTrees,
  tagTreeGeo,
  logVisit,
  setForestBoundary,
  TREE_STATUSES,
  type RegisterTree,
} from './geoApi';

interface GeoTagSectionProps {
  forest: FullForestPayload;
}

function toNum(v: string | number | null | undefined): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function GeoTagSection({ forest }: GeoTagSectionProps) {
  const forestId = forest.id ?? '';
  const { role } = useAuth();
  const editable = role === 'SuperAdmin' || role === 'Admin';
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trees, setTrees] = useState<RegisterTree[]>([]);
  const [boundary, setBoundary] = useState<{ lat: number; lng: number }[]>([]);
  const [center, setCenter] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ lat: number; lng: number } | null>(null);
  const [latText, setLatText] = useState('');
  const [lngText, setLngText] = useState('');
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  // Log-a-visit form (longitudinal proof).
  const [vDate, setVDate] = useState('');
  const [vStatus, setVStatus] = useState(1);
  const [vHeight, setVHeight] = useState('');
  const [vDia, setVDia] = useState('');
  const [vPhoto, setVPhoto] = useState<File | null>(null);
  const [vSaving, setVSaving] = useState(false);

  // EUDR boundary editor.
  const [boundaryMode, setBoundaryMode] = useState(false);
  const [boundaryPts, setBoundaryPts] = useState<{ lat: number; lng: number }[]>([]);
  const [boundarySaving, setBoundarySaving] = useState(false);

  const load = useCallback(async () => {
    if (!forestId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [geo, list] = await Promise.all([
        getForestGeo(forestId).catch(() => null),
        listForestTrees(forestId),
      ]);
      setTrees(list.data);
      if (geo) {
        setBoundary(geo.boundary ?? []);
        setCenter(geo.center ?? { lat: null, lng: null });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load trees.');
    } finally {
      setLoading(false);
    }
  }, [forestId]);

  useEffect(() => {
    void load();
  }, [load]);

  const mapTrees: MapTree[] = useMemo(
    () =>
      trees.map((t) => ({
        id: t.id,
        tree_unique_id: t.tree_unique_id,
        lat: toNum(t.lat),
        lng: toNum(t.lng),
        species: t.species_common_name ?? t.plant_species,
      })),
    [trees],
  );

  const taggedCount = useMemo(
    () => mapTrees.filter((t) => t.lat != null && t.lng != null).length,
    [mapTrees],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return trees;
    return trees.filter((t) =>
      [t.tree_unique_id, t.plant_name, t.plant_species, t.species_common_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [trees, search]);

  const selected = useMemo(
    () => trees.find((t) => t.id === selectedId) ?? null,
    [trees, selectedId],
  );

  const selectTree = useCallback((t: RegisterTree | MapTree) => {
    const id = 'id' in t ? t.id : undefined;
    if (!id) return;
    setSelectedId(id);
    const lat = toNum('lat' in t ? (t.lat as string | number | null) : null);
    const lng = toNum('lng' in t ? (t.lng as string | number | null) : null);
    if (lat != null && lng != null) {
      setDraft({ lat, lng });
      setLatText(String(lat));
      setLngText(String(lng));
    } else {
      setDraft(null);
      setLatText('');
      setLngText('');
    }
  }, []);

  const setDraftCoords = useCallback((lat: number, lng: number) => {
    setDraft({ lat, lng });
    setLatText(lat.toFixed(6));
    setLngText(lng.toFixed(6));
  }, []);

  const onMapClick = useCallback(
    (lat: number, lng: number) => {
      if (boundaryMode) {
        setBoundaryPts((p) => [...p, { lat, lng }]);
        return;
      }
      if (!editable || !selectedId) return;
      setDraftCoords(lat, lng);
    },
    [boundaryMode, editable, selectedId, setDraftCoords],
  );

  const saveBoundary = useCallback(async () => {
    setBoundarySaving(true);
    try {
      await setForestBoundary(forestId, boundaryPts);
      setBoundary(boundaryPts);
      toast.show(
        boundaryPts.length ? `Boundary saved (${boundaryPts.length} points)` : 'Boundary cleared',
        'success',
      );
      setBoundaryMode(false);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Failed to save boundary', 'error');
    } finally {
      setBoundarySaving(false);
    }
  }, [forestId, boundaryPts, toast]);

  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.show('Geolocation not supported on this device.', 'error');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDraftCoords(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
        toast.show('Captured your current location.', 'success');
      },
      (err) => {
        setLocating(false);
        toast.show(`Location failed: ${err.message}`, 'error');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }, [setDraftCoords, toast]);

  const onManual = (which: 'lat' | 'lng', value: string) => {
    if (which === 'lat') setLatText(value);
    else setLngText(value);
    const lat = which === 'lat' ? Number(value) : Number(latText);
    const lng = which === 'lng' ? Number(value) : Number(lngText);
    if (value !== '' && Number.isFinite(lat) && Number.isFinite(lng)) {
      setDraft({ lat, lng });
    }
  };

  const save = useCallback(async () => {
    if (!selected || !draft) return;
    setSaving(true);
    try {
      const r = await tagTreeGeo(forestId, {
        tree_id: selected.id,
        lat: draft.lat,
        lng: draft.lng,
      });
      setTrees((prev) =>
        prev.map((t) => (t.id === selected.id ? { ...t, lat: r.lat, lng: r.lng } : t)),
      );
      toast.show(`Geo-tagged ${selected.tree_unique_id ?? 'tree'}.`, 'success');
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Failed to save location.', 'error');
    } finally {
      setSaving(false);
    }
  }, [selected, draft, forestId, toast]);

  const submitVisit = useCallback(async () => {
    if (!selected || !vDate) {
      toast.show('Pick a visit date first.', 'error');
      return;
    }
    setVSaving(true);
    try {
      await logVisit(forestId, selected.id, {
        timeline_date: vDate,
        status_id: vStatus,
        height: vHeight !== '' ? Number(vHeight) : undefined,
        diameter: vDia !== '' ? Number(vDia) : undefined,
        photo: vPhoto,
      });
      toast.show(`Visit logged for ${selected.tree_unique_id ?? 'tree'}.`, 'success');
      setVDate('');
      setVHeight('');
      setVDia('');
      setVPhoto(null);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Failed to log visit.', 'error');
    } finally {
      setVSaving(false);
    }
  }, [selected, vDate, vStatus, vHeight, vDia, vPhoto, forestId, toast]);

  if (!forestId) {
    return (
      <p className="py-8 text-center text-sm text-textSecondary">
        Save the forest first — geo-tagging needs a saved forest with trees.
      </p>
    );
  }
  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }
  if (error) {
    return <p className="py-8 text-center text-sm text-red-600">{error}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm">
          <span className="font-medium text-textPrimary">{taggedCount}</span>
          <span className="text-textSecondary"> / {trees.length} trees geo-tagged</span>
        </div>
        <Button type="button" variant="outlined" onClick={() => void load()}>
          Refresh
        </Button>
      </div>

      {trees.length === 0 ? (
        <p className="py-8 text-center text-sm text-textSecondary">
          This forest has no trees yet. Add trees via the forest wizard or bulk
          import, then tag them here.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-[300px_1fr]">
          {/* Tree register */}
          <div className="flex max-h-[460px] flex-col rounded-input border border-border">
            <div className="border-b border-border p-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search trees…"
                className="w-full rounded-input border border-border px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <ul className="flex-1 overflow-y-auto">
              {filtered.map((t) => {
                const tagged = toNum(t.lat) != null && toNum(t.lng) != null;
                const isSel = t.id === selectedId;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => selectTree(t)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                        isSel ? 'bg-primary/10 text-primary' : 'hover:bg-black/5'
                      }`}
                    >
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                          tagged ? 'bg-[#22a818]' : 'bg-gray-300'
                        }`}
                        title={tagged ? 'Tagged' : 'Not tagged'}
                      />
                      <span className="min-w-0 flex-1 truncate">
                        <span className="font-medium">{t.tree_unique_id ?? 'Tree'}</span>
                        {t.species_common_name || t.plant_species ? (
                          <span className="ml-1 text-textSecondary">
                            · {t.species_common_name ?? t.plant_species}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Map + capture */}
          <div className="space-y-3">
            <TreeMap
              trees={mapTrees}
              boundary={boundary}
              center={center}
              selectedKey={selectedId}
              draft={draft}
              boundaryDraft={boundaryMode ? boundaryPts : []}
              editable={editable && (Boolean(selectedId) || boundaryMode)}
              onMapClick={onMapClick}
              onSelectTree={selectTree}
              height={420}
            />

            {/* EUDR boundary editor */}
            {editable && (
              <div className="rounded-input border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm">
                    Forest boundary <span className="text-textSecondary">(EUDR polygon)</span>
                    {boundary.length >= 3 && !boundaryMode ? (
                      <span className="ml-2 text-xs text-primary">✓ {boundary.length}-point boundary set</span>
                    ) : null}
                  </span>
                  {!boundaryMode ? (
                    <Button
                      type="button"
                      variant="outlined"
                      onClick={() => {
                        setBoundaryMode(true);
                        setBoundaryPts(boundary);
                        setSelectedId(null);
                      }}
                    >
                      {boundary.length >= 3 ? 'Edit boundary' : 'Draw boundary'}
                    </Button>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-textSecondary">
                        Tap the map to add corners ({boundaryPts.length})
                      </span>
                      <Button type="button" variant="outlined" onClick={() => setBoundaryPts((p) => p.slice(0, -1))} disabled={!boundaryPts.length}>
                        Undo
                      </Button>
                      <Button type="button" variant="outlined" onClick={() => setBoundaryPts([])} disabled={!boundaryPts.length}>
                        Clear
                      </Button>
                      <Button type="button" variant="primary" onClick={() => void saveBoundary()} disabled={boundarySaving || (boundaryPts.length > 0 && boundaryPts.length < 3)}>
                        {boundarySaving ? 'Saving…' : 'Save boundary'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {editable && selected && !boundaryMode ? (
              <>
                <div className="rounded-input border border-border p-3">
                  <div className="mb-2 text-sm">
                    Tagging{' '}
                    <span className="font-medium text-primary">
                      {selected.tree_unique_id ?? 'tree'}
                    </span>{' '}
                    — tap the map, use GPS, or enter coordinates.
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    <Button
                      type="button"
                      variant="outlined"
                      onClick={useMyLocation}
                      disabled={locating}
                    >
                      {locating ? 'Locating…' : '📍 Use my location'}
                    </Button>
                    <div className="w-32">
                      <TextField
                        label="Latitude"
                        value={latText}
                        onChange={(v) => onManual('lat', v)}
                        placeholder="12.891256"
                      />
                    </div>
                    <div className="w-32">
                      <TextField
                        label="Longitude"
                        value={lngText}
                        onChange={(v) => onManual('lng', v)}
                        placeholder="80.081001"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => void save()}
                      disabled={saving || !draft}
                    >
                      {saving ? 'Saving…' : 'Save location'}
                    </Button>
                  </div>
                </div>
                <div className="mt-3 rounded-input border border-border p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-sm">
                      Log a visit — proof of life over time
                    </span>
                    <a
                      href={`/tree/${selected.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-primary"
                    >
                      View public proof ↗
                    </a>
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="text-xs text-textSecondary">
                      Date
                      <input
                        type="date"
                        value={vDate}
                        onChange={(e) => setVDate(e.target.value)}
                        className="mt-1 block rounded-input border border-border px-2 py-1.5 text-sm"
                      />
                    </label>
                    <label className="text-xs text-textSecondary">
                      Status
                      <select
                        value={vStatus}
                        onChange={(e) => setVStatus(Number(e.target.value))}
                        className="mt-1 block rounded-input border border-border px-2 py-1.5 text-sm"
                      >
                        {TREE_STATUSES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="w-24">
                      <TextField label="Height (m)" value={vHeight} onChange={setVHeight} placeholder="2.4" />
                    </div>
                    <div className="w-24">
                      <TextField label="⌀ (cm)" value={vDia} onChange={setVDia} placeholder="4" />
                    </div>
                    <label className="text-xs text-textSecondary">
                      Photo
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => setVPhoto(e.target.files?.[0] ?? null)}
                        className="mt-1 block max-w-[170px] text-xs"
                      />
                    </label>
                    <Button type="button" variant="primary" onClick={() => void submitVisit()} disabled={vSaving || !vDate}>
                      {vSaving ? 'Logging…' : 'Log visit'}
                    </Button>
                  </div>
                </div>
              </>
            ) : editable && !selected ? (
              <p className="text-sm text-textSecondary">
                Select a tree from the list to geo-tag it or log a visit.
              </p>
            ) : (
              <p className="text-sm text-textSecondary">
                Click any pin to verify a tree’s location, species, and coordinates.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
