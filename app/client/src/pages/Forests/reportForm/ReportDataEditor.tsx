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

export default function ReportDataEditor() {
  const { id = '' } = useParams();
  const [draft, setDraft] = useState<FullForestPayload | null>(null);
  const [active, setActive] = useState(REPORT_SECTIONS[0]!.key);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Autosave model: we persist ONLY the columns the user actually edited, never
  // the whole payload — so two people editing different sections of the same
  // report never overwrite each other (the server writes only the keys it gets).
  const draftRef = useRef<FullForestPayload | null>(null);
  draftRef.current = draft;
  const pendingRef = useRef<Set<keyof FullForestPayload>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    fetchForestReport(id)
      .then((r) => { if (alive) setDraft({ ...(r.forest as FullForestPayload), id }); })
      .catch((e) => { if (alive) setLoadErr(e instanceof Error ? e.message : 'Failed to load forest'); });
    return () => { alive = false; };
  }, [id]);

  /** Persist only the pending (edited) columns. Re-queues on failure for retry. */
  const flush = useCallback(async () => {
    const keys = [...pendingRef.current];
    const d = draftRef.current;
    if (keys.length === 0 || !d) return;
    pendingRef.current = new Set();
    const body: Partial<FullForestPayload> = {};
    for (const k of keys) (body as Record<string, unknown>)[k as string] = d[k];
    setStatus('saving');
    try {
      await updateForestReportData(id, body);
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
          <ul className="space-y-0.5">
            {REPORT_SECTIONS.map((s, i) => {
              const prev = REPORT_SECTIONS[i - 1];
              const showSetupHeader = s.group === 'setup' && prev?.group !== 'setup';
              return (
                <li key={s.key}>
                  {showSetupHeader ? (
                    <div className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-textSecondary/70">
                      Setup · enter once
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setActive(s.key)}
                    aria-current={s.key === active ? 'page' : undefined}
                    className={`w-full rounded-card px-3 py-2 text-left text-sm transition-colors ${s.key === active ? 'bg-white/8 text-textPrimary' : 'text-textSecondary hover:bg-white/5 hover:text-textPrimary'}`}
                  >
                    {s.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl space-y-5 px-6 py-6">
            <ActiveSection draft={draft} patch={patch} />
          </div>
        </main>
      </div>
    </div>
  );
}
