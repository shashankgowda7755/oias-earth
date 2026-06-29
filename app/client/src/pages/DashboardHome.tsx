/**
 * DashboardHome — the admin landing as a BENTO GRID. Command-center home:
 * KPI tiles (forests / trees / geo-tagged / survival), a large live-map tile
 * (HeartbeatMap), a recent-forests list (click → public forest matrix), quick
 * actions (jump to a section / live map), and a reports shortcut. All real data
 * from fetchForestsMap. COMMUNITREE dark + lime. Collapses to one column on mobile.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchForestsMap, type ForestPin } from '@/lib/publicApi';
import { HeartbeatMap } from '@/components/HeartbeatMap';
import type { SectionTab } from '@/components/TabNav';

const T = {
  tile: 'rounded-2xl border p-4 overflow-hidden',
  tileBg: { background: '#13241a', borderColor: '#21372b' } as const,
};

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={T.tile} style={T.tileBg}>
      <div style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7f9b8a' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 600, marginTop: 4, color: accent ? '#b6ff3c' : '#eaf6ee' }}>{value}</div>
    </div>
  );
}

export default function DashboardHome({ onOpenTab }: { onOpenTab: (t: SectionTab) => void }) {
  const [forests, setForests] = useState<ForestPin[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let off = false;
    fetchForestsMap()
      .then((f) => { if (!off) setForests(f); })
      .catch(() => undefined)
      .finally(() => { if (!off) setLoading(false); });
    return () => { off = true; };
  }, []);

  const kpi = useMemo(() => {
    const trees = forests.reduce((s, f) => s + (f.total_trees || 0), 0);
    const tagged = forests.reduce((s, f) => s + (f.tagged_trees || 0), 0);
    const alive = forests.reduce((s, f) => s + (f.alive_trees ?? f.tagged_trees ?? 0), 0);
    return {
      forests: forests.length,
      trees,
      taggedPct: trees > 0 ? Math.round((tagged / trees) * 100) : 0,
      survivalPct: trees > 0 ? Math.round((alive / trees) * 100) : 0,
    };
  }, [forests]);

  const recent = useMemo(
    () => [...forests].sort((a, b) => (b.total_trees || 0) - (a.total_trees || 0)).slice(0, 6),
    [forests],
  );

  const fmt = (n: number) => n.toLocaleString('en-IN');

  return (
    <div style={{ color: '#eaf6ee' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>Overview</h1>
        <Link to="/map" style={{ fontSize: 13, color: '#b6ff3c', textDecoration: 'none' }}>Open live map →</Link>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gridAutoRows: 'minmax(84px, auto)',
          gap: 12,
        }}
        className="bento-grid"
      >
        <Kpi label="Forests" value={loading ? '—' : fmt(kpi.forests)} />
        <Kpi label="Trees" value={loading ? '—' : fmt(kpi.trees)} accent />
        <Kpi label="Geo-tagged" value={loading ? '—' : `${kpi.taggedPct}%`} />
        <Kpi label="Survival" value={loading ? '—' : `${kpi.survivalPct}%`} />

        {/* Live map — large tile */}
        <div className={T.tile} style={{ ...T.tileBg, gridColumn: 'span 2', gridRow: 'span 3', padding: 0, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 12, left: 14, zIndex: 500, fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: '#cfe', background: 'rgba(13,21,24,.7)', padding: '3px 8px', borderRadius: 8 }}>
            Live map
          </div>
          <div style={{ position: 'absolute', inset: 0, borderRadius: 16, overflow: 'hidden' }}>
            <HeartbeatMap forests={forests} interactive />
          </div>
        </div>

        {/* Recent forests — tall tile */}
        <div className={T.tile} style={{ ...T.tileBg, gridRow: 'span 3' }}>
          <div style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7f9b8a', marginBottom: 8 }}>Recent forests</div>
          {loading ? (
            <div style={{ color: '#7f9b8a', fontSize: 13 }}>Loading…</div>
          ) : recent.length === 0 ? (
            <div style={{ color: '#7f9b8a', fontSize: 13 }}>No forests yet</div>
          ) : (
            recent.map((f) => (
              <button
                key={f.id}
                onClick={() => navigate(`/forest/${f.id}`)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: '1px solid #1c2f25', padding: '7px 0', cursor: 'pointer', color: '#cfe', fontSize: 13 }}
              >
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name ?? 'Forest'}</span>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: '#16320f', color: '#b6ff3c', border: '1px solid #2f5a1e' }}>{fmt(f.total_trees || 0)}</span>
              </button>
            ))
          )}
        </div>

        {/* Quick actions — wide tile */}
        <div className={T.tile} style={{ ...T.tileBg, gridColumn: 'span 2', gridRow: 'span 2' }}>
          <div style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7f9b8a', marginBottom: 8 }}>Quick actions</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {([
              ['＋ Add forest', () => onOpenTab('Forests')],
              ['▦ Reports', () => onOpenTab('Reports')],
              ['◑ Sponsors', () => onOpenTab('Sponsors')],
              ['✦ Integrity', () => onOpenTab('Integrity')],
            ] as const).map(([label, fn]) => (
              <button key={label} onClick={fn} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#dfeede', background: '#19271f', border: '1px solid #284032', borderRadius: 10, padding: '10px 12px', cursor: 'pointer' }}>
                <span style={{ color: '#b6ff3c' }}>{label.slice(0, 1)}</span>
                <span>{label.slice(2)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Reports shortcut */}
        <div className={T.tile} style={{ ...T.tileBg, gridColumn: 'span 2' }}>
          <div style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: '#7f9b8a' }}>Reports</div>
          <div style={{ marginTop: 6, fontSize: 13, color: '#cfe' }}>
            Build &amp; send quarterly forest reports.{' '}
            <button onClick={() => onOpenTab('Reports')} style={{ background: 'transparent', border: 'none', color: '#b6ff3c', cursor: 'pointer', fontWeight: 600, padding: 0 }}>Open →</button>
          </div>
        </div>
      </div>

      <style>{`@media (max-width: 760px){ .bento-grid{ grid-template-columns: 1fr !important; } .bento-grid > div{ grid-column: span 1 !important; grid-row: auto !important; } }`}</style>
    </div>
  );
}
