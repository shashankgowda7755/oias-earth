/**
 * ForestTourPage (/forest/:id/tour) — full-screen interactive 360° forest tour.
 * Fetches the scene graph and hands it to <ForestTour>. Shareable, no login.
 */
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ForestTour from '@/components/ForestTour';
import { fetchForestScenes, type ForestScene } from '@/lib/publicApi';
import '@/styles/earth.css';

export default function ForestTourPage() {
  const { id = '' } = useParams();
  const [scenes, setScenes] = useState<ForestScene[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchForestScenes(id)
      .then(setScenes)
      .catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load tour'));
  }, [id]);

  return (
    <div className="earth" style={{ background: 'var(--ink)', color: 'var(--surface)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px clamp(16px,4vw,40px)', borderBottom: '1px solid var(--line)' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--surface)', textDecoration: 'none', fontWeight: 700 }}>
          <span style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--alive)', boxShadow: '0 0 12px rgba(182,255,60,.7)' }} /> Be The Tree Hugger
        </Link>
        <div className="mono" style={{ fontSize: 12, color: 'var(--alive)' }}>interactive 360° tour</div>
        <Link to="/map" style={{ color: 'var(--alive)', textDecoration: 'none', fontSize: 14 }}>Live map →</Link>
      </nav>
      <div style={{ flex: 1, minHeight: 0 }}>
        {err ? (
          <p style={{ padding: 40, color: 'var(--amber)' }}>{err}</p>
        ) : !scenes ? (
          <p style={{ padding: 40, color: '#9fb0ad' }}>Loading 360° tour…</p>
        ) : scenes.length === 0 ? (
          <div style={{ padding: 48, maxWidth: 560 }}>
            <h1 className="serif" style={{ fontWeight: 600, fontSize: 28, margin: 0 }}>No 360° tour yet</h1>
            <p style={{ color: '#aebcb9', marginTop: 10, lineHeight: 1.6 }}>
              This forest has no 360° scenes captured yet. An admin adds scenes + tree hotspots in the forest's
              360 Tour tab, then they appear here as a navigable walkthrough.
            </p>
            <Link to="/map" style={{ color: 'var(--alive)' }}>← Back to the map</Link>
          </div>
        ) : (
          <ForestTour scenes={scenes} />
        )}
      </div>
    </div>
  );
}
