/**
 * TourEditor — admin authoring for the interactive 360° tour. Add scenes (upload
 * to object storage or paste an external equirect URL), then click the panorama
 * to drop tree hotspots (pick a tree) or navigation links (pick a target scene).
 * Lives in the forest Geo-tagging tab. PSV is lazy-imported.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, TextField, useToast } from '@/components';
import {
  listScenes, createScene, uploadSceneImage, deleteScene,
  addHotspot, deleteHotspot, addLink, deleteLink,
  type SceneRow, type HotspotRow, type LinkRow, type RegisterTree,
} from './geoApi';

const norm = (deg: number) => ((deg % 360) + 360) % 360;

export function TourEditor({ forestId, trees }: { forestId: string; trees: RegisterTree[] }) {
  const toast = useToast();
  const elRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewerRef = useRef<any>(null);

  const [scenes, setScenes] = useState<SceneRow[]>([]);
  const [hotspots, setHotspots] = useState<HotspotRow[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [mode, setMode] = useState<'tree' | 'link'>('tree');
  const [pending, setPending] = useState<{ yaw: number; pitch: number } | null>(null);
  const [treeQ, setTreeQ] = useState('');

  const [label, setLabel] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [busy, setBusy] = useState(false);

  const active = scenes.find((s) => s.id === activeId) ?? null;

  const reload = useCallback(async () => {
    try {
      const d = await listScenes(forestId);
      setScenes(d.scenes);
      setHotspots(d.hotspots);
      setLinks(d.links);
      if (d.scenes.length && !d.scenes.some((s) => s.id === activeId)) setActiveId(d.scenes[0]?.id ?? null);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Failed to load scenes', 'error');
    }
  }, [forestId, activeId, toast]);

  useEffect(() => { void reload(); }, [forestId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mount/refresh the PSV editor when the active scene changes.
  useEffect(() => {
    if (!active || !elRef.current) return;
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let viewer: any;
    (async () => {
      try {
        const { Viewer } = await import('@photo-sphere-viewer/core');
        await import('@photo-sphere-viewer/core/index.css');
        if (cancelled || !elRef.current) return;
        viewer = new Viewer({ container: elRef.current, panorama: active.image_url, navbar: ['zoom', 'fullscreen'] });
        viewerRef.current = viewer;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        viewer.addEventListener('click', (e: any) => {
          const d = e?.data;
          if (!d) return;
          const yaw = norm((d.yaw ?? 0) * 180 / Math.PI);
          const pitch = Math.max(-90, Math.min(90, (d.pitch ?? 0) * 180 / Math.PI));
          setPending({ yaw: Math.round(yaw * 10) / 10, pitch: Math.round(pitch * 10) / 10 });
        });
      } catch {
        /* editor needs WebGL */
      }
    })();
    return () => { cancelled = true; if (viewer) viewer.destroy(); viewerRef.current = null; };
  }, [active?.id, active?.image_url]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onAddScene() {
    if (!imageUrl.trim()) { toast.show('Paste an image URL or upload a panorama first.', 'error'); return; }
    setBusy(true);
    try {
      const r = await createScene(forestId, { image_url: imageUrl.trim(), label: label.trim() || undefined });
      setLabel(''); setImageUrl('');
      await reload();
      setActiveId(r.id);
      toast.show('Scene added.', 'success');
    } catch (e: unknown) {
      const m = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.show(m || (e instanceof Error ? e.message : 'Failed'), 'error');
    } finally { setBusy(false); }
  }

  async function onUpload(file: File) {
    setBusy(true);
    try {
      const url = await uploadSceneImage(forestId, file);
      setImageUrl(url);
      toast.show('Uploaded — now Add scene.', 'success');
    } catch (e: unknown) {
      const m = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.show(m || 'Upload failed (is Vercel Blob configured?). You can paste an external URL instead.', 'error');
    } finally { setBusy(false); }
  }

  async function placeTree(t: RegisterTree) {
    if (!active || !pending) return;
    try {
      await addHotspot(forestId, active.id, { tree_id: t.id, yaw: pending.yaw, pitch: pending.pitch });
      setPending(null); setTreeQ('');
      await reload();
      toast.show(`Hotspot placed on ${t.tree_unique_id ?? 'tree'}.`, 'success');
    } catch (e: unknown) {
      const m = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.show(m || 'Failed to place hotspot', 'error');
    }
  }

  async function placeLink(toId: number) {
    if (!active || !pending) return;
    try {
      await addLink(forestId, active.id, { to_scene_id: toId, yaw: pending.yaw, pitch: pending.pitch });
      setPending(null);
      await reload();
      toast.show('Navigation link added.', 'success');
    } catch (e: unknown) {
      const m = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.show(m || 'Failed to add link', 'error');
    }
  }

  const sceneHotspots = hotspots.filter((h) => h.scene_id === activeId);
  const sceneLinks = links.filter((l) => l.from_scene_id === activeId);
  const treeMatches = trees.filter((t) => {
    const q = treeQ.trim().toLowerCase();
    if (!q) return false;
    return [t.tree_unique_id, t.plant_species, t.species_common_name].some((v) => String(v ?? '').toLowerCase().includes(q));
  }).slice(0, 8);

  const inp = 'rounded-input border border-border px-2 py-1.5 text-sm';

  return (
    <div className="rounded-input border border-border p-3">
      <div className="mb-1 text-sm font-medium text-textPrimary">
        360° interactive tour <span className="font-normal text-textSecondary">(scenes + clickable tree hotspots + walk-between links)</span>
      </div>

      {/* Add scene */}
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <div className="w-40"><TextField label="Scene label" value={label} onChange={setLabel} placeholder="Block A entrance" /></div>
        <div className="min-w-[230px] flex-1"><TextField label="Equirect image URL" value={imageUrl} onChange={setImageUrl} placeholder="https://… .jpg  or upload →" /></div>
        <label className="text-xs text-textSecondary">Upload
          <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && void onUpload(e.target.files[0])} className="mt-1 block max-w-[150px] text-xs" />
        </label>
        <Button type="button" variant="primary" onClick={() => void onAddScene()} disabled={busy || !imageUrl.trim()}>Add scene</Button>
      </div>

      {scenes.length === 0 ? (
        <p className="text-sm text-textSecondary">No scenes yet. Add one above (paste an https equirect URL, or upload if Vercel Blob is configured).</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-[200px_1fr]">
          {/* scene list */}
          <div className="flex flex-col gap-1">
            {scenes.map((s, i) => (
              <div key={s.id} className={`flex items-center justify-between rounded-input border px-2 py-1.5 text-sm ${s.id === activeId ? 'border-primary bg-primary/10' : 'border-border'}`}>
                <button type="button" className="min-w-0 flex-1 truncate text-left" onClick={() => { setActiveId(s.id); setPending(null); }}>
                  {i + 1}. {s.label || `Scene ${s.id}`}
                </button>
                <button type="button" className="ml-2 text-xs text-red-600" onClick={() => void deleteScene(forestId, s.id).then(reload)}>del</button>
              </div>
            ))}
          </div>

          {/* editor */}
          <div>
            {active && (
              <>
                <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-textSecondary">Click the panorama to drop a:</span>
                  <button type="button" onClick={() => setMode('tree')} className={`rounded-full border px-3 py-1 text-xs ${mode === 'tree' ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}>🌳 tree hotspot</button>
                  <button type="button" onClick={() => setMode('link')} className={`rounded-full border px-3 py-1 text-xs ${mode === 'link' ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}>➤ nav link</button>
                  {pending && <span className="text-xs text-textSecondary">picked yaw {pending.yaw}° pitch {pending.pitch}°</span>}
                </div>
                <div ref={elRef} style={{ width: '100%', height: 300, borderRadius: 10, overflow: 'hidden', background: '#000' }} />

                {/* pending action */}
                {pending && mode === 'tree' && (
                  <div className="mt-2 rounded-input border border-border p-2">
                    <div className="text-xs text-textSecondary">Attach which tree to this spot?</div>
                    <input className={`${inp} mt-1 w-full`} value={treeQ} onChange={(e) => setTreeQ(e.target.value)} placeholder="Search tree id / species…" />
                    <div className="mt-1 flex flex-wrap gap-1">
                      {treeMatches.map((t) => (
                        <button key={t.id} type="button" onClick={() => void placeTree(t)} className="rounded-full border border-border px-2 py-1 text-xs hover:bg-white/5">
                          {t.tree_unique_id} {t.species_common_name ? `· ${t.species_common_name}` : ''}
                        </button>
                      ))}
                      {treeQ && treeMatches.length === 0 && <span className="text-xs text-textSecondary">no match</span>}
                    </div>
                  </div>
                )}
                {pending && mode === 'link' && (
                  <div className="mt-2 rounded-input border border-border p-2">
                    <div className="text-xs text-textSecondary">Link this spot to which scene?</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {scenes.filter((s) => s.id !== active.id).map((s) => (
                        <button key={s.id} type="button" onClick={() => void placeLink(s.id)} className="rounded-full border border-border px-2 py-1 text-xs hover:bg-white/5">→ {s.label || `Scene ${s.id}`}</button>
                      ))}
                    </div>
                  </div>
                )}

                {/* lists */}
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div>
                    <div className="text-xs font-medium text-textSecondary">Hotspots ({sceneHotspots.length})</div>
                    {sceneHotspots.map((h) => (
                      <div key={h.id} className="flex items-center justify-between text-xs">
                        <span>🌳 {h.tree_unique_id ?? h.tree_id.slice(0, 6)} <span className="text-textSecondary">({Math.round(h.yaw)}°,{Math.round(h.pitch)}°)</span></span>
                        <button type="button" className="text-red-600" onClick={() => void deleteHotspot(forestId, h.id).then(reload)}>del</button>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="text-xs font-medium text-textSecondary">Nav links ({sceneLinks.length})</div>
                    {sceneLinks.map((l) => (
                      <div key={l.id} className="flex items-center justify-between text-xs">
                        <span>➤ to {scenes.find((s) => s.id === l.to_scene_id)?.label || l.to_scene_id}</span>
                        <button type="button" className="text-red-600" onClick={() => void deleteLink(forestId, l.id).then(reload)}>del</button>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-xs text-textSecondary">Public tour: <a className="text-primary" href={`/forest/${forestId}/tour`} target="_blank" rel="noreferrer">/forest/{forestId.slice(0, 8)}…/tour ↗</a></p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
