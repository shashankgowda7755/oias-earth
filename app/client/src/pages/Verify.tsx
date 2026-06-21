/**
 * Verify (/verify) — public proof registry search. Anyone can paste a tree ID,
 * tree code (e.g. AA1), QR link, or forest name and land on its live record.
 * The open, browsable verification surface from the dMRV landscape brief.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { lookup } from '@/lib/publicApi';
import '@/styles/earth.css';

export default function Verify() {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function go() {
    let term = q.trim();
    if (!term) return;
    // Accept a pasted /tree/<id> URL too.
    const m = term.match(/\/tree\/([0-9a-f-]{36})/i);
    if (m) {
      nav(`/tree/${m[1]}`);
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const r = await lookup(term);
      if (!r) {
        setMsg(`No record found for "${term}".`);
      } else if (r.type === 'tree') {
        nav(`/tree/${r.id}`);
      } else {
        nav('/map');
      }
    } catch {
      setMsg('Lookup failed — try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="earth" style={{ background: 'var(--ink)', color: 'var(--surface)', minHeight: '100vh' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px clamp(20px,5vw,48px)', borderBottom: '1px solid var(--line)' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--surface)', textDecoration: 'none', fontWeight: 700 }}>
          <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--alive)', boxShadow: '0 0 12px rgba(182,255,60,.7)' }} /> OIAS Earth
        </Link>
        <Link to="/map" style={{ color: 'var(--alive)', textDecoration: 'none', fontSize: 14 }}>Live map →</Link>
      </nav>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: 'clamp(40px,8vh,90px) clamp(20px,5vw,48px)' }}>
        <div className="mono" style={{ color: 'var(--alive)', fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 14 }}>Verify · public registry</div>
        <h1 className="serif" style={{ fontWeight: 600, fontSize: 'clamp(30px,5vw,48px)', lineHeight: 1.05, margin: '0 0 14px' }}>
          Check any tree or forest.
        </h1>
        <p style={{ color: '#aebcb9', fontSize: 16, lineHeight: 1.6, marginBottom: 24 }}>
          Paste a tree code (e.g. <span className="mono" style={{ color: 'var(--alive)' }}>AA1</span>), a tree ID, a QR link, or a forest name. No login — anyone can audit the record.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && go()}
            placeholder="Tree code, ID, QR link, or forest name…"
            autoFocus
            style={{ flex: 1, minWidth: 220, padding: '13px 14px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--ink-2)', color: 'var(--surface)', fontSize: 15 }}
          />
          <button onClick={go} disabled={busy || !q.trim()}
            style={{ background: 'var(--alive)', color: '#16282e', border: 'none', borderRadius: 10, padding: '13px 24px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
            {busy ? 'Checking…' : 'Verify'}
          </button>
        </div>
        {msg && <p style={{ color: 'var(--amber)', fontSize: 14, marginTop: 14 }}>{msg}</p>}
        <p className="mono" style={{ fontSize: 12, color: '#9fb0ad', marginTop: 28 }}>
          try: <button onClick={() => { setQ('AA1'); }} style={{ background: 'none', border: 'none', color: 'var(--alive)', cursor: 'pointer', font: 'inherit', padding: 0 }}>AA1</button>
        </p>
      </div>
    </div>
  );
}
