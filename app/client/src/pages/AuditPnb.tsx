/**
 * AuditPnb (/audit/pnb) — the credibility weapon. Takes the real PNB legacy
 * export (10,800 trees) and contrasts what the incumbent system REPORTS with
 * what a rigorous, verification-first methodology actually shows. Every number
 * here is from the real export (2026-05-18) or our recompute of it — nothing
 * invented. This is the artifact that wins a PNB-grade account.
 */
import { Link } from 'react-router-dom';
import '@/styles/earth.css';

interface Row {
  label: string;
  reported: string;
  ours: string;
  note?: string;
}

const ROWS: Row[] = [
  { label: 'Trees on record', reported: '10,800', ours: '10,800', note: 'same dataset' },
  {
    label: 'Survival',
    reported: '100% "Alive"',
    ours: 'Measured per visit',
    note: 'Every one of 10,800 trees is flagged Alive — i.e. survival is never actually checked. Real plantings lose 10-30%. We publish dead trees.',
  },
  {
    label: 'Per-tree measurement',
    reported: 'Species constant',
    ours: 'Per-tree DBH @1.3m + height',
    note: 'In the export every Arjun is identical: 3 ft, 0.7 in, 825 days. Not a field measurement — a placeholder repeated 5,600 times.',
  },
  {
    label: 'Per-tree carbon (Arjun)',
    reported: '103.13 kg',
    ours: '≈ 0.28 kg',
    note: 'Their flat linear figure vs Chave-2014 allometry on the dimensions they themselves report. The tree they describe (0.9 m, 1.8 cm) simply cannot hold 103 kg of CO₂e.',
  },
  {
    label: 'Total carbon claimed',
    reported: '931 t',
    ours: '2.2 t (net)',
    note: '312× lower. Not because we plant less — because we only count what the measurements support, then deduct an 18% buffer + 10% uncertainty. Real numbers grow as trees are actually measured.',
  },
  {
    label: 'Coordinates',
    reported: '10,800 in ~0.65 ha',
    ours: 'Per-tree GPS at capture',
    note: 'That density is ~6 trees/m² — physically impossible. The coordinates are an auto-generated spread around one point, not real GPS.',
  },
  {
    label: 'Verification',
    reported: 'None',
    ours: 'Photo-hash + GPS check + anchor',
    note: 'We hash every photo (recycled-photo detection), flag GPS outside the forest, and anchor the carbon ledger to Bitcoin (OpenTimestamps). Tamper-evident.',
  },
];

function Stat({ v, l, c }: { v: string; l: string; c?: string }) {
  return (
    <div style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '16px 18px' }}>
      <div className="mono" style={{ fontSize: 26, color: c ?? 'var(--alive)' }}>{v}</div>
      <div style={{ fontSize: 11, color: '#9fb0ad', textTransform: 'uppercase', letterSpacing: '.08em', marginTop: 6 }}>{l}</div>
    </div>
  );
}

