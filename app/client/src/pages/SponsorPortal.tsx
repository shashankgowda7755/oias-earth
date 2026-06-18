/**
 * SponsorPortal (/portal/:id) — our answer to the incumbent's corporate portal.
 * Forest selector → honest per-forest stat tiles (alive / drying / damaged /
 * dead / species / tCO2e) → a searchable, paginated, health-coloured tree
 * register with a per-tree life-record link → tree-level CSV download.
 *
 * Public + shareable (no login) and scientifically honest: carbon is labelled
 * "estimated / verification-ready removal", never an issued credit; survival is
 * computed from real monitored status, dead trees shown openly.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { fetchSponsor, fetchForestTrees, type SponsorSite, type PublicTree } from '@/lib/publicApi';
import '@/styles/earth.css';

const BUFFER = 0.18;
const UNCERTAINTY = 0.1;
const NET = (grossKg: number) => grossKg * (1 - BUFFER) * (1 - UNCERTAINTY);

const STATUS_COLOR: Record<number, string> = { 1: '#b6ff3c', 2: '#e8a33d', 3: '#f0792b', 4: '#6b7b82' };
const STATUS_LABEL: Record<number, string> = { 1: 'Healthy', 2: 'Drying', 3: 'Damaged', 4: 'Dead' };

const PAGE = 10;
const fmtDate = (v: string | null | undefined): string => (v ? String(v).slice(0, 10) : '—');

export default function SponsorPortal() {
  const { id = '' } = useParams();
  const [sp, setParams] = useSearchParams();
  const [d, setD] = useState<SponsorSite | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [forestId, setForestId] = useState<string>('');
  const [trees, setTrees] = useState<PublicTree[] | null>(null);
  const [treeErr, setTreeErr] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchSponsor(id).then(setD).catch((e) => setErr(e instanceof Error ? e.message : 'Failed'));
  }, [id]);

  // Default the selected forest (URL ?forest= wins, else first with trees).
  useEffect(() => {
    if (!d) return;
    const fromUrl = sp.get('forest');
    const valid = d.forests.find((f) => f.id === fromUrl);
    const first = d.forests.find((f) => f.total_trees > 0) ?? d.forests[0];
    setForestId(valid?.id ?? first?.id ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d]);

  useEffect(() => {
    if (!forestId) return;
    setTrees(null);
    setTreeErr(null);
    setQ('');
    setPage(1);
    fetchForestTrees(forestId)
      .then(setTrees)
      .catch((e) => setTreeErr(e instanceof Error ? e.message : 'Failed to load trees'));
  }, [forestId]);

  const selectForest = (fid: string) => {
    setForestId(fid);
    setParams((p) => { p.set('forest', fid); return p; }, { replace: true });
  };

  const stats = useMemo(() => {
    if (!trees) return null;
    const by = { 1: 0, 2: 0, 3: 0, 4: 0 } as Record<number, number>;
    const species = new Set<string>();
    let grossKg = 0;
    let hSum = 0, hN = 0;
    for (const t of trees) {
      const s = t.status_id ?? 1;
      by[s] = (by[s] ?? 0) + 1;
      if (t.species) species.add(t.species);
      if (s !== 4 && t.co2e_kg != null) grossKg += t.co2e_kg;
      if (t.height != null) { hSum += t.height; hN++; }
    }
    const alive = trees.length - (by[4] ?? 0);
    return {
      total: trees.length,
      alive,
      drying: by[2] ?? 0,
      damaged: by[3] ?? 0,
      dead: by[4] ?? 0,
      species: species.size,
      avgHeight: hN ? Math.round((hSum / hN) * 10) / 10 : null,
      survival_pct: trees.length ? Math.round((alive / trees.length) * 1000) / 10 : null,
      net_tco2e: Math.round((NET(grossKg) / 1000) * 1000) / 1000,
    };
  }, [trees]);

  const filtered = useMemo(() => {
    if (!trees) return [];
    const term = q.trim().toLowerCase();
    if (!term) return trees;
    return trees.filter((t) =>
      [t.tree_unique_id, t.pet_name, t.species, t.status ?? STATUS_LABEL[t.status_id ?? 1]].some((v) =>
        v?.toLowerCase().includes(term),
      ),
    );
  }, [trees, q]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE));
  const pageRows = filtered.slice((page - 1) * PAGE, page * PAGE);

  function downloadCsv() {
    if (!trees) return;
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const head = 'tree_id,pet_name,species,status,height_m,dbh_cm,co2e_kg,last_seen,lat,lng';
    const lines = trees.map((t) =>
      [t.tree_unique_id, t.pet_name, t.species, t.status ?? STATUS_LABEL[t.status_id ?? 1],
       t.height, t.dbh, t.status_id === 4 ? '' : t.co2e_kg, fmtDate(t.last_seen), t.lat, t.lng].map(esc).join(','),
    );
    const blob = new Blob([[head, ...lines].join('\n') + '\n'], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const fname = (d?.forests.find((f) => f.id === forestId)?.unique_id || 'forest') + '-trees.csv';
    a.href = url; a.download = fname; a.click();
    URL.revokeObjectURL(url);
  }

  const shell = (children: React.ReactNode) => (
    <div className="earth" style={{ background: 'var(--ink)', color: 'var(--surface)', minHeight: '100vh' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px clamp(20px,5vw,48px)', borderBottom: '1px solid var(--line)' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--surface)', textDecoration: 'none', fontWeight: 700 }}>
          <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--alive)', boxShadow: '0 0 12px rgba(182,255,60,.7)' }} /> Be The Tree Hugger
        </Link>
        <div style={{ display: 'flex', gap: 18 }}>
          <Link to={`/sponsor/${id}`} style={{ color: '#9fb0ad', textDecoration: 'none', fontSize: 14 }}>CSR microsite</Link>
          <Link to="/map" style={{ color: 'var(--alive)', textDecoration: 'none', fontSize: 14 }}>Live map →</Link>
        </div>
      </nav>
      {children}
    </div>
  );

  if (err) return shell(<p style={{ padding: 48, color: 'var(--amber)' }}>{err}</p>);
  if (!d) return shell(<p style={{ padding: 48, color: '#9fb0ad' }}>Loading…</p>);

  const { sponsor, forests } = d;
  const inp = { background: 'var(--ink-2)', border: '1px solid var(--line)', color: 'var(--surface)', borderRadius: 8, padding: '8px 12px', fontSize: 14 } as const;

  const tiles = stats
    ? [
        { v: stats.total.toLocaleString(), l: 'trees', c: 'var(--surface)' },
        { v: stats.alive.toLocaleString(), l: 'alive', c: 'var(--alive)' },
        { v: String(stats.drying), l: 'drying', c: '#e8a33d' },
        { v: String(stats.damaged), l: 'damaged', c: '#f0792b' },
        { v: String(stats.dead), l: 'dead', c: '#9fb0ad' },
        { v: String(stats.species), l: 'species', c: 'var(--surface)' },
        { v: stats.survival_pct != null ? `${stats.survival_pct}%` : '—', l: 'survival', c: 'var(--alive)' },
        { v: stats.net_tco2e.toLocaleString(), l: 'tCO₂e (this forest, net est.)', c: 'var(--alive)' },
      ]
    : [];

  return shell(
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(24px,4vw,48px) clamp(20px,5vw,48px)' }}>
      <div className="mono" style={{ color: 'var(--alive)', fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 14 }}>Sponsor portal · live</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        {sponsor.logo && <img src={sponsor.logo} alt={sponsor.name ?? ''} style={{ width: 56, height: 56, borderRadius: 12, background: '#fff', objectFit: 'contain', padding: 6 }} />}
        <div>
          <h1 className="serif" style={{ fontWeight: 600, fontSize: 'clamp(24px,4vw,38px)', margin: 0, lineHeight: 1.05 }}>{sponsor.name}</h1>
          <p style={{ color: '#aebcb9', marginTop: 4, fontSize: 14 }}>{[sponsor.industry, sponsor.headquarters].filter(Boolean).join(' · ') || 'Sponsoring living proof'}</p>
        </div>
      </div>

      {/* Forest selector */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '24px 0 8px' }}>
        {forests.map((f) => (
          <button key={f.id} onClick={() => selectForest(f.id)}
            style={{
              padding: '8px 14px', borderRadius: 999, cursor: 'pointer', fontSize: 13,
              border: '1px solid ' + (forestId === f.id ? 'var(--alive)' : 'var(--line)'),
              background: forestId === f.id ? 'rgba(182,255,60,.1)' : 'transparent',
              color: forestId === f.id ? 'var(--alive)' : 'var(--surface)',
            }}>
            {f.name ?? f.unique_id} <span style={{ color: '#9fb0ad' }}>· {f.total_trees}</span>
          </button>
        ))}
      </div>

      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 12, marginTop: 18 }}>
        {tiles.map((s) => (
          <div key={s.l} style={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 16px' }}>
            <div className="mono" style={{ fontSize: 22, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 10.5, color: '#9fb0ad', textTransform: 'uppercase', letterSpacing: '.07em', marginTop: 6 }}>{s.l}</div>
          </div>
        ))}
        {!stats && <p style={{ color: '#9fb0ad', fontSize: 14 }}>Loading forest…</p>}
      </div>

      {/* Trees register */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '30px 0 14px' }}>
        <h2 className="serif" style={{ fontWeight: 600, fontSize: 22, margin: 0 }}>Tree register</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search id, pet name, species…" style={{ ...inp, minWidth: 220 }} />
          <button onClick={downloadCsv} disabled={!trees || trees.length === 0}
            style={{ background: 'var(--alive)', color: '#16282e', border: 'none', borderRadius: 999, padding: '8px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: trees && trees.length ? 1 : 0.5 }}>
            Download Data ↓
          </button>
        </div>
      </div>

      {treeErr ? (
        <p style={{ color: 'var(--amber)' }}>{treeErr}</p>
      ) : !trees ? (
        <p style={{ color: '#9fb0ad' }}>Loading trees…</p>
      ) : trees.length === 0 ? (
        <p style={{ color: '#9fb0ad' }}>No geo-tagged trees in this forest yet.</p>
      ) : (
        <>
          <div style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#9fb0ad', background: 'var(--ink-2)' }}>
                  {['Tree', 'Pet name', 'Species', 'Status', 'Height', '⌀', 'CO₂e', 'Last seen', ''].map((h) => (
                    <th key={h} style={{ padding: '10px 12px', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((t) => {
                  const sid = t.status_id ?? 1;
                  return (
                    <tr key={t.id} style={{ borderTop: '1px solid var(--line)' }}>
                      <td className="mono" style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{t.tree_unique_id}</td>
                      <td style={{ padding: '10px 12px', color: '#cdd' }}>{t.pet_name || '—'}</td>
                      <td style={{ padding: '10px 12px', color: '#cdd', whiteSpace: 'nowrap' }}>{t.species || '—'}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: STATUS_COLOR[sid] }}>
                          <span style={{ width: 9, height: 9, borderRadius: '50%', background: STATUS_COLOR[sid], boxShadow: sid === 1 ? '0 0 6px rgba(182,255,60,.8)' : 'none' }} />
                          {t.status ?? STATUS_LABEL[sid]}
                        </span>
                      </td>
                      <td className="mono" style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{t.height != null ? `${t.height} m` : '—'}</td>
                      <td className="mono" style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{t.dbh != null ? `${t.dbh} cm` : '—'}</td>
                      <td className="mono" style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: 'var(--alive)' }}>{sid !== 4 && t.co2e_kg != null ? `${t.co2e_kg} kg` : '—'}</td>
                      <td className="mono" style={{ padding: '10px 12px', color: '#9fb0ad', whiteSpace: 'nowrap' }}>{fmtDate(t.last_seen)}</td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        <Link to={`/tree/${t.id}`} style={{ color: 'var(--alive)', textDecoration: 'none', fontWeight: 600 }}>View →</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, fontSize: 13, color: '#9fb0ad' }}>
            <span>{filtered.length.toLocaleString()} trees{q ? ' (filtered)' : ''}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                style={{ background: 'transparent', border: '1px solid var(--line)', color: 'var(--surface)', borderRadius: 8, padding: '4px 10px', cursor: page <= 1 ? 'default' : 'pointer', opacity: page <= 1 ? 0.4 : 1 }}>‹ Prev</button>
              <span className="mono">{page} / {pageCount}</span>
              <button onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page >= pageCount}
                style={{ background: 'transparent', border: '1px solid var(--line)', color: 'var(--surface)', borderRadius: 8, padding: '4px 10px', cursor: page >= pageCount ? 'default' : 'pointer', opacity: page >= pageCount ? 0.4 : 1 }}>Next ›</button>
            </div>
          </div>
        </>
      )}

      <p className="mono" style={{ fontSize: 11, color: '#7a8b91', marginTop: 20 }}>
        CO₂e = estimated / verification-ready removal (Chave-2014 allometry, net of 18% buffer + 10% uncertainty) — not an issued credit.
      </p>
    </div>,
  );
}
