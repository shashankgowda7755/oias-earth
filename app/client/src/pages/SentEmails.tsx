/**
 * SentEmails — the "Sent" inbox. Every email sent (or attempted) through Resend,
 * newest first: report reports + tree gifts, with recipient, CC, status, and
 * whether a PDF was attached. Read-only. POST /api/v1/email-log/list.
 */
import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

interface EmailRow {
  id: number;
  ts: string;
  kind: string;
  templateKey: string | null;
  to: string;
  cc: string[];
  subject: string;
  status: string;
  messageId: string | null;
  error: string | null;
  attached: boolean;
  forestId: string | null;
  actor: string | null;
}

function kindColor(k: string): string {
  if (k === 'gift') return '#7fd0ff';
  return '#b6ff3c'; // report
}
function statusColor(s: string): string {
  return s === 'failed' ? '#f0792b' : '#b6ff3c';
}
function fmtTs(s: string): string {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

type Filter = { kind?: string; status?: string };

export default function SentEmails() {
  const [rows, setRows] = useState<EmailRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('');

  const TABS: { key: string; label: string; filter: Filter }[] = useMemo(() => [
    { key: '', label: 'All', filter: {} },
    { key: 'report', label: 'Reports', filter: { kind: 'report' } },
    { key: 'gift', label: 'Gifts', filter: { kind: 'gift' } },
    { key: 'failed', label: 'Failed', filter: { status: 'failed' } },
  ], []);

  useEffect(() => {
    let off = false;
    setLoading(true);
    setErr(null);
    const filter = TABS.find((t) => t.key === tab)?.filter ?? {};
    const t = setTimeout(() => {
      api
        .post('/email-log/list', { page: 1, limit: 200, search, ...filter })
        .then((r) => {
          if (off) return;
          // Guard against a non-array error body so rows.map can't crash.
          const body = r.data?.data ?? r.data;
          setRows(Array.isArray(body) ? (body as EmailRow[]) : []);
          setTotal(Number(r.data?.total ?? 0));
        })
        .catch((e) => { if (!off) setErr(e instanceof Error ? e.message : 'Failed to load sent emails'); })
        .finally(() => { if (!off) setLoading(false); });
    }, search ? 300 : 0);
    return () => { off = true; clearTimeout(t); };
  }, [search, tab, TABS]);

  const cell = 'px-3 py-2 align-top';

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h1 className="text-xl font-medium text-textPrimary">
          Sent emails {total ? <span className="text-textSecondary">· {total}</span> : null}
        </h1>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search recipient / subject / cc / actor…"
          className="w-72 rounded-input border border-border bg-transparent px-3 py-2 text-sm text-textPrimary placeholder:text-textSecondary focus:border-primary focus:outline-none"
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${
              tab === t.key
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
                <th className={cell}>Type</th>
                <th className={cell}>To</th>
                <th className={cell}>CC</th>
                <th className={cell}>Subject</th>
                <th className={cell}>PDF</th>
                <th className={cell}>Status</th>
                <th className={cell}>By</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className={cell} colSpan={8}>Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className={cell} colSpan={8}>No emails sent yet</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 text-textPrimary">
                    <td className={`${cell} whitespace-nowrap`} style={{ color: '#9fb0ad' }}>{fmtTs(r.ts)}</td>
                    <td className={`${cell} whitespace-nowrap`}><span style={{ color: kindColor(r.kind), fontWeight: 600 }}>{r.kind}</span></td>
                    <td className={cell}>{r.to}</td>
                    <td className={cell} style={{ color: '#8fae9e' }}>{r.cc.length ? r.cc.join(', ') : '—'}</td>
                    <td className={cell}>{r.subject}</td>
                    <td className={`${cell} whitespace-nowrap`}>{r.attached ? '📎' : '—'}</td>
                    <td className={`${cell} whitespace-nowrap`}>
                      <span style={{ color: statusColor(r.status), fontWeight: 600 }}>{r.status}</span>
                      {r.error ? <span className="ml-1 text-danger" title={r.error}>ⓘ</span> : null}
                    </td>
                    <td className={`${cell} whitespace-nowrap`}>{r.actor ?? '—'}</td>
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
