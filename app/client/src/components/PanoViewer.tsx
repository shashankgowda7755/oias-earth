/**
 * PanoViewer — our own in-site 360 viewer for equirectangular images (self-hosted
 * or any https image). The heavy WebGL library (@photo-sphere-viewer/core) is
 * DYNAMIC-imported inside the effect, so it only downloads when a panorama is
 * actually opened — it never touches the initial bundle. External 360-host tours
 * still render via a sandboxed iframe (handled by the caller); this is for images.
 */
import { useEffect, useRef, useState } from 'react';
import '@photo-sphere-viewer/core/index.css';

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

export default function PanoViewer({ src }: { src: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [err, setErr] = useState(false);
  // No WebGL (old device / headless) → show the flat equirect so the forest still
  // appears, just not interactive. Graceful degradation beats an error message.
  const [flat] = useState(() => !hasWebGL());

  useEffect(() => {
    if (flat) return;
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let viewer: any;
    const el = ref.current;
    if (!el) return;
    import('@photo-sphere-viewer/core')
      .then(({ Viewer }) => {
        if (cancelled || !ref.current) return;
        viewer = new Viewer({
          container: ref.current,
          panorama: src,
          navbar: ['zoom', 'move', 'fullscreen'],
          defaultZoomLvl: 0,
          loadingTxt: 'Loading 360°…',
          touchmoveTwoFingers: false,
          mousewheelCtrlKey: false,
        });
        viewer.addEventListener('error', () => setErr(true));
      })
      .catch(() => setErr(true));
    return () => {
      cancelled = true;
      if (viewer) viewer.destroy();
    };
  }, [src, flat]);

  if (flat || err) {
    // Flat equirect fallback (no WebGL or viewer failed). Shows the scene,
    // non-interactive, with an honest note.
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <img src={src} alt="360° panorama (flat view)" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        <span style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,.55)', color: '#cdd', fontSize: 11, padding: '3px 8px', borderRadius: 6 }}>
          flat view · 360° needs WebGL
        </span>
      </div>
    );
  }
  return <div ref={ref} style={{ width: '100%', height: '100%' }} />;
}
