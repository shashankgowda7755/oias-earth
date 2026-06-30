/**
 * ReportDataEditor (/forest/:id/report-data, admin) — enter every quarterly-
 * report section on the frontend. Loads the forest's current report data,
 * edits it through the sectioned forms, and saves via the dedicated
 * /forest/:id/report-data endpoint (jsonb + report scalars only — never touches
 * geotagged trees). The saved data is what the /report/forest/:id renderer reads.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchForestReport } from '@/lib/publicApi';
import { Button } from '@/components/Buttons';
import type { FullForestPayload } from '../fullTypes';
import { updateForestReportData } from '../forestApi';
import { REPORT_SECTIONS } from './registry';

function defaultQuarter(): number {
  const m = new Date().getMonth();
  if (m >= 3 && m <= 5) return 1;
  if (m >= 6 && m <= 8) return 2;
  if (m >= 9) return 3;
  return 4;
}

/**
 * jsonb columns that hold an ARRAY of keyed rows. On save these are 3-way merged
 * (baseline ↔ draft ↔ live server) so a stale editor snapshot can NEVER erase rows
 * added by another path (the PFA uploader, another tab) — while still honouring the
 * operator's own adds / edits / deletes. Rows are matched by (year,quarter) or
 * slide_type. Non-keyed columns fall back to the draft value (whole write).
 */
const LIST_COLS = new Set<string>([
  'maintenance_workforce', 'soil_ph_level', 'temperature_humidity', 'plantation_progress',
  'environmental_need_indicators', 'dashboard_images', 'report_images', 'gallery_images',
]);

function rowKey(it: unknown): string | null {
  if (!it || typeof it !== 'object') return null;
  const r = it as Record<string, unknown>;
  if (r.year != null && r.quarter != null) return `yq:${r.year}-${r.quarter}`;
  if (r.slide_type != null) return `st:${String(r.slide_type)}`;
  return null;
}

/** Start from the LIVE server array, then apply the operator's diff (draft vs the
 *  baseline they loaded): their deletes drop rows, their adds/edits upsert by key.
 *  Rows present on the server but unknown to this editor are preserved. If any row
 *  lacks a stable key, fall back to the draft array (can't merge safely). */
function mergeList(baseline: unknown, draft: unknown, server: unknown): Record<string, unknown>[] {
  const toArr = (x: unknown): Record<string, unknown>[] => (Array.isArray(x) ? (x as Record<string, unknown>[]) : []);
  const base = toArr(baseline), cur = toArr(draft), srv = toArr(server);
  if ([...base, ...cur, ...srv].some((r) => rowKey(r) == null)) return cur;
  const out = new Map<string, Record<string, unknown>>();
  for (const r of srv) out.set(rowKey(r)!, r);
  for (const b of base) { const k = rowKey(b)!; if (!cur.some((c) => rowKey(c) === k)) out.delete(k); }
  for (const c of cur) out.set(rowKey(c)!, c);
  return [...out.values()];
}

