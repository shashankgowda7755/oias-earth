/**
 * ReportTree (/report/tree/:id) — a printable per-tree certificate (the B2C /
 * gifting + proof artifact). Light, framed, with the tree's id, species,
 * location, planted date, latest measurement, carbon + oxygen, survival, a
 * photo if one exists, and a QR back to the live proof page. Download PDF =
 * browser print.
 */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { fetchTreeProof, type TreeProof as TP } from '@/lib/publicApi';

const PRINT_CSS = `@media print { .no-print { display:none !important; } body { background:#fff !important; } @page { margin: 14mm; } }`;

export default function ReportTree() {
  const { id = '' } = useParams();
  const [d, setD] = useState<TP | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => { fetchTreeProof(id).then(setD).catch((e) => setErr(e instanceof Error ? e.message : 'Failed')); }, [id]);
  useEffect(() => {
    QRCode.toDataURL(`${window.location.origin}/tree/${id}`, { margin: 1, width: 240, color: { dark: '#16282e', light: '#ffffff' } })
      .then(setQr).catch(() => setQr(null));
  }, [id]);

  const ink = '#16282e', pine = '#1d6b3f', muted = '#5a6b72', line = '#d8e0da';
  if (err) return <div style={{ padding: 48, fontFamily: 'system-ui' }}>{err}</div>;
  if (!d) return <div style={{ padding: 48, fontFamily: 'system-ui', color: muted }}>Loading certificate…</div>;

  const { tree, summary, visits } = d;
  const photo = [...visits].reverse().map((v) => v.photos?.[0]).find(Boolean) || null;
  const fmt = (s: string | null) => (s ? new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
  const o2 = summary.oxygen_kg ?? null;

  const row = (k: string, v: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${line}`, fontSize: 13 }}>
      <span style={{ color: muted }}>{k}</span><span style={{ fontWeight: 600 }}>{v}</span>
    </div>
  );

  return (
    <div style={{ background: '#f4f6f4', color: ink, minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", padding: 'clamp(16px,4vw,40px)' }}>
      <style>{PRINT_CSS}</style>
      <div className="no-print" style={{ maxWidth: 720, margin: '0 auto 14px', textAlign: 'right' }}>
        <button onClick={() => window.print()} style={{ background: pine, color: '#fff', border: 'none', borderRadius: 999, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>↓ Download certificate (PDF)</button>
      </div>
      <div style={{ maxWidth: 720, margin: '0 auto', background: '#fff', border: `2px solid ${pine}`, borderRadius: 16, padding: 'clamp(20px,4vw,36px)' }}>
        <div style={{ textAlign: 'center', borderBottom: `1px solid ${line}`, paddingBottom: 14 }}>
          <div style={{ fontSize: 12, letterSpacing: '.18em', textTransform: 'uppercase', color: pine, fontWeight: 700 }}>Certificate of Living Proof</div>
          <h1 style={{ fontSize: 30, margin: '6px 0 0', fontWeight: 700 }}>{tree.species ?? 'Tree'}</h1>
          <div style={{ color: muted, fontSize: 14 }}>{tree.tree_unique_id}</div>
          {tree.gifted_to && <div style={{ marginTop: 10, fontSize: 16 }}>Planted for <strong style={{ color: pine }}>{tree.gifted_to}</strong></div>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: photo || qr ? '1fr 200px' : '1fr', gap: 22, marginTop: 18 }}>
          <div>
            {row('Forest', tree.forest_name ?? '—')}
            {row('Location', [tree.city, tree.state].filter(Boolean).join(', ') || '—')}
            {row('Planted on', fmt(tree.planted_on))}
            {row('Status', summary.survival === 'dead' ? 'Lost' : summary.latest_status ?? 'Alive')}
            {row('Current height', summary.latest_height != null ? `${summary.latest_height} m` : '—')}
            {row('Monitoring visits', String(summary.visit_count))}
            {row('CO₂e sequestered (est.)', summary.co2e_kg != null ? `${summary.co2e_kg} kg` : '—')}
            {row('Oxygen generated (est.)', o2 != null ? `${o2} kg` : '—')}
          </div>
          <div style={{ textAlign: 'center' }}>
            {photo && <img src={photo} alt="" style={{ width: '100%', borderRadius: 10, marginBottom: 10, objectFit: 'cover', maxHeight: 150 }} />}
            {qr && <img src={qr} alt="QR to live record" style={{ width: 130, height: 130 }} />}
            <div style={{ fontSize: 10.5, color: muted, marginTop: 4 }}>Scan to verify live</div>
          </div>
        </div>

        <div style={{ marginTop: 18, paddingTop: 12, borderTop: `1px solid ${line}`, fontSize: 10.5, color: muted, lineHeight: 1.6 }}>
          Carbon via Chave-2014 allometry (per-species wood density, +roots, ×0.47 C, ×3.667 CO₂); oxygen ≈ 0.73 × CO₂e.
          Estimated, verification-ready removal — not an issued carbon credit. Verified at {typeof window !== 'undefined' ? window.location.origin : ''}/tree/{tree.tree_unique_id ?? ''}.
        </div>
      </div>
    </div>
  );
}
