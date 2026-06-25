/**
 * Logs — the audit trail. Every login (success + failed) and every data
 * mutation (forest/report/CRUD upsert/delete, boundary, report-data) captured
 * server-side, newest first. Read-only. POST /api/v1/audit/list.
 */
import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

interface AuditRow {
  id: number;
  ts: string;
  actorName: string | null;
  role: string | null;
  action: string;
  entity: string | null;
  targetId: string | null;
  method: string | null;
  path: string | null;
  status: number | null;
  ip: string | null;
}

function actionColor(a: string): string {
  if (a.includes('login_failed')) return '#f0792b';
  if (a.includes('login')) return '#b6ff3c';
  if (a.includes('delete')) return '#e8a33d';
  return '#9fb8c8';
}
function statusColor(s: number | null): string {
  if (s == null) return '#7f9b8a';
  if (s >= 500) return '#f0792b';
  if (s >= 400) return '#e8a33d';
  return '#b6ff3c';
}
function fmtTs(s: string): string {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function Logs() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('');

  useEffect(() => {
    let off = false;
    setLoading(true);
    setErr(null);
    const t = setTimeout(() => {
      api
        .post('/audit/list', { page: 1, limit: 200, search, ...(cat ? { category: cat } : {}) })
        .then((r) => { if (!off) setRows(((r.data?.data ?? r.data) as AuditRow[]) ?? []); })
        .catch((e) => { if (!off) setErr(e instanceof Error ? e.message : 'Failed to load logs'); })
        .finally(() => { if (!off) setLoading(false); });
    }, search ? 300 : 0);
    return () => { off = true; clearTimeout(t); };
  }, [search, cat]);

  const TABS: { key: string; label: string }[] = [
    { key: '', label: 'All' },
    { key: 'login', label: 'Logins' },
    { key: 'forest', label: 'Forest' },
    { key: 'report', label: 'Reports' },
    { key: 'download', label: 'Downloads' },
    { key: 'send', label: 'Sends' },
  ];

  const cell = useMemo(() => 'px-3 py-2 align-top whitespace-nowrap', []);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h1 className="text-xl font-medium text-textPrimary">Activity log</h1>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search actor / action / entity / IP…"
          className="w-72 rounded-input border border-border bg-transparent px-3 py-2 text-sm text-textPrimary placeholder:text-textSecondary focus:border-primary focus:outline-none"
        />
      </div>

      {/* Category views: All / Logins / Forest / Reports / Downloads / Sends */}
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setCat(t.key)}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${
              cat === t.key
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-textSecondary hover:bg-white/5'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {err ? (
        <div className="rounded-card border border-danger/40 p-4 text-sm text-danger">{err}</div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-label uppercase tracking-wide text-textSecondary">
                <th className={cell}>When</th>
                <th className={cell}>Actor</th>
                <th className={cell}>Action</th>
                <th className={cell}>Entity</th>
                <th className={cell}>Target</th>
                <th className={cell}>Status</th>
                <th className={cell}>IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className={cell} colSpan={7}>Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className={cell} colSpan={7}>No activity yet</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 text-textPrimary">
                    <td className={cell} style={{ color: '#9fb0ad' }}>{fmtTs(r.ts)}</td>
                    <td className={cell}>
                      {r.actorName ?? '—'}
                      {r.role ? <span className="ml-1 text-textSecondary">· {r.role}</span> : null}
                    </td>
                    <td className={cell}><span style={{ color: actionColor(r.action), fontWeight: 600 }}>{r.action}</span></td>
                    <td className={cell}>{r.entity ?? '—'}</td>
                    <td className={cell} style={{ fontFamily: 'monospace', color: '#8fae9e' }}>{r.targetId ? `${r.targetId.slice(0, 8)}…` : '—'}</td>
                    <td className={cell}><span style={{ color: statusColor(r.status) }}>{r.status ?? '—'}</span></td>
                    <td className={cell} style={{ fontFamily: 'monospace', color: '#7f9b8a' }}>{r.ip ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
