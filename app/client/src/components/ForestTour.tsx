/**
 * ForestTour — the interactive 360° forest. Multi-scene graph navigation
 * (Street-View style): tree hotspots open a proof drawer → /tree/:id, link
 * hotspots walk you to the next scene. PSV core + MarkersPlugin are DYNAMIC-
 * imported (heavy WebGL stays out of the initial bundle). Markers are static
 * styled dots (no untrusted innerHTML); tooltips + the drawer are escaped /
 * React-rendered. No-WebGL devices get a flat image + a clickable tree list.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ForestScene, SceneHotspot } from '@/lib/publicApi';
import '@photo-sphere-viewer/core/index.css';
import '@photo-sphere-viewer/markers-plugin/index.css';
import '@/styles/earth.css';

const STATUS_LABEL: Record<number, string> = { 1: 'Healthy', 2: 'Drying', 3: 'Damaged', 4: 'Dead' };

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

export default function ForestTour({ scenes }: { scenes: ForestScene[] }) {
  const elRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any>(null);
  const scenesRef = useRef(scenes);
  scenesRef.current = scenes;

  const flat = useMemo(() => !hasWebGL(), []);
  const [failed, setFailed] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(scenes[0]?.id ?? null);
  const [drawer, setDrawer] = useState<SceneHotspot | null>(null);
  const [q, setQ] = useState('');

  const current = scenes.find((s) => s.id === currentId) ?? scenes[0] ?? null;
  const isDemo = scenes.some((s) => s.is_demo);

  function markerConfigs(scene: ForestScene) {
    const trees = scene.hotspots.slice(0, 60).map((h, i) => ({
      id: `t${i}`,
      position: { yaw: `${h.yaw}deg`, pitch: `${h.pitch}deg` },
      html: `<div class="tour-pin s${h.status_id ?? 1}"></div>`,
      size: { width: 22, height: 22 },
      anchor: 'center center',
      tooltip: esc(`${h.tree_unique_id ?? 'Tree'}${h.species ? ` · ${h.species}` : ''}`),
      data: { kind: 'tree', hs: h },
    }));
    const links = scene.links.map((l, i) => {
      const to = scenesRef.current.find((s) => s.id === l.to_scene_id);
      return {
        id: `l${i}`,
        position: { yaw: `${l.yaw}deg`, pitch: `${l.pitch}deg` },
        html: '<div class="tour-arrow">➤</div>',
        size: { width: 44, height: 44 },
        anchor: 'center center',
        tooltip: esc(l.label || `Go to ${to?.label || `scene ${l.to_scene_id}`}`),
        data: { kind: 'link', to: l.to_scene_id },
      };
    });
    return [...trees, ...links];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function goToScene(id: number) {
    const sc = scenesRef.current.find((s) => s.id === id);
    const v = viewerRef.current;
    const mk = markersRef.current;
    if (!sc || !v || !mk) return;
    setDrawer(null);
    try {
      await v.setPanorama(sc.image_url, { position: { yaw: `${sc.default_yaw}deg`, pitch: `${sc.default_pitch}deg` } });
      mk.setMarkers(markerConfigs(sc));
      setCurrentId(id);
    } catch {
      /* keep current scene on failure */
    }
  }

  useEffect(() => {
    if (flat || !elRef.current || !current) return;
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let viewer: any;
    (async () => {
      try {
        const [{ Viewer }, { MarkersPlugin }] = await Promise.all([
          import('@photo-sphere-viewer/core'),
          import('@photo-sphere-viewer/markers-plugin'),
        ]);
        if (cancelled || !elRef.current) return;
        viewer = new Viewer({
          container: elRef.current,
          panorama: current.image_url,
          defaultYaw: `${current.default_yaw}deg`,
          defaultPitch: `${current.default_pitch}deg`,
          navbar: ['zoom', 'move', 'fullscreen'],
          plugins: [[MarkersPlugin, {}]],
        });
        viewerRef.current = viewer;
        const mk = viewer.getPlugin(MarkersPlugin);
        markersRef.current = mk;
        mk.setMarkers(markerConfigs(current));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mk.addEventListener('select-marker', (e: any) => {
          const d = e?.marker?.data ?? {};
          if (d.kind === 'link') void goToScene(d.to);
          else if (d.kind === 'tree') setDrawer(d.hs);
        });
      } catch {
        setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      if (viewer) viewer.destroy();
      viewerRef.current = null;
      markersRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function jumpTo(h: SceneHotspot) {
    const v = viewerRef.current;
    if (v) v.animate({ yaw: `${h.yaw}deg`, pitch: `${h.pitch}deg`, zoom: 55, speed: '8rpm' });
    setDrawer(h);
  }

  if (!current) {
    return <p style={{ padding: 40, color: '#9fb0ad' }}>No 360° scenes for this forest yet.</p>;
  }

  const filtered = current.hotspots.filter((h) => {
    const t = q.trim().toLowerCase();
    if (!t) return true;
    return [h.tree_unique_id, h.species].some((v) => v?.toLowerCase().includes(t));
  });

  return (
    <div className="earth" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 270px', gap: 0, height: '100%', minHeight: 460, background: 'var(--ink)', color: 'var(--surface)' }}>
      {/* Viewer / flat fallback */}
      <div style={{ position: 'relative', minHeight: 460, background: '#000' }}>
        {flat || failed ? (
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <img src={current.image_url} alt="360° scene (flat)" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <span style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,.6)', color: '#cdd', fontSize: 11, padding: '3px 8px', borderRadius: 6 }}>
              flat view · 360° needs WebGL — use the tree list →
            </span>
          </div>
        ) : (
          <div ref={elRef} style={{ position: 'absolute', inset: 0 }} />
        )}
        {isDemo && (
          <span style={{ position: 'absolute', top: 10, left: 10, zIndex: 5, background: 'rgba(232,163,61,.92)', color: '#16282e', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999 }}>
            Demo · not a verified capture
          </span>
        )}
        {/* Tree proof drawer */}
        {drawer && (
          <div style={{ position: 'absolute', right: 12, bottom: 12, zIndex: 6, width: 240, background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 12, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
              <div className="mono" style={{ color: 'var(--alive)', fontWeight: 700 }}>{drawer.tree_unique_id ?? 'Tree'}</div>
              <button onClick={() => setDrawer(null)} style={{ background: 'none', border: 'none', color: '#9fb0ad', cursor: 'pointer', fontSize: 16 }}>×</button>
            </div>
            {drawer.species && <div style={{ color: '#cdd', fontSize: 13, marginTop: 2 }}>{drawer.species}</div>}
            <div style={{ fontSize: 12, color: drawer.status_id === 4 ? '#e2554a' : '#9fb0ad', marginTop: 4 }}>{drawer.status ?? STATUS_LABEL[drawer.status_id ?? 1]}</div>
            <Link to={`/tree/${drawer.tree_id}`} style={{ display: 'inline-block', marginTop: 10, background: 'var(--alive)', color: '#16282e', textDecoration: 'none', padding: '7px 14px', borderRadius: 999, fontWeight: 700, fontSize: 13 }}>
              View full proof →
            </Link>
          </div>
        )}
      </div>

      {/* Side rail: scenes + searchable tree list */}
      <aside style={{ borderLeft: '1px solid var(--line)', background: 'var(--ink-2)', overflowY: 'auto', padding: 12 }}>
        <div className="mono" style={{ fontSize: 11, color: '#9fb0ad', textTransform: 'uppercase', letterSpacing: '.08em' }}>Scenes</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '8px 0 16px' }}>
          {scenes.map((s, i) => (
            <button key={s.id} onClick={() => void goToScene(s.id)}
              style={{ textAlign: 'left', padding: '8px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                border: '1px solid ' + (s.id === currentId ? 'var(--alive)' : 'var(--line)'),
                background: s.id === currentId ? 'rgba(182,255,60,.1)' : 'transparent',
                color: s.id === currentId ? 'var(--alive)' : 'var(--surface)' }}>
              {i + 1}. {s.label || `Scene ${s.id}`} <span style={{ color: '#9fb0ad' }}>· {s.hotspots.length}🌳</span>
            </button>
          ))}
        </div>
        <div className="mono" style={{ fontSize: 11, color: '#9fb0ad', textTransform: 'uppercase', letterSpacing: '.08em' }}>
          Trees here ({current.hotspots.length})
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tree / species…"
          style={{ width: '100%', margin: '8px 0', background: 'var(--ink)', border: '1px solid var(--line)', color: 'var(--surface)', borderRadius: 8, padding: '6px 10px', fontSize: 13 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filtered.map((h) => (
            <button key={h.tree_id} onClick={() => (flat || failed ? setDrawer(h) : jumpTo(h))}
              style={{ textAlign: 'left', padding: '6px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 12.5, border: '1px solid var(--line)', background: 'transparent', color: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: ({ 1: '#b6ff3c', 2: '#e8a33d', 3: '#f0792b', 4: '#6b7b82' } as Record<number, string>)[h.status_id ?? 1] }} />
              <span className="mono">{h.tree_unique_id}</span>
              {h.species && <span style={{ color: '#9fb0ad' }}>· {h.species}</span>}
            </button>
          ))}
          {filtered.length === 0 && <span style={{ color: '#9fb0ad', fontSize: 12 }}>No trees match.</span>}
        </div>
      </aside>
    </div>
  );
}
