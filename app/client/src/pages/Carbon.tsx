/**
 * Carbon (/carbon) — public methodology + platform-wide "verification-ready
 * removals" total. The transparency surface that makes the carbon number
 * credible (and is the B->A rating lever). Everything is labelled as an
 * estimate, never an issued credit, until a registry verifies.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchCarbonSummary, fetchLeaderboard, type CarbonSummary, type LeaderRow } from '@/lib/publicApi';
import '@/styles/earth.css';

const STEPS = [
  { k: '01', t: 'Measure', d: 'Each monthly visit records diameter (DBH) + height + photo + GPS for the tree.' },
  { k: '02', t: 'Biomass', d: 'Measured DBH/height + per-species wood density (Global Wood Density DB / ICRAF) → allometric equation (Chave 2014) → above-ground biomass.' },
  { k: '03', t: 'Carbon', d: '+ roots (24%) → ×0.47 carbon fraction → ×3.667 → kg CO₂e held by the tree (its stock).' },
  { k: '04', t: 'Sequestration', d: 'The change in stock between visits is the CO₂e removed that year. A dead tree freezes its stock.' },
  { k: '05', t: 'Aggregate', d: 'Sum every tree across all forests by vintage year into a credit-ready batch.' },
  { k: '06', t: 'Discount', d: 'Subtract a permanence buffer + an allometric-uncertainty deduction → net removals.' },
  { k: '07', t: 'Verify & issue', d: 'A registry-approved auditor checks the ledger + photos; the registry issues serial-numbered credits. Only then is it a “credit”.' },
];

export default function Carbon() {
  const [s, setS] = useState<CarbonSummary | null>(null);
  const [board, setBoard] = useState<LeaderRow[]>([]);
  useEffect(() => {
    fetchCarbonSummary().then(setS).catch(() => undefined);
    fetchLeaderboard().then(setBoard).catch(() => undefined);
  }, []);

  return (
    <div className="earth" style={{ background: 'var(--ink)', color: 'var(--surface)', minHeight: '100vh' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px clamp(20px,5vw,48px)', borderBottom: '1px solid var(--line)' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--surface)', textDecoration: 'none', fontWeight: 700 }}>
          <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--alive)', boxShadow: '0 0 12px rgba(182,255,60,.7)' }} /> COMMUNITREE
        </Link>
        <Link to="/map" style={{ color: 'var(--alive)', textDecoration: 'none', fontSize: 14 }}>Live map →</Link>
      </nav>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: 'clamp(28px,5vw,56px) clamp(20px,5vw,48px)' }}>
        <div className="mono" style={{ color: 'var(--alive)', fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 14 }}>Carbon · methodology</div>
        <h1 className="serif" style={{ fontWeight: 600, fontSize: 'clamp(30px,5vw,52px)', lineHeight: 1.05, margin: 0, maxWidth: '20ch' }}>
          Every tonne, traceable to a tree.
        </h1>
        <p style={{ color: '#aebcb9', marginTop: 16, fontSize: 17, maxWidth: '62ch', lineHeight: 1.6 }}>
          We compute carbon from <em>measured growth</em> on each tree — not a flat estimate — using the same allometric science registries require. Below is the live total and exactly how it is calculated.
        </p>

        {/* Live totals */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16, marginTop: 32 }}>
          <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: '20px 22px' }}>
            <div className="mono" style={{ fontSize: 30, color: 'var(--alive)' }}>{s ? s.gross_tco2e.toLocaleString() : '…'}</div>
            <div style={{ fontSize: 12, color: '#9fb0ad', textTransform: 'uppercase', letterSpacing: '.08em', marginTop: 6 }}>tCO₂e gross (estimated)</div>
          </div>
          <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: '20px 22px' }}>
            <div className="mono" style={{ fontSize: 30, color: 'var(--alive)' }}>{s ? s.net_tco2e.toLocaleString() : '…'}</div>
            <div style={{ fontSize: 12, color: '#9fb0ad', textTransform: 'uppercase', letterSpacing: '.08em', marginTop: 6 }}>tCO₂e net of buffer + uncertainty</div>
          </div>
          <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: '20px 22px' }}>
            <div className="mono" style={{ fontSize: 30, color: 'var(--alive)' }}>{s ? s.measured_trees.toLocaleString() : '…'}</div>
            <div style={{ fontSize: 12, color: '#9fb0ad', textTransform: 'uppercase', letterSpacing: '.08em', marginTop: 6 }}>measured trees (monitored)</div>
          </div>
          <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 14, padding: '20px 22px' }}>
            <div className="mono" style={{ fontSize: 30, color: 'var(--alive)' }}>{s?.estimated_planted_tco2e != null ? s.estimated_planted_tco2e.toLocaleString() : '…'}</div>
            <div style={{ fontSize: 12, color: '#9fb0ad', textTransform: 'uppercase', letterSpacing: '.08em', marginTop: 6 }}>tCO₂e estimated · all {s?.planted_trees != null ? s.planted_trees.toLocaleString() : '…'} planted</div>
          </div>
        </div>

        <div className="mono" style={{ marginTop: 14, padding: '12px 16px', borderRadius: 10, background: 'rgba(232,163,61,.1)', border: '1px solid rgba(232,163,61,.35)', color: '#e8c89a', fontSize: 12.5, lineHeight: 1.6 }}>
          These are <strong>estimated, verification-ready removals</strong> — not issued carbon credits. A credit exists only after a registry-approved auditor verifies and the registry issues it{ s ? ` (buffer ${Math.round(s.buffer_pct * 100)}% · uncertainty ${Math.round(s.uncertainty_pct * 100)}% · method ${s.method})` : '' }.
        </div>

        {/* On-chain anchor */}
        {s?.anchor && (
          <div style={{ marginTop: 18, padding: '16px 18px', borderRadius: 12, background: 'var(--ink-2)', border: '1px solid var(--line)' }}>
            <div className="mono" style={{ fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--alive)', marginBottom: 8 }}>
              <i className="ti" aria-hidden="true"></i>⛓ Anchored to Bitcoin · OpenTimestamps
            </div>
            <p style={{ fontSize: 13.5, color: '#aebcb9', margin: '0 0 8px', lineHeight: 1.6 }}>
              The full carbon ledger is fingerprinted into one Merkle root and timestamped on the Bitcoin blockchain — so the record is tamper-evident and independently verifiable.
            </p>
            <div className="mono" style={{ fontSize: 12, color: '#cdd', wordBreak: 'break-all' }}>
              root <span style={{ color: 'var(--alive)' }}>{s.anchor.root_hash.slice(0, 32)}…</span>
            </div>
            <div className="mono" style={{ fontSize: 12, color: '#9fb0ad', marginTop: 4 }}>
              status {s.anchor.status} · {s.anchor.ledger_rows} ledger rows
            </div>
          </div>
        )}

        {/* Method steps */}
        <h2 className="serif" style={{ fontWeight: 600, fontSize: 26, margin: '44px 0 18px' }}>How a tree becomes a credit</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 18 }}>
          {STEPS.map((x) => (
            <div key={x.k} style={{ borderTop: '2px solid var(--alive)', paddingTop: 16 }}>
              <div className="mono" style={{ color: 'var(--alive)', fontSize: 13, marginBottom: 8 }}>{x.k}</div>
              <h3 className="serif" style={{ fontWeight: 600, fontSize: 20, margin: '0 0 6px' }}>{x.t}</h3>
              <p style={{ fontSize: 14, color: '#aebcb9', lineHeight: 1.6, margin: 0 }}>{x.d}</p>
            </div>
          ))}
        </div>

        {board.length > 0 && (
          <>
            <h2 className="serif" style={{ fontWeight: 600, fontSize: 26, margin: '44px 0 16px' }}>Survival index</h2>
            <p style={{ fontSize: 14, color: '#9fb0ad', margin: '0 0 16px', maxWidth: '60ch' }}>
              Sponsors ranked by trees, with live survival % — including losses. The trust benchmark of the sector.
            </p>
            <div style={{ border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
              {board.map((r, i) => (
                <Link key={r.id} to={`/sponsor/${r.id}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', textDecoration: 'none', color: 'var(--surface)', background: i % 2 ? 'transparent' : 'rgba(255,255,255,.02)', borderBottom: i < board.length - 1 ? '1px solid var(--line)' : 'none' }}>
                  <span className="mono" style={{ color: '#9fb0ad', width: 20 }}>{i + 1}</span>
                  {r.logo && <img src={r.logo} alt="" style={{ width: 24, height: 24, borderRadius: 6, background: '#fff', objectFit: 'contain', padding: 2 }} />}
                  <span style={{ flex: 1, fontWeight: 600, fontSize: 15 }}>{r.name}</span>
                  <span className="mono" style={{ fontSize: 13, color: '#9fb0ad' }}>{r.trees.toLocaleString()} trees</span>
                  <span className="mono" style={{ fontSize: 14, color: 'var(--alive)', width: 64, textAlign: 'right' }}>{r.survival_pct != null ? `${r.survival_pct}%` : '—'}</span>
                </Link>
              ))}
            </div>
          </>
        )}

        <p style={{ marginTop: 40, fontSize: 14, color: '#9fb0ad' }}>
          Target standards: Plan Vivo (launch) → Verra VM0047 census-based (scale). Per-tree dMRV — monthly photo, GPS, survival — is what makes the aggregate auditable and premium-rated.
        </p>

        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--line)' }}>
          <div className="mono" style={{ fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase', color: '#9fb0ad', marginBottom: 10 }}>Open data</div>
          <p style={{ fontSize: 14, color: '#aebcb9', marginBottom: 12, maxWidth: '60ch' }}>
            Every forest is exportable as standards-compliant GeoJSON (RFC 7946, WGS84, 6-decimal — EUDR-grade), so any GIS, registry or auditor can verify it independently.
          </p>
          <a href="/api/v1/public/forests.geojson" target="_blank" rel="noreferrer"
             style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--alive)', color: '#16282e', textDecoration: 'none', padding: '10px 18px', borderRadius: 999, fontWeight: 700, fontSize: 14 }}>
            Download forests.geojson ↓
          </a>
        </div>
      </div>
    </div>
  );
}
