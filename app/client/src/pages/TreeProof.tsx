/**
 * TreeProof (/tree/:id) — the per-tree PROOF-OF-LIFE page. The moat made visible:
 * not a day-zero certificate, but a longitudinal life record — every visit,
 * dated, with a photo, growth, and survival status, verifiable by anyone, no
 * login. Living Instrument design.
 */
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { HeartbeatMap } from '@/components/HeartbeatMap';
import { fetchTreeProof, type TreeProof as TP } from '@/lib/publicApi';
import '@/styles/earth.css';

function fmtDate(d: string | null): string {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function GrowthChart({ visits }: { visits: TP['visits'] }) {
  const pts = visits.filter((v) => v.height != null).map((v) => v.height as number);
  if (pts.length < 2) return null;
  const w = 520;
  const h = 140;
  const pad = 8;
  const max = Math.max(...pts);
  const min = Math.min(0, ...pts);
  const stepX = (w - pad * 2) / (pts.length - 1);
  const y = (v: number) => h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
  const d = pts.map((v, i) => `${i === 0 ? 'M' : 'L'} ${pad + i * stepX} ${y(v)}`).join(' ');
  const area = `${d} L ${pad + (pts.length - 1) * stepX} ${h - pad} L ${pad} ${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto' }} role="img" aria-label="Tree height over time">
      <path d={area} fill="rgba(182,255,60,.12)" />
      <path d={d} fill="none" stroke="#b6ff3c" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((v, i) => (
        <circle key={i} cx={pad + i * stepX} cy={y(v)} r={4} fill="#b6ff3c" />
      ))}
    </svg>
  );
}

export default function TreeProof() {
  const { id = '' } = useParams();
  const [data, setData] = useState<TP | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchTreeProof(id)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  const wrap = (children: React.ReactNode) => (
    <div className="earth" style={{ background: 'var(--ink)', color: 'var(--surface)', minHeight: '100vh' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px clamp(20px,5vw,48px)', borderBottom: '1px solid var(--line)' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--surface)', textDecoration: 'none', fontWeight: 700 }}>
          <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--alive)', boxShadow: '0 0 12px rgba(182,255,60,.7)' }} /> Be The Tree Hugger
        </Link>
        <Link to="/map" style={{ color: 'var(--alive)', textDecoration: 'none', fontSize: 14 }}>← Live map</Link>
      </nav>
      {children}
    </div>
  );

  if (loading) return wrap(<p style={{ padding: 48, color: '#9fb0ad' }}>Loading life record…</p>);
  if (error || !data) return wrap(<p style={{ padding: 48, color: 'var(--amber)' }}>{error ?? 'Tree not found.'}</p>);

  const { tree, summary, visits } = data;
  const alive = summary.survival === 'alive';
  const badgeColor = alive ? 'var(--alive)' : summary.survival === 'dead' ? '#e2554a' : 'var(--slate)';
  const pin = tree.lat != null && tree.lng != null
    ? [{ id: tree.id, name: tree.forest_name, unique_id: tree.forest_unique_id, lat: tree.lat, lng: tree.lng, city: tree.city, state: tree.state, country: null, total_trees: 1, tagged_trees: 1 }]
    : [];

  return wrap(
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 'clamp(28px,5vw,56px) clamp(20px,5vw,48px)' }}>
      {/* Header */}
      <div className="mono" style={{ color: 'var(--alive)', fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 14 }}>Proof of life · verified record</div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <h1 className="serif" style={{ fontWeight: 600, fontSize: 'clamp(32px,5vw,56px)', lineHeight: 1.05, margin: 0 }}>
            {tree.species ?? 'Tree'} <span className="mono" style={{ fontSize: '.45em', color: '#9fb0ad', verticalAlign: 'middle' }}>{tree.tree_unique_id}</span>
          </h1>
          <p style={{ color: '#aebcb9', marginTop: 8, fontSize: 16 }}>
            {tree.forest_name}{tree.city ? ` · ${tree.city}` : ''}{tree.state ? `, ${tree.state}` : ''} · planted {fmtDate(tree.planted_on)}
          </p>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, border: `1px solid ${badgeColor}`, color: badgeColor, padding: '8px 16px', borderRadius: 999, fontWeight: 600, fontSize: 15 }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: badgeColor, boxShadow: alive ? '0 0 10px rgba(182,255,60,.8)' : 'none' }} />
          {alive ? 'Alive' : summary.survival === 'dead' ? 'Lost' : 'Unverified'}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 14, marginTop: 30 }}>
        {[
          { v: String(summary.visit_count), l: 'verified visits' },
          { v: summary.latest_height != null ? `${summary.latest_height} m` : '—', l: 'current height' },
          { v: summary.co2e_kg != null ? `${summary.co2e_kg} kg` : '—', l: 'CO₂e captured · est.' },
          { v: fmtDate(summary.last_seen), l: 'last seen' },
        ].map((s) => (
          <div key={s.l} style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '16px 18px' }}>
            <div className="mono" style={{ fontSize: 22, color: 'var(--alive)' }}>{s.v}</div>
            <div style={{ fontSize: 11, color: '#9fb0ad', textTransform: 'uppercase', letterSpacing: '.08em', marginTop: 6 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Growth chart */}
      {visits.filter((v) => v.height != null).length >= 2 && (
        <div style={{ marginTop: 34 }}>
          <h2 className="serif" style={{ fontWeight: 600, fontSize: 22, margin: '0 0 14px' }}>Growth, measured</h2>
          <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: 20 }}>
            <GrowthChart visits={visits} />
          </div>
        </div>
      )}

      {/* Visit timeline */}
      <h2 className="serif" style={{ fontWeight: 600, fontSize: 22, margin: '36px 0 16px' }}>The life record</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16 }}>
        {visits.map((v, i) => (
          <div key={v.id} style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
            {v.photos[0] ? (
              <img src={v.photos[0]} alt={`Visit ${fmtDate(v.date)}`} loading="lazy" style={{ width: '100%', height: 150, objectFit: 'cover', display: 'block' }} />
            ) : (
              <div style={{ height: 150, background: 'var(--pine)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9fb0ad', fontSize: 13 }}>no photo</div>
            )}
            <div style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="mono" style={{ fontSize: 12, color: 'var(--alive)' }}>{i === 0 ? 'PLANTED' : `VISIT ${i}`}</span>
                <span style={{ fontSize: 11, color: v.status_id === 4 ? '#e2554a' : '#aebcb9' }}>{v.status ?? '—'}</span>
              </div>
              <div style={{ fontWeight: 600, fontSize: 15, marginTop: 6 }}>{fmtDate(v.date)}</div>
              <div className="mono" style={{ fontSize: 12, color: '#9fb0ad', marginTop: 6 }}>
                {v.height != null ? `${v.height} m` : '—'}{v.diameter != null ? ` · ⌀ ${v.diameter} cm` : ''}
              </div>
              {v.co2e_kg != null && v.co2e_kg > 0 && (
                <div className="mono" style={{ fontSize: 12, color: 'var(--alive)', marginTop: 4 }}>
                  {v.co2e_kg} kg CO₂e{v.co2e_delta_kg != null && v.co2e_delta_kg > 0 ? ` (+${v.co2e_delta_kg})` : ''}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Carbon disclaimer */}
      {summary.co2e_kg != null && summary.co2e_kg > 0 && (
        <p className="mono" style={{ fontSize: 11.5, color: '#9fb0ad', marginTop: 16, lineHeight: 1.6, maxWidth: '70ch' }}>
          CO₂e is an <span style={{ color: 'var(--alive)' }}>estimated, verification-ready removal</span> computed from measured diameter + height (Chave 2014 allometry · IPCC factors). Net of buffer + uncertainty ≈ {summary.co2e_net_kg} kg. It is <strong>not</strong> an issued carbon credit until a registry verifies it.
        </p>
      )}

      {/* Where */}
      {pin.length > 0 && (
        <>
          <h2 className="serif" style={{ fontWeight: 600, fontSize: 22, margin: '36px 0 16px' }}>Where it stands</h2>
          <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line)', height: 320 }}>
            <HeartbeatMap forests={pin} interactive zoom={16} />
          </div>
          <p className="mono" style={{ fontSize: 12, color: '#9fb0ad', marginTop: 10 }}>
            {tree.lat?.toFixed(6)}, {tree.lng?.toFixed(6)} · coordinates fixed at planting, re-checked every visit
          </p>
        </>
      )}
    </div>,
  );
}
