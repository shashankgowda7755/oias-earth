/**
 * Sponsor (/sponsor/:id) — public CSR microsite. "Here is YOUR forest": the
 * sponsor's brand, their forests on the map, live impact (trees, survival %,
 * verification-ready tCO2e), and a one-click ESG-ready CSV export.
 */
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { HeartbeatMap } from '@/components/HeartbeatMap';
import { fetchSponsor, type SponsorSite } from '@/lib/publicApi';
import '@/styles/earth.css';

export default function Sponsor() {
  const { id = '' } = useParams();
  const [d, setD] = useState<SponsorSite | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchSponsor(id).then(setD).catch((e) => setErr(e instanceof Error ? e.message : 'Failed'));
  }, [id]);

  const shell = (children: React.ReactNode) => (
    <div className="earth" style={{ background: 'var(--ink)', color: 'var(--surface)', minHeight: '100vh' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px clamp(20px,5vw,48px)', borderBottom: '1px solid var(--line)' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--surface)', textDecoration: 'none', fontWeight: 700 }}>
          <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--alive)', boxShadow: '0 0 12px rgba(182,255,60,.7)' }} /> OIAS Earth
        </Link>
        <Link to="/map" style={{ color: 'var(--alive)', textDecoration: 'none', fontSize: 14 }}>Live map →</Link>
      </nav>
      {children}
    </div>
  );

  if (err) return shell(<p style={{ padding: 48, color: 'var(--amber)' }}>{err}</p>);
  if (!d) return shell(<p style={{ padding: 48, color: '#9fb0ad' }}>Loading…</p>);

  const { sponsor, forests, totals } = d;
  const pins = forests.filter((f) => f.lat != null && f.lng != null).map((f) => ({
    id: f.id, name: f.name, unique_id: f.unique_id, lat: f.lat, lng: f.lng, city: f.city, state: f.state,
    country: null, total_trees: f.total_trees, tagged_trees: f.tagged_trees,
  }));

  return shell(
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 'clamp(28px,5vw,56px) clamp(20px,5vw,48px)' }}>
      <div className="mono" style={{ color: 'var(--alive)', fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 16 }}>CSR impact · live</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        {sponsor.logo && (
          <img src={sponsor.logo} alt={sponsor.name ?? ''} style={{ width: 64, height: 64, borderRadius: 12, background: '#fff', objectFit: 'contain', padding: 6 }} />
        )}
        <div>
          <h1 className="serif" style={{ fontWeight: 600, fontSize: 'clamp(28px,4.5vw,48px)', lineHeight: 1.05, margin: 0 }}>{sponsor.name}</h1>
          <p style={{ color: '#aebcb9', marginTop: 6, fontSize: 15 }}>
            {[sponsor.industry, sponsor.headquarters].filter(Boolean).join(' · ') || 'Sponsoring living proof'}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 14, marginTop: 30 }}>
        {[
          { v: String(totals.forests), l: 'forests' },
          { v: totals.trees.toLocaleString(), l: 'trees' },
          { v: totals.survival_pct != null ? `${totals.survival_pct}%` : '—', l: 'survival' },
          { v: totals.net_tco2e.toLocaleString(), l: 'tCO₂e (net, est.)' },
        ].map((s) => (
          <div key={s.l} style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '16px 18px' }}>
            <div className="mono" style={{ fontSize: 24, color: 'var(--alive)' }}>{s.v}</div>
            <div style={{ fontSize: 11, color: '#9fb0ad', textTransform: 'uppercase', letterSpacing: '.08em', marginTop: 6 }}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <Link to={`/portal/${id}`}
           style={{ display: 'inline-block', background: 'var(--alive)', color: '#16282e', textDecoration: 'none', padding: '10px 18px', borderRadius: 999, fontWeight: 700, fontSize: 14 }}>
          Open sponsor portal →
        </Link>
        <a href={`/api/v1/public/sponsor/${id}/report.csv`} target="_blank" rel="noreferrer"
           style={{ display: 'inline-block', background: 'transparent', color: 'var(--surface)', textDecoration: 'none', padding: '10px 18px', borderRadius: 999, fontWeight: 600, fontSize: 14, border: '1px solid var(--line)' }}>
          ESG report (CSV) ↓
        </a>
        <span className="mono" style={{ fontSize: 12, color: '#9fb0ad' }}>tCO₂e = estimated / verification-ready removal, not an issued credit</span>
      </div>

      {pins.length > 0 && (
        <div style={{ marginTop: 28, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line)', height: 340 }}>
          <HeartbeatMap forests={pins} interactive zoom={6} />
        </div>
      )}

      <h2 className="serif" style={{ fontWeight: 600, fontSize: 22, margin: '34px 0 16px' }}>Your forests</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 14 }}>
        {forests.map((f) => (
          <Link key={f.id} to={`/portal/${id}?forest=${f.id}`} style={{ textDecoration: 'none', color: 'var(--surface)' }}>
            <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: 18 }}>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{f.name}</div>
              <div style={{ fontSize: 12, color: '#9fb0ad' }}>{[f.city, f.state].filter(Boolean).join(', ') || '—'}</div>
              <div className="mono" style={{ fontSize: 13, color: 'var(--alive)', marginTop: 8 }}>
                {f.alive_trees}/{f.total_trees} alive{f.survival_pct != null ? ` · ${f.survival_pct}%` : ''}
              </div>
              <div style={{ fontSize: 12, color: 'var(--alive)', marginTop: 8, fontWeight: 600 }}>Open forest →</div>
            </div>
          </Link>
        ))}
      </div>
    </div>,
  );
}
