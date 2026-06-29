/**
 * ReportSponsor (/report/sponsor/:id) — the CSR impact report a corporate can
 * download + file. Light, print-perfect (A4), branded: carbon sequestered +
 * OXYGEN generated + survival % + per-forest table + map + methodology. The
 * "Download PDF" button uses the browser's print-to-PDF (pixel-faithful, no
 * server Chromium). Numbers are labelled estimated / verification-ready.
 */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { HeartbeatMap } from '@/components/HeartbeatMap';
import { fetchSponsor, type SponsorSite } from '@/lib/publicApi';

const PRINT_CSS = `
@media print {
  .no-print { display: none !important; }
  body { background: #fff !important; }
  @page { margin: 14mm; }
  .rpt-forest-table { page-break-inside: auto; }
}`;

export default function ReportSponsor() {
  const { id = '' } = useParams();
  const [d, setD] = useState<SponsorSite | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchSponsor(id).then(setD).catch((e) => setErr(e instanceof Error ? e.message : 'Failed'));
  }, [id]);

  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const ink = '#16282e', pine = '#1d6b3f', muted = '#5a6b72', line = '#e2e7e3';
  const card: React.CSSProperties = { border: `1px solid ${line}`, borderRadius: 12, padding: '16px 18px', background: '#fbfdfb' };

  if (err) return <div style={{ padding: 48, fontFamily: 'system-ui' }}>{err}</div>;
  if (!d) return <div style={{ padding: 48, fontFamily: 'system-ui', color: muted }}>Loading report…</div>;

  const { sponsor, forests, totals } = d;
  const o2 = totals.oxygen_kg ?? 0;
  const o2Display = o2 >= 1000 ? `${(o2 / 1000).toFixed(2)} t` : `${Math.round(o2)} kg`;
  const pins = forests.filter((f) => f.lat != null && f.lng != null).map((f) => ({
    id: f.id, name: f.name, unique_id: f.unique_id, lat: f.lat, lng: f.lng, city: f.city, state: f.state,
    country: null, total_trees: f.total_trees, tagged_trees: f.tagged_trees,
  }));

  const tiles = [
    { v: String(totals.forests), l: 'Forests' },
    { v: totals.trees.toLocaleString('en-IN'), l: 'Trees planted' },
    { v: totals.survival_pct != null ? `${totals.survival_pct}%` : '—', l: 'Survival rate' },
    { v: totals.net_tco2e.toLocaleString('en-IN'), l: 'tCO₂e sequestered (net, est.)' },
    { v: o2Display, l: 'Oxygen generated (est.)' },
  ];

  return (
    <div style={{ background: '#fff', color: ink, minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <style>{PRINT_CSS}</style>
      <div style={{ maxWidth: 920, margin: '0 auto', padding: 'clamp(20px,4vw,40px)' }}>
        {/* Toolbar (screen only) */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ color: muted, fontSize: 13 }}>CSR impact report · preview</span>
          <button onClick={() => window.print()} style={{ background: pine, color: '#fff', border: 'none', borderRadius: 999, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            ↓ Download PDF
          </button>
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, borderBottom: `2px solid ${pine}`, paddingBottom: 16 }}>
          {sponsor.logo && <img src={sponsor.logo} alt="" style={{ width: 56, height: 56, objectFit: 'contain' }} />}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase', color: pine, fontWeight: 700 }}>CSR Forest Impact Report</div>
            <h1 style={{ fontSize: 26, margin: '2px 0 0', fontWeight: 700 }}>{sponsor.name}</h1>
            <div style={{ color: muted, fontSize: 13 }}>{[sponsor.industry, sponsor.headquarters].filter(Boolean).join(' · ')}</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 12, color: muted }}>
            <div style={{ fontWeight: 700, color: ink }}>COMMUNITREE</div>
            <div>Generated {today}</div>
          </div>
        </div>

        {/* KPI tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginTop: 22 }}>
          {tiles.map((t) => (
            <div key={t.l} style={card}>
              <div style={{ fontSize: 24, fontWeight: 700, color: pine }}>{t.v}</div>
              <div style={{ fontSize: 11.5, color: muted, marginTop: 4 }}>{t.l}</div>
            </div>
          ))}
        </div>

        {/* Map */}
        {pins.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 10px' }}>Where your forests are</h2>
            <div style={{ height: 300, borderRadius: 12, overflow: 'hidden', border: `1px solid ${line}` }}>
              <HeartbeatMap forests={pins} interactive zoom={6} />
            </div>
          </div>
        )}

        {/* Per-forest table */}
        <div style={{ marginTop: 24 }} className="rpt-forest-table">
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 10px' }}>Forest-by-forest</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: `2px solid ${line}`, color: muted }}>
                {['Forest', 'Location', 'Trees', 'Alive', 'Survival'].map((h) => <th key={h} style={{ padding: '8px 10px', fontWeight: 600 }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {forests.map((f) => (
                <tr key={f.id} style={{ borderBottom: `1px solid ${line}` }}>
                  <td style={{ padding: '8px 10px', fontWeight: 600 }}>{f.name}</td>
                  <td style={{ padding: '8px 10px', color: muted }}>{[f.city, f.state].filter(Boolean).join(', ') || '—'}</td>
                  <td style={{ padding: '8px 10px' }}>{f.total_trees.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '8px 10px' }}>{f.alive_trees.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '8px 10px', color: pine, fontWeight: 600 }}>{f.survival_pct != null ? `${f.survival_pct}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Methodology + disclaimer */}
        <div style={{ marginTop: 26, paddingTop: 14, borderTop: `1px solid ${line}`, fontSize: 11, color: muted, lineHeight: 1.65 }}>
          <strong style={{ color: ink }}>Methodology.</strong> Carbon is computed per tree from measured diameter (DBH) + height
          using the Chave-2014 pantropical allometric equation with per-species wood density (Global Wood Density DB / ICRAF),
          +24% below-ground biomass, ×0.47 carbon fraction, ×3.667 CO₂. Net = gross − 18% permanence buffer − 10% uncertainty.
          Oxygen generated is derived from sequestered carbon (≈0.73 kg O₂ per kg CO₂, photosynthesis stoichiometry).
          Survival is the share of trees not recorded dead at the latest monitoring visit.
          All figures are <strong>estimated, verification-ready removals — not issued carbon credits</strong> until a registry verifies them.
        </div>
      </div>
    </div>
  );
}