export default function ReportDataEditor() {
  const { id = '' } = useParams();
  const [draft, setDraft] = useState<FullForestPayload | null>(null);
  const [active, setActive] = useState(REPORT_SECTIONS[0]!.key);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [selectedQuarter, setSelectedQuarter] = useState(defaultQuarter);
  const [showAllSetup, setShowAllSetup] = useState(false);

  // Autosave model: we persist ONLY the columns the user actually edited, never
  // the whole payload — so two people editing different sections of the same
  // report never overwrite each other (the server writes only the keys it gets).
  const draftRef = useRef<FullForestPayload | null>(null);
  draftRef.current = draft;
  const pendingRef = useRef<Set<keyof FullForestPayload>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The report as it was loaded / last saved — the baseline for 3-way list merges.
  const baselineRef = useRef<FullForestPayload | null>(null);

  useEffect(() => {
    let alive = true;
    fetchForestReport(id)
      .then((r) => {
        if (!alive) return;
        const forest = { ...(r.forest as FullForestPayload), id };
        setDraft(forest);
        baselineRef.current = forest;
      })
      .catch((e) => { if (alive) setLoadErr(e instanceof Error ? e.message : 'Failed to load forest'); });
    return () => { alive = false; };
  }, [id]);

  /** Persist only the pending (edited) columns. Keyed list columns are 3-way merged
   *  against the LIVE server state so a stale draft can't erase rows added elsewhere
   *  (PFA uploader / another tab). Re-queues on failure for retry. */
  const flush = useCallback(async () => {
    const keys = [...pendingRef.current];
    const d = draftRef.current;
    if (keys.length === 0 || !d) return;
    pendingRef.current = new Set();
    setStatus('saving');
    try {
      // Re-fetch live state only when a keyed list column is being saved.
      const needsMerge = keys.some((k) => LIST_COLS.has(k as string));
      let server: FullForestPayload | null = null;
      if (needsMerge) {
        try { server = (await fetchForestReport(id)).forest as FullForestPayload; } catch { server = null; }
      }
      const base = baselineRef.current;
      const body: Partial<FullForestPayload> = {};
      for (const k of keys) {
        const ks = k as string;
        if (LIST_COLS.has(ks) && server) {
          (body as Record<string, unknown>)[ks] = mergeList(
            (base as Record<string, unknown> | null)?.[ks],
            (d as Record<string, unknown>)[ks],
            (server as Record<string, unknown>)[ks],
          );
        } else {
          (body as Record<string, unknown>)[ks] = (d as Record<string, unknown>)[ks];
        }
      }
      await updateForestReportData(id, body);
      // Advance the baseline + reflect merged columns back into the draft so the
      // next save diffs correctly and the UI shows rows that were merged in.
      baselineRef.current = { ...(baselineRef.current as object), ...body } as FullForestPayload;
      setDraft((cur) => (cur ? { ...cur, ...body } : cur));
      setStatus(pendingRef.current.size ? 'saving' : 'saved');
    } catch {
      for (const k of keys) pendingRef.current.add(k); // keep for retry
      setStatus('error');
    }
  }, [id]);

  const scheduleSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { void flush(); }, 800);
  }, [flush]);

  // Each section calls patch() with exactly the columns it changed → queue + save.
  const patch = (p: Partial<FullForestPayload>) => {
    setDraft((d) => (d ? { ...d, ...p } : d));
    for (const k of Object.keys(p)) pendingRef.current.add(k as keyof FullForestPayload);
    setStatus('saving');
    scheduleSave();
  };

  // Flush any pending edit when leaving the editor so nothing is lost on navigate.
  useEffect(() => () => { void flush(); }, [flush]);

  const activeTab = useMemo(() => REPORT_SECTIONS.find((s) => s.key === active) ?? REPORT_SECTIONS[0]!, [active]);

  // Manual "save now" / retry — flush pending immediately (skip the debounce).
  const handleSaveNow = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    void flush();
  };

  if (loadErr) return <div className="p-12 text-textSecondary">{loadErr}</div>;
  if (!draft) return <div className="p-12 text-textSecondary">Loading forest…</div>;

  const ActiveSection = activeTab.Component;

  return (
    <div className="flex h-screen flex-col bg-appbg text-textPrimary">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="text-sm text-textSecondary hover:text-textPrimary">← Dashboard</Link>
          <span className="text-textSecondary">/</span>
          <span className="font-serif text-lg font-semibold">{draft.forest_name || 'Forest'} · Report data</span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-sm ${status === 'error' ? 'text-danger' : 'text-textSecondary'}`}
            aria-live="polite"
          >
            {status === 'saving' ? 'Saving…'
              : status === 'saved' ? 'All changes saved ✓'
              : status === 'error' ? 'Save failed'
              : 'Auto-saves as you type'}
          </span>
          {status === 'error' ? (
            <Button variant="outlined" onClick={handleSaveNow}>Retry</Button>
          ) : null}
          <a href={`/report/forest/${id}`} target="_blank" rel="noopener" className="rounded-button border border-border px-4 py-2 text-sm text-textPrimary hover:bg-white/5">
            View report ↗
          </a>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <nav className="w-56 shrink-0 overflow-y-auto border-r border-border p-3" aria-label="Report sections">
          {(() => {
            const quarterlySecs = REPORT_SECTIONS.filter((s) => s.group !== 'setup');
            const setupSecs = REPORT_SECTIONS.filter((s) => s.group === 'setup');
            const isQ2Plus = selectedQuarter > 1;
            const navBtn = (s: typeof REPORT_SECTIONS[number]) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setActive(s.key)}
                aria-current={s.key === active ? 'page' : undefined}
                className={`w-full rounded-card px-3 py-2 text-left text-sm transition-colors ${s.key === active ? 'bg-white/8 text-textPrimary' : 'text-textSecondary hover:bg-white/5 hover:text-textPrimary'}`}
              >
                {s.label}
              </button>
            );
            return (
              <ul className="space-y-0.5">
                {quarterlySecs.map((s) => <li key={s.key}>{navBtn(s)}</li>)}
                {isQ2Plus && !showAllSetup ? (
                  <li>
                    <details>
                      <summary className="cursor-pointer list-none px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-textSecondary/70 hover:text-textSecondary">
                        Setup (carried from Q1) ▸
                      </summary>
                      <ul className="mt-1 space-y-0.5">{setupSecs.map((s) => <li key={s.key}>{navBtn(s)}</li>)}</ul>
                    </details>
                  </li>
                ) : (
                  <>
                    <li>
                      <div className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-textSecondary/70">
                        Setup · enter once
                      </div>
                    </li>
                    {setupSecs.map((s) => <li key={s.key}>{navBtn(s)}</li>)}
                  </>
                )}
              </ul>
            );
          })()}
        </nav>
        <main className="flex-1 overflow-y-auto">
          {selectedQuarter > 1 ? (
            <div style={{ background: 'rgba(76,175,80,0.07)', borderBottom: '1px solid rgba(76,175,80,0.18)', padding: '9px 24px', display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
              <span style={{ color: '#aaa' }}>Q{selectedQuarter}: photos, workforce and growth change each quarter. Setup fields carried from Q1.</span>
              <button
                type="button"
                onClick={() => setShowAllSetup((v) => !v)}
                style={{ color: '#4caf50', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0 }}
              >
                {showAllSetup ? '← Hide setup' : 'Show all ▸'}
              </button>
            </div>
          ) : null}
          <div className="mx-auto max-w-3xl space-y-5 px-6 py-6">
            <ActiveSection draft={draft} patch={patch} onQuarterChange={setSelectedQuarter} />
          </div>
        </main>
      </div>
    </div>
  );
}
