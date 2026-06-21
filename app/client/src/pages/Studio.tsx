/**
 * Studio — full-screen Tap-to-Tag authoring. Open a 360° scene of a planted
 * site and TAP each sapling: every tap creates the next tree (prefix + running
 * number) and drops its pin at the tapped angle. Switch to Edit to move, rename,
 * or delete any pin. Auto-distance grid scripts remain the fast first pass; this
 * is the precise human pass on top.
 *
 * Position note (council-reviewed): the tap (yaw/pitch) is the exact stored
 * truth. Any lat/lng is an INDICATIVE estimate, flagged geo_is_modeled on the
 * server, shown here as "modeled" — never presented as a surveyed GPS fix.
 *
 * Admin route: /forest/:id/studio (Admin / SuperAdmin).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useToast } from '@/components';
import {
  listScenes, tapTree, updateStudioTree, deleteStudioTree, addHotspot,
  uploadSceneImageDb, createScene, getForestGeo,
  type SceneRow, type HotspotRow,
} from './Forests/geoApi';

const norm = (deg: number) => ((deg % 360) + 360) % 360;

interface Pin { hotspotId: number; treeId: string; uid: string; yaw: number; pitch: number; modeled?: boolean }

export default function Studio() {
  const { id: forestId = '' } = useParams();
  const toast = useToast();
  const elRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any>(null);

  const [scenes, setScenes] = useState<SceneRow[]>([]);
  const [sceneId, setSceneId] = useState<number | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [mode, setMode] = useState<'tap' | 'edit'>('tap');
  const [prefix, setPrefix] = useState('A');
  const [species, setSpecies] = useState('Arjun');
  const [selected, setSelected] = useState<Pin | null>(null);
  const [moving, setMoving] = useState(false);
  const [busy, setBusy] = useState(false);

  const modeRef = useRef(mode); modeRef.current = mode;
  const selRef = useRef(selected); selRef.current = selected;
  const movingRef = useRef(moving); movingRef.current = moving;
  const prefixRef = useRef(prefix); prefixRef.current = prefix;
  const speciesRef = useRef(species); speciesRef.current = species;

  const active = scenes.find((s) => s.id === sceneId) ?? null;

  const loadScenes = useCallback(async () => {
    try {
      const d = await listScenes(forestId);
      setScenes(d.scenes);
      const first = d.scenes[0]?.id ?? null;
      setSceneId((cur) => (cur && d.scenes.some((s) => s.id === cur) ? cur : first));
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Failed to load scenes', 'error');
    }
  }, [forestId, toast]);

  useEffect(() => { void loadScenes(); }, [loadScenes]);

  // Load existing hotspots for the active scene into pins.
  useEffect(() => {
    if (!sceneId) { setPins([]); return; }
    (async () => {
      try {
        const d = await listScenes(forestId);
        const hs = d.hotspots.filter((h: HotspotRow) => h.scene_id === sceneId);
        setPins(hs.map((h) => ({ hotspotId: h.id, treeId: h.tree_id, uid: h.tree_unique_id ?? 'tree', yaw: h.yaw, pitch: h.pitch })));
      } catch { /* ignore */ }
    })();
  }, [forestId, sceneId]);

  // Mount PSV for the active scene + wire the click handler.
  useEffect(() => {
    if (!active || !elRef.current) return;
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let viewer: any;
    (async () => {
      try {
        const [{ Viewer }, { MarkersPlugin }] = await Promise.all([
          import('@photo-sphere-viewer/core'),
          import('@photo-sphere-viewer/markers-plugin'),
        ]);
        await import('@photo-sphere-viewer/core/index.css');
        await import('@photo-sphere-viewer/markers-plugin/index.css');
        if (cancelled || !elRef.current) return;
        viewer = new Viewer({
          container: elRef.current,
          panorama: active.image_url,
          defaultZoomLvl: 0, minFov: 30, maxFov: 100,
          navbar: ['zoom', 'move', 'fullscreen'],
          plugins: [[MarkersPlugin, {}]],
        });
        viewerRef.current = viewer;
        markersRef.current = viewer.getPlugin(MarkersPlugin);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        viewer.addEventListener('click', (e: any) => {
          const d = e?.data; if (!d) return;
          const yaw = Math.round(norm((d.yaw ?? 0) * 180 / Math.PI) * 10) / 10;
          const pitch = Math.round(Math.max(-90, Math.min(90, (d.pitch ?? 0) * 180 / Math.PI)) * 10) / 10;
          if (modeRef.current === 'tap') void doTap(yaw, pitch);
          else if (modeRef.current === 'edit' && selRef.current && movingRef.current) void doMove(selRef.current, yaw, pitch);
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        markersRef.current.addEventListener('select-marker', (ev: any) => {
          const tid = ev?.marker?.data?.treeId;
          if (modeRef.current === 'edit' && tid) {
            setSelected((cur) => (cur?.treeId === tid ? null : pinsRef.current.find((p) => p.treeId === tid) ?? null));
            setMoving(false);
          }
        });
      } catch { /* needs WebGL */ }
    })();
    return () => { cancelled = true; if (viewer) viewer.destroy(); viewerRef.current = null; markersRef.current = null; };
  }, [active?.id, active?.image_url]); // eslint-disable-line react-hooks/exhaustive-deps

  const pinsRef = useRef(pins); pinsRef.current = pins;

  // Re-render markers whenever pins or selection change.
  useEffect(() => {
    const mk = markersRef.current; if (!mk) return;
    try {
      mk.setMarkers(pins.map((p) => ({
        id: `t${p.hotspotId}`,
        position: { yaw: `${p.yaw}deg`, pitch: `${p.pitch}deg` },
        html: `<div style="width:18px;height:18px;border-radius:50%;background:${p === selected ? '#378add' : '#1D9E75'};border:2px solid #fff;box-shadow:0 0 4px rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;color:#fff;font-size:9px;font-weight:700">${p.uid.replace(/^[^0-9]*/, '')}</div>`,
        size: { width: 18, height: 18 }, anchor: 'center center',
        tooltip: p.uid,
        data: { treeId: p.treeId },
      })));
    } catch { /* ignore */ }
  }, [pins, selected]);

  async function doTap(yaw: number, pitch: number) {
    try {
      const r = await tapTree(forestId, sceneId!, { prefix: prefixRef.current || 'A', species_name: speciesRef.current, yaw, pitch });
      setPins((p) => [...p, { hotspotId: r.hotspot_id, treeId: r.tree_id, uid: r.tree_unique_id, yaw, pitch, modeled: r.geo_is_modeled }]);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Tap failed', 'error');
    }
  }
  async function doMove(pin: Pin, yaw: number, pitch: number) {
    try {
      await addHotspot(forestId, sceneId!, { tree_id: pin.treeId, yaw, pitch });
      setPins((arr) => arr.map((p) => (p.treeId === pin.treeId ? { ...p, yaw, pitch } : p)));
      setMoving(false);
    } catch (e) { toast.show(e instanceof Error ? e.message : 'Move failed', 'error'); }
  }
  async function doRename(pin: Pin) {
    const v = window.prompt('New id', pin.uid); if (!v) return;
    try { await updateStudioTree(forestId, pin.treeId, { tree_unique_id: v.trim() }); setPins((arr) => arr.map((p) => (p.treeId === pin.treeId ? { ...p, uid: v.trim() } : p))); }
    catch (e) { toast.show(e instanceof Error ? e.message : 'Rename failed', 'error'); }
  }
  async function doDelete(pin: Pin) {
    try { await deleteStudioTree(forestId, pin.treeId); setPins((arr) => arr.filter((p) => p.treeId !== pin.treeId)); setSelected(null); }
    catch (e) { toast.show(e instanceof Error ? e.message : 'Delete failed', 'error'); }
  }
  async function undo() {
    const last = pins[pins.length - 1]; if (!last) return;
    setBusy(true); try { await deleteStudioTree(forestId, last.treeId); setPins((arr) => arr.slice(0, -1)); } finally { setBusy(false); }
  }
  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadSceneImageDb(forestId, file);
      // camera = forest centre, so tapped trees get an indicative position.
      let lat: number | undefined, lng: number | undefined;
      try { const g = await getForestGeo(forestId); if (g.center.lat != null) lat = g.center.lat; if (g.center.lng != null) lng = g.center.lng; } catch { /* ok */ }
      const label = file.name.replace(/\.[^.]+$/, '').slice(0, 60) || '360 scene';
      const { id } = await createScene(forestId, { image_url: url, label, lat, lng });
      await loadScenes();
      setSceneId(id);
      toast.show('360 uploaded — tap to tag saplings.', 'success');
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally { setBusy(false); }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 280px', height: '100vh', background: '#0b1316', color: '#e7efea' }}>
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: 10, borderBottom: '1px solid rgba(255,255,255,.12)' }}>
          <Link to={`/forest/${forestId}`} style={{ color: '#5ad7e0', textDecoration: 'none', fontSize: 13 }}>← forest</Link>
          <div style={{ display: 'flex', border: '1px solid rgba(255,255,255,.15)', borderRadius: 8, overflow: 'hidden' }}>
            <button onClick={() => { setMode('tap'); setSelected(null); }} style={segStyle(mode === 'tap')}>✋ Tap</button>
            <button onClick={() => setMode('edit')} style={segStyle(mode === 'edit')}>✎ Edit</button>
          </div>
          <label style={lblStyle}>Prefix</label>
          <input value={prefix} onChange={(e) => setPrefix(e.target.value)} style={{ ...inStyle, width: 54, textAlign: 'center' }} />
          <label style={lblStyle}>Species</label>
          <input value={species} onChange={(e) => setSpecies(e.target.value)} style={{ ...inStyle, width: 130 }} />
          <button onClick={undo} disabled={busy || !pins.length} style={btnStyle}>↩ Undo</button>
          <label style={{ ...btnStyle, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1, marginLeft: 'auto' }}>
            ⬆ Upload 360°
            <input type="file" accept="image/*" onChange={onUpload} disabled={busy} style={{ display: 'none' }} />
          </label>
          <select value={sceneId ?? ''} onChange={(e) => setSceneId(Number(e.target.value))} style={inStyle}>
            {scenes.map((s) => <option key={s.id} value={s.id}>{s.label || `Scene ${s.id}`}</option>)}
          </select>
        </div>
        <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
          <div ref={elRef} style={{ position: 'absolute', inset: 0, background: '#000', cursor: mode === 'tap' ? 'crosshair' : 'default' }} />
          {!active && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8aa0a3', fontSize: 14, pointerEvents: 'none' }}>
              No 360° yet — click <span style={{ color: '#5ad7e0', margin: '0 5px' }}>⬆ Upload 360°</span> to start tagging.
            </div>
          )}
        </div>
        <div style={{ padding: '6px 12px', fontSize: 12.5, color: '#8aa0a3', borderTop: '1px solid rgba(255,255,255,.12)' }}>
          {pins.length} tagged · {mode === 'tap' ? 'tap a sapling → creates the next one' : (selected ? `selected ${selected.uid}` : 'click a pin to edit')}
          {pins.some((p) => p.modeled) ? ' · positions modeled (indicative, not surveyed)' : ''}
        </div>
      </div>

      <div style={{ borderLeft: '1px solid rgba(255,255,255,.12)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ padding: '10px 12px', fontSize: 12, letterSpacing: '.05em', textTransform: 'uppercase', color: '#8aa0a3', borderBottom: '1px solid rgba(255,255,255,.12)' }}>
          Saplings ({pins.length})
        </div>
        {mode === 'edit' && selected && (
          <div style={{ padding: 10, borderBottom: '1px solid rgba(255,255,255,.12)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button onClick={() => setMoving((m) => !m)} style={btnStyle}>{moving ? 'click new spot…' : 'Move'}</button>
            <button onClick={() => doRename(selected)} style={btnStyle}>Rename</button>
            <button onClick={() => doDelete(selected)} style={{ ...btnStyle, color: '#f0792b' }}>Delete</button>
          </div>
        )}
        <div style={{ overflowY: 'auto', padding: 4 }}>
          {pins.map((p) => (
            <div key={p.treeId} onClick={() => { if (mode === 'edit') { setSelected(p); setMoving(false); } }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px', borderRadius: 7, fontSize: 13, cursor: mode === 'edit' ? 'pointer' : 'default', background: p === selected ? 'rgba(55,138,221,.16)' : 'transparent' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1D9E75', flex: 'none' }} />
              <b style={{ fontWeight: 700 }}>{p.uid}</b>
            </div>
          ))}
          {!pins.length && <div style={{ padding: 12, color: '#8aa0a3', fontSize: 13 }}>No pins yet. Switch to Tap and click the scene.</div>}
        </div>
      </div>
    </div>
  );
}

const segStyle = (on: boolean): React.CSSProperties => ({ border: 'none', background: on ? 'rgba(90,215,224,.16)' : 'transparent', color: on ? '#5ad7e0' : '#e7efea', padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' });
const lblStyle: React.CSSProperties = { fontSize: 12, color: '#8aa0a3' };
const inStyle: React.CSSProperties = { background: '#0f1d22', border: '1px solid rgba(255,255,255,.12)', color: '#e7efea', borderRadius: 8, padding: '7px 9px', fontSize: 13 };
const btnStyle: React.CSSProperties = { background: '#13242a', border: '1px solid rgba(255,255,255,.12)', color: '#e7efea', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