export default function AuditPnb() {
  return (
    <div className="earth" style={{ background: 'var(--ink)', color: 'var(--surface)', minHeight: '100vh' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px clamp(20px,5vw,48px)', borderBottom: '1px solid var(--line)' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--surface)', textDecoration: 'none', fontWeight: 700 }}>
          <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--alive)', boxShadow: '0 0 12px rgba(182,255,60,.7)' }} /> OIAS Earth
        </Link>
        <Link to="/map" style={{ color: 'var(--alive)', textDecoration: 'none', fontSize: 14 }}>Live map →</Link>
      </nav>

      <div style={{ maxWidth: 980, margin: '0 auto', padding: 'clamp(28px,5vw,56px) clamp(20px,5vw,48px)' }}>
        <div className="mono" style={{ color: 'var(--amber)', fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 14 }}>Data integrity audit · PNB forest</div>
        <h1 className="serif" style={{ fontWeight: 600, fontSize: 'clamp(30px,5vw,52px)', lineHeight: 1.05, margin: 0 }}>
          What the numbers actually say
        </h1>
        <p style={{ color: '#aebcb9', marginTop: 12, fontSize: 16, maxWidth: '68ch', lineHeight: 1.6 }}>
          We took the real PNB export of <strong>10,800 trees</strong> (2026-05-18) and held it to a verification-first standard.
          The trees are real. The reporting is not. Here is the gap — and what closing it looks like.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14, marginTop: 28 }}>
          <Stat v="312×" l="carbon overstatement" c="#f0792b" />
          <Stat v="0" l="trees ever marked lost" c="#f0792b" />
          <Stat v="~6 / m²" l="claimed tree density" c="#f0792b" />
          <Stat v="2.2 t" l="defensible net CO₂e" c="var(--alive)" />
        </div>

        <h2 className="serif" style={{ fontWeight: 600, fontSize: 24, margin: '40px 0 6px' }}>Reported vs verified</h2>
        <div style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: 14, marginTop: 14 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', background: 'var(--ink-2)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#9fb0ad', width: '22%' }}></th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: '#f0792b' }}>As reported (legacy)</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--alive)' }}>Verified methodology</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.label} style={{ borderTop: '1px solid var(--line)', verticalAlign: 'top' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600 }}>{r.label}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <div className="mono" style={{ color: '#f0792b', fontSize: 15 }}>{r.reported}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div className="mono" style={{ color: 'var(--alive)', fontSize: 15 }}>{r.ours}</div>
                    {r.note && <div style={{ color: '#9fb0ad', fontSize: 12.5, marginTop: 6, lineHeight: 1.55, maxWidth: '52ch' }}>{r.note}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ background: 'rgba(182,255,60,.06)', border: '1px solid rgba(182,255,60,.3)', borderRadius: 14, padding: 22, marginTop: 32 }}>
          <h3 className="serif" style={{ fontWeight: 600, fontSize: 20, margin: '0 0 8px' }}>Why this wins trust</h3>
          <p style={{ color: '#cdd', fontSize: 15, lineHeight: 1.65, margin: 0 }}>
            A bank's ESG report cannot rest on a number that is 312× too high and a survival rate that is never checked.
            The moment an auditor or journalist measures one tree, the claim collapses. Our platform reports less —
            and that is the point: every figure survives scrutiny, dead trees are shown, and the ledger is anchored so
            nobody (including us) can quietly edit history. <strong>Smaller, true numbers are worth more than big, fragile ones.</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 28 }}>
          <Link to="/portal/18a5c4d4-6bda-4fe7-bf39-4fc2d12b79e7?forest=9f6684c0-59ef-4fdb-ab34-0101178d3e43" style={{ background: 'var(--alive)', color: '#16282e', textDecoration: 'none', padding: '11px 20px', borderRadius: 999, fontWeight: 700, fontSize: 14 }}>
            See the PNB forest in our portal →
          </Link>
          <Link to="/map" style={{ background: 'transparent', color: 'var(--surface)', textDecoration: 'none', padding: '11px 20px', borderRadius: 999, fontWeight: 600, fontSize: 14, border: '1px solid var(--line)' }}>
            Explore the live map →
          </Link>
        </div>

        <p className="mono" style={{ fontSize: 11, color: '#7a8b91', marginTop: 26, lineHeight: 1.6, maxWidth: '74ch' }}>
          Source: PNB "Download Data" export, 2026-05-18 (10,800 trees, forest PNBPNB36). Reported carbon = sum of the export's
          Carbon Offset column. Verified carbon = Chave-2014 allometry on the export's own height/diameter, net of 18% buffer +
          10% uncertainty. We do not claim our 2.2 t is the true sequestration — it is what the legacy measurements support;
          true figures require field re-measurement, which is exactly what this platform captures going forward.
        </p>
      </div>
    </div>
  );
}
