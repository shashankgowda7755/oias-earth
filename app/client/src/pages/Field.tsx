/**
 * Field (/field) — the installable, offline-first capture PWA for planters.
 *
 * Flow: login (planter) → pick a forest → pick a tree → capture (GPS + photo +
 * status/height) → Save. Online: posts immediately. Offline: stored in an
 * IndexedDB queue (photo as a Blob) and auto-synced when signal returns.
 * Forest/tree lists are cached so the app is usable with no connectivity.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { clearSession } from '@/lib/auth-storage';
import {
  fetchMyForests,
  fetchTrees,
  submitVisit,
  type FieldForest,
  type FieldTree,
} from '@/field/fieldApi';
import {
  cacheForests,
  cacheTrees,
  enqueue,
  getCachedForests,
  getCachedTrees,
  getQueue,
  removeFromQueue,
  type PendingCapture,
} from '@/field/queue';
import '@/styles/earth.css';

const STATUSES = [
  { id: 1, label: 'Healthy' },
  { id: 2, label: 'Drying' },
  { id: 3, label: 'Damaged' },
  { id: 4, label: 'Dead' },
];

function today(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const card: React.CSSProperties = {
  background: 'var(--ink-2)',
  border: '1px solid var(--line)',
  borderRadius: 14,
  padding: 16,
};

export default function Field() {
  const { isAuthenticated, role, signIn } = useAuth();
  const [online, setOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  // login
  const [u, setU] = useState('');
  const [pw, setPw] = useState('');
  const [authErr, setAuthErr] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);

  // navigation
  const [forests, setForests] = useState<FieldForest[]>([]);
  const [forest, setForest] = useState<FieldForest | null>(null);
  const [trees, setTrees] = useState<FieldTree[]>([]);
  const [tree, setTree] = useState<FieldTree | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // capture
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [status, setStatus] = useState(1);
  const [height, setHeight] = useState('');
  const [dia, setDia] = useState('');
  const [date, setDate] = useState(today());
  const [saving, setSaving] = useState(false);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2600);
  };
  const refreshPending = useCallback(async () => setPending((await getQueue()).length), []);

  const flush = useCallback(async () => {
    if (!navigator.onLine) return;
    const q = await getQueue();
    for (const c of q) {
      try {
        const h = c.height != null ? Number(c.height) : undefined;
        const d = c.diameter != null ? Number(c.diameter) : undefined;
        await submitVisit(
          c.forestId,
          c.treeId,
          {
            timeline_date: c.timeline_date,
            status_id: c.status_id,
            height: h != null && Number.isFinite(h) ? h : undefined,
            diameter: d != null && Number.isFinite(d) ? d : undefined,
            lat: c.lat,
            lng: c.lng,
          },
          c.photo,
        );
        await removeFromQueue(c.localId);
      } catch {
        break; // stop on first failure; retry later
      }
    }
    await refreshPending();
  }, [refreshPending]);

  useEffect(() => {
    const on = () => { setOnline(true); void flush(); };
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    void refreshPending();
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, [flush, refreshPending]);

  // Load forests when authenticated.
  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    (navigator.onLine ? fetchMyForests().then((f) => { void cacheForests(f); return f; }) : getCachedForests<FieldForest>())
      .then(setForests)
      .catch(() => getCachedForests<FieldForest>().then(setForests))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const openForest = useCallback(async (f: FieldForest) => {
    setForest(f);
    setTree(null);
    setSearch('');
    setLoading(true);
    try {
      const t = navigator.onLine
        ? await fetchTrees(f.id).then((x) => { void cacheTrees(f.id, x); return x; })
        : await getCachedTrees<FieldTree>(f.id);
      setTrees(t);
    } catch {
      setTrees(await getCachedTrees<FieldTree>(f.id));
    } finally {
      setLoading(false);
    }
  }, []);

  const openTree = (t: FieldTree) => {
    setTree(t);
    setGps(null);
    setPhoto(null);
    setStatus(1);
    setHeight('');
    setDia('');
    setDate(today());
  };

  const captureGps = () => {
    if (!navigator.geolocation) { flash('No GPS on this device'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setGps({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocating(false); flash('Location captured'); },
      (e) => { setLocating(false); flash(`GPS failed: ${e.message}`); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const filteredTrees = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return trees;
    return trees.filter((t) => [t.tree_unique_id, t.plant_species, t.species_common_name].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)));
  }, [trees, search]);

  const doLogin = async () => {
    setSigning(true);
    setAuthErr(null);
    try {
      await signIn(u.trim(), pw);
    } catch (e) {
      setAuthErr(e instanceof Error ? e.message : 'Sign in failed');
    } finally {
      setSigning(false);
    }
  };

  const save = async () => {
    if (!forest || !tree) return;
    const heightNum = height.trim() === '' ? undefined : Number(height);
    const diaNum = dia.trim() === '' ? undefined : Number(dia);
    if (heightNum != null && !Number.isFinite(heightNum)) { flash('Height must be a number'); return; }
    if (diaNum != null && !Number.isFinite(diaNum)) { flash('Diameter must be a number'); return; }
    setSaving(true);
    const payload = {
      timeline_date: date,
      status_id: status,
      height: heightNum,
      diameter: diaNum,
      lat: gps?.lat,
      lng: gps?.lng,
    };
    try {
      if (navigator.onLine) {
        await submitVisit(forest.id, tree.id, payload, photo ?? undefined);
        flash(`Saved ${tree.tree_unique_id ?? 'tree'}`);
      } else {
        throw new Error('offline');
      }
    } catch {
      const cap: PendingCapture = {
        localId: crypto.randomUUID(),
        forestId: forest.id,
        treeId: tree.id,
        treeLabel: tree.tree_unique_id ?? 'tree',
        timeline_date: date,
        status_id: status,
        height: heightNum != null ? String(heightNum) : undefined,
        diameter: diaNum != null ? String(diaNum) : undefined,
        lat: gps?.lat,
        lng: gps?.lng,
        photo: photo ?? undefined,
        createdAt: Date.now(),
      };
      await enqueue(cap);
      await refreshPending();
      flash('Saved offline — will sync');
    } finally {
      setSaving(false);
      setTree(null);
    }
  };

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="earth" style={{ background: 'var(--ink)', color: 'var(--surface)', minHeight: '100vh', maxWidth: 560, margin: '0 auto' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'var(--ink-2)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontWeight: 700, fontSize: 15 }}>
          <span style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--alive)', boxShadow: '0 0 10px rgba(182,255,60,.7)' }} /> Field Capture
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="mono" style={{ fontSize: 11, color: online ? 'var(--alive)' : 'var(--amber)' }}>{online ? '● online' : '○ offline'}</span>
          {pending > 0 && (
            <button onClick={() => void flush()} style={{ background: 'var(--amber)', color: '#16282e', border: 'none', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 700 }}>
              sync {pending}
            </button>
          )}
        </div>
      </header>
      <div style={{ padding: 18 }}>{children}</div>
      {toast && (
        <div className="mono" style={{ position: 'fixed', bottom: 18, left: '50%', transform: 'translateX(-50%)', background: 'var(--alive)', color: '#16282e', padding: '10px 18px', borderRadius: 999, fontWeight: 700, fontSize: 13, zIndex: 50 }}>{toast}</div>
      )}
    </div>
  );

  // ---- Login ----
  if (!isAuthenticated) {
    return (
      <Shell>
        <h1 className="serif" style={{ fontWeight: 600, fontSize: 28, margin: '12px 0 6px' }}>Planter sign in</h1>
        <p style={{ color: '#9fb0ad', fontSize: 14, marginBottom: 20 }}>Sign in to capture trees in your assigned forests.</p>
        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input value={u} onChange={(e) => setU(e.target.value)} placeholder="Username" autoCapitalize="none" style={inp} />
          <input value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password" type="password" style={inp} />
          {authErr && <div style={{ color: 'var(--amber)', fontSize: 13 }}>{authErr}</div>}
          <button onClick={() => void doLogin()} disabled={signing || !u || !pw} style={primaryBtn}>{signing ? 'Signing in…' : 'Sign in'}</button>
        </div>
      </Shell>
    );
  }

  // ---- Capture ----
  if (forest && tree) {
    return (
      <Shell>
        <button onClick={() => setTree(null)} style={backBtn}>← {forest.name}</button>
        <h1 className="serif" style={{ fontWeight: 600, fontSize: 26, margin: '8px 0 2px' }}>{tree.tree_unique_id ?? 'Tree'}</h1>
        <p style={{ color: '#9fb0ad', fontSize: 13, marginBottom: 16 }}>{tree.species_common_name ?? tree.plant_species ?? 'tree'}</p>
        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <button onClick={captureGps} disabled={locating} style={{ ...primaryBtn, background: gps ? 'var(--pine)' : 'var(--alive)', color: gps ? 'var(--surface)' : '#16282e' }}>
            {locating ? 'Locating…' : gps ? `📍 ${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)} (retake)` : '📍 Capture GPS'}
          </button>
          <label style={lbl}>Photo
            <input type="file" accept="image/*" capture="environment" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} style={{ marginTop: 6, color: 'var(--surface)', fontSize: 13 }} />
          </label>
          {photo && <div className="mono" style={{ fontSize: 11, color: 'var(--alive)' }}>✓ photo attached</div>}
          <label style={lbl}>Status
            <select value={status} onChange={(e) => setStatus(Number(e.target.value))} style={inp}>
              {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
          <div style={{ display: 'flex', gap: 12 }}>
            <label style={{ ...lbl, flex: 1 }}>Height (m)<input value={height} onChange={(e) => setHeight(e.target.value)} inputMode="decimal" placeholder="2.4" style={inp} /></label>
            <label style={{ ...lbl, flex: 1 }}>⌀ (cm)<input value={dia} onChange={(e) => setDia(e.target.value)} inputMode="decimal" placeholder="4" style={inp} /></label>
          </div>
          <label style={lbl}>Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inp} /></label>
          <button onClick={() => void save()} disabled={saving} style={primaryBtn}>{saving ? 'Saving…' : online ? 'Save capture' : 'Save offline'}</button>
        </div>
      </Shell>
    );
  }

  // ---- Trees ----
  if (forest) {
    return (
      <Shell>
        <button onClick={() => setForest(null)} style={backBtn}>← Forests</button>
        <h1 className="serif" style={{ fontWeight: 600, fontSize: 24, margin: '8px 0 12px' }}>{forest.name}</h1>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search trees…" style={{ ...inp, marginBottom: 12 }} />
        {loading ? <p style={{ color: '#9fb0ad' }}>Loading…</p> : filteredTrees.length === 0 ? (
          <p style={{ color: '#9fb0ad', fontSize: 14 }}>No trees{!online ? ' cached offline' : ''} for this forest.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredTrees.map((t) => {
              const tagged = t.lat != null && t.lat !== '' && t.lng != null && t.lng !== '';
              return (
                <button key={t.id} onClick={() => openTree(t)} style={{ ...card, display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', cursor: 'pointer', color: 'var(--surface)' }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: tagged ? 'var(--alive)' : 'var(--slate)' }} />
                  <span style={{ flex: 1, fontWeight: 600, fontSize: 15 }}>{t.tree_unique_id ?? 'Tree'}</span>
                  <span style={{ fontSize: 12, color: '#9fb0ad' }}>{t.species_common_name ?? t.plant_species ?? ''}</span>
                </button>
              );
            })}
          </div>
        )}
      </Shell>
    );
  }

  // ---- Forests ----
  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 className="serif" style={{ fontWeight: 600, fontSize: 24, margin: '8px 0 4px' }}>Your forests</h1>
        <button onClick={() => { clearSession(); window.location.reload(); }} style={{ ...backBtn, marginBottom: 0 }}>Sign out</button>
      </div>
      <p className="mono" style={{ color: '#9fb0ad', fontSize: 11, marginBottom: 16 }}>{role ?? 'user'}</p>
      {loading ? <p style={{ color: '#9fb0ad' }}>Loading…</p> : forests.length === 0 ? (
        <p style={{ color: '#9fb0ad', fontSize: 14 }}>No forests assigned{!online ? ' (offline, none cached)' : ''}.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {forests.map((f) => (
            <button key={f.id} onClick={() => void openForest(f)} style={{ ...card, textAlign: 'left', cursor: 'pointer', color: 'var(--surface)' }}>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{f.name}</div>
              <div style={{ fontSize: 12, color: '#9fb0ad' }}>{[f.city, f.state].filter(Boolean).join(', ') || '—'}</div>
              <div className="mono" style={{ fontSize: 12, color: 'var(--alive)', marginTop: 4 }}>{f.tagged_trees} / {f.total_trees} tagged</div>
            </button>
          ))}
        </div>
      )}
    </Shell>
  );
}

const inp: React.CSSProperties = {
  width: '100%', padding: '11px 12px', borderRadius: 10, border: '1px solid var(--line)',
  background: 'var(--ink)', color: 'var(--surface)', fontSize: 15, fontFamily: 'inherit',
};
const lbl: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 0, fontSize: 12, color: '#9fb0ad' };
const primaryBtn: React.CSSProperties = {
  width: '100%', padding: '13px', borderRadius: 999, border: 'none', background: 'var(--alive)',
  color: '#16282e', fontWeight: 700, fontSize: 15, cursor: 'pointer',
};
const backBtn: React.CSSProperties = {
  background: 'none', border: 'none', color: 'var(--alive)', fontSize: 14, cursor: 'pointer',
  padding: 0, marginBottom: 8,
};
