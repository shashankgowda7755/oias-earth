/**
 * ReportForestQuarterly (/report/forest/:id, /report/forest/preview) — the
 * 21-slide quarterly forest report (+ Thank-You). Phase 1 renders from the
 * bundled Vandalur fixture so the field mapping can be verified slide-by-slide
 * against the CGI PDF. Phase 2 swaps the fixture for the live API by id +
 * ?year=&quarter=. Download = browser print (one landscape A4 page per slide).
 */
import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { buildPreviewReport } from './reportFixture';
import { downloadReportPdf, renderReportPdfBlob } from './reportDownload';
import { C, FONT, REPORT_PRINT_CSS } from './reportPrimitives';
import { buildSlides } from './slides';
import type { ForestReportData } from './reportTypes';
import { fetchForestReport } from '@/lib/publicApi';

/** Warn (never block) if required report content is missing before download/send. */
function getCompletenessWarnings(
  data: ForestReportData | null,
  year: number | undefined,
  quarter: number | undefined,
): string[] {
  if (!data) return [];
  const w: string[] = [];
  if (!data.forest.report_images?.find((r) => r.slide_type === 'first_slide')?.image)
    w.push('Cover slide hero image');
  if (!data.meta.client_logo)
    w.push('Client/sponsor logo (Sponsored By slide)');
  if (year != null && quarter != null) {
    if (!data.forest.plantation_progress?.find((r) => r.year === year && r.quarter === quarter)?.image)
      w.push(`Q${quarter} plantation progress photo`);
    if (!data.forest.gallery_images?.find((r) => r.year === year && r.quarter === quarter)?.image)
      w.push(`Q${quarter} gallery photo`);
  }
  return w;
}

export default function ReportForestQuarterly() {
  const { id = '' } = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const isPreview = id === 'preview' || sp.get('preview') === 'vandalur';

  // Admin-only action menu (this page is a PUBLIC route — guard the actions).
  const isAdmin = useMemo(() => {
    try {
      return Boolean(localStorage.getItem('token')) && ['Admin', 'SuperAdmin'].includes(localStorage.getItem('role') ?? '');
    } catch { return false; }
  }, []);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sendMsg, setSendMsg] = useState('');

  const sendFromViewer = async () => {
    if (id === 'preview' || sendMsg) return;
    const warns = getCompletenessWarnings(data, year, quarter);
    if (warns.length > 0) {
      const ok = window.confirm(`Some content is missing before sending:\n• ${warns.join('\n• ')}\n\nSend anyway?`);
      if (!ok) return;
    }
    try {
      // Render the report to a PDF in the browser, then send it as a real
      // attachment (the server can't regenerate it) alongside the live link.
      const blob = await renderReportPdfBlob(setSendMsg);
      const fname = (data
        ? `${data.forest.forest_name} ${data.meta.quarter_label} ${data.meta.year} Report.pdf`
        : 'Forest Report.pdf').replace(/[\\/:*?"<>|]+/g, '-');
      const fd = new FormData();
      fd.append('pdf', blob, fname);

      setSendMsg('Sending…');
      const token = localStorage.getItem('token') ?? '';
      const r = await fetch(`/api/v1/forest/${id}/send-report?year=${year ?? ''}&quarter=${quarter ?? ''}`, {
        method: 'POST',
        headers: { Authorization: token }, // no Content-Type — browser sets the multipart boundary
        body: fd,
      });
      const j = await r.json();
      if (!r.ok || j.error) throw new Error(j.message || 'Send failed');
      const d = j.data ?? j;
      setSendMsg('');
      alert(`Report sent to ${d.to}${d.cc?.length ? ` (cc: ${d.cc.join(', ')})` : ''}${d.attached ? ' with PDF attached' : ''}.`);
    } catch (e) {
      setSendMsg('');
      alert(e instanceof Error ? e.message : 'Send failed.');
    }
  };

  const [data, setData] = useState<ForestReportData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [dl, setDl] = useState('');
  const [cur, setCur] = useState(0);

  // Dynamic slide list (per-fiscal-year gallery pages auto-fit the photo count).
  const slides = useMemo(() => (data ? buildSlides(data) : []), [data]);

  const goTo = (i: number) => {
    const n = Math.max(0, Math.min(slides.length - 1, i));
    setCur(n);
    document.getElementById(`rpt-slide-${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleDownload = async () => {
    if (dl) return;
    try {
      const fname = data
        ? `${data.forest.forest_name} ${data.meta.quarter_label} ${data.meta.year} Report.pdf`.replace(/[\\/:*?"<>|]+/g, '-')
        : 'Forest Report.pdf';
      // skipped slides are not in the DOM when !manageMode, so html2canvas naturally skips them
      const warnings = getCompletenessWarnings(data, year, quarter);
      if (warnings.length > 0) {
        const ok = window.confirm(`Missing content:\n• ${warnings.join('\n• ')}\n\nDownload anyway?`);
        if (!ok) return;
      }
      await downloadReportPdf(fname, setDl);
      // Log the download to the audit trail (fire-and-forget; public route).
      if (id && id !== 'preview') {
        let actor = '';
        try { actor = (JSON.parse(localStorage.getItem('userDetailsData') || '{}') as { username?: string }).username || ''; } catch { /* anon */ }
        fetch(`/api/v1/public/forest/${id}/report-download`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ year, quarter, actor }),
        }).catch(() => undefined);
      }
    } catch (e) {
      setDl('');
      alert(e instanceof Error ? e.message : 'Could not generate the PDF. Try the Print button.');
    }
  };

  const previewSrc = sp.get('src') || 'vandalur';
  const preview = useMemo(() => buildPreviewReport(previewSrc), [previewSrc]);
  const year = sp.get('year') ? Number(sp.get('year')) : undefined;
  const quarter = sp.get('quarter') ? Number(sp.get('quarter')) : undefined;
  // Skip persistence keyed by STABLE slide id (so per-year gallery pages stay
  // individually hide-able across re-renders, even as the slide order shifts).
  const skipKey = `rpt-skip-${id}-${year ?? 0}-${quarter ?? 0}`;
  const [skipped, setSkipped] = useState<Set<string>>(() => {
    try { return new Set<string>(JSON.parse(localStorage.getItem(skipKey) ?? '[]')); } catch { return new Set<string>(); }
  });
  const toggleSkip = (sid: string) => {
    setSkipped((prev) => {
      const next = new Set(prev);
      next.has(sid) ? next.delete(sid) : next.add(sid);
      localStorage.setItem(skipKey, JSON.stringify([...next]));
      return next;
    });
  };

  useEffect(() => {
    if (isPreview) {
      setData(preview);
      return;
    }
    setData(null);
    setErr(null);
    fetchForestReport(id, year, quarter)
      .then(setData)
      .catch((e) => setErr(e instanceof Error ? e.message : 'Failed to load report'));
  }, [id, isPreview, preview, year, quarter]);

  if (err) return <div style={{ padding: 48, fontFamily: FONT, color: C.muted }}>{err}</div>;
  if (!data) return <div style={{ padding: 48, fontFamily: FONT, color: C.muted }}>Loading report…</div>;

  return (
    <div style={{ background: '#eef1ef', minHeight: '100vh', fontFamily: FONT }}>
      <style>{REPORT_PRINT_CSS}</style>

      <div className="no-print" style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(238,241,239,.92)', backdropFilter: 'blur(6px)', borderBottom: `1px solid ${C.line}`, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isAdmin && !isPreview ? (
            <div className="no-print" style={{ position: 'relative' }} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setMenuOpen(false); }}>
              <button onClick={() => setMenuOpen((o) => !o)} aria-label="Report actions" aria-haspopup="menu" style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 8, width: 34, height: 34, cursor: 'pointer', color: C.ink, fontSize: 18, lineHeight: 1 }}>⋮</button>
              {menuOpen ? (
                <div role="menu" style={{ position: 'absolute', left: 0, top: '112%', background: '#fff', border: `1px solid ${C.line}`, borderRadius: 10, boxShadow: '0 8px 28px rgba(0,0,0,.12)', minWidth: 190, zIndex: 30, overflow: 'hidden' }}>
                  <button role="menuitem" onClick={() => { setMenuOpen(false); navigate('/dashboard'); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: 14, color: C.ink, background: 'none', border: 'none', cursor: 'pointer' }}>← Back to reports</button>
                  <button role="menuitem" onClick={() => { setMenuOpen(false); navigate(`/forest/${id}/report-data`); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: 14, color: C.ink, background: 'none', border: 'none', cursor: 'pointer' }}>Edit report data</button>
                  <button role="menuitem" onClick={() => { setMenuOpen(false); sendFromViewer(); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: 14, color: C.ink, background: 'none', border: 'none', cursor: 'pointer' }}>{sendMsg || 'Send report'}</button>
                </div>
              ) : null}
            </div>
          ) : null}
          {isAdmin && !isPreview && skipped.size > 0 ? (
            <span style={{ fontSize: 12, color: C.amber, fontWeight: 600 }}>
              {skipped.size} slide{skipped.size > 1 ? 's' : ''} hidden
            </span>
          ) : null}
          <span style={{ color: C.muted, fontSize: 13 }}>
            {data.meta.client_name ? `${data.meta.client_name} · ` : ''}{data.forest.forest_name} · {data.meta.quarter_label} {data.meta.year}
            {err && <span style={{ color: C.amber, marginLeft: 10 }}>· {err}</span>}
          </span>
        </div>

        <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => goTo(cur - 1)} disabled={cur === 0} aria-label="Previous section" style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 8, width: 30, height: 30, cursor: cur === 0 ? 'default' : 'pointer', color: C.ink, opacity: cur === 0 ? 0.4 : 1 }}>◀</button>
          <select value={cur} onChange={(e) => goTo(Number(e.target.value))} aria-label="Jump to section" style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: '6px 10px', fontSize: 13, color: C.ink, background: '#fff', maxWidth: 200 }}>
            {slides.map((s, i) => <option key={s.id} value={i}>{i + 1}. {s.title}{skipped.has(s.id) ? ' (skipped)' : ''}</option>)}
          </select>
          <button onClick={() => goTo(cur + 1)} disabled={cur === slides.length - 1} aria-label="Next section" style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 8, width: 30, height: 30, cursor: cur === slides.length - 1 ? 'default' : 'pointer', color: C.ink, opacity: cur === slides.length - 1 ? 0.4 : 1 }}>▶</button>
          <span style={{ fontSize: 12, color: C.faint, minWidth: 42, textAlign: 'center' }}>{cur + 1} / {slides.length}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={handleDownload} disabled={!!dl} style={{ background: C.green, color: '#fff', border: 'none', borderRadius: 999, padding: '10px 22px', fontWeight: 700, fontSize: 14, cursor: dl ? 'wait' : 'pointer', opacity: dl ? 0.7 : 1, minWidth: 150 }}>
            {dl || '↓ Download PDF'}
          </button>
          <button onClick={() => window.print()} style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.line}`, borderRadius: 999, padding: '10px 18px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            🖨 Print
          </button>
        </div>
      </div>

      <div style={{ padding: '22px 16px 60px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {slides.map((s, i) => {
          const isSkipped = skipped.has(s.id);
          if (isSkipped) {
            if (isAdmin && !isPreview) {
              return (
                <div key={s.id} id={`rpt-slide-${i}`} className="no-print"
                  style={{ width: '100%', maxWidth: 1100, margin: '0 auto 8px', border: `1px dashed ${C.line}`, borderRadius: 10, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff' }}>
                  <span style={{ color: C.muted, fontSize: 13 }}>Slide {i + 1} — {s.title} (hidden from report)</span>
                  <button onClick={() => toggleSkip(s.id)} style={{ fontSize: 12, color: C.green, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>+ Restore</button>
                </div>
              );
            }
            return null;
          }
          return (
            <div key={s.id} id={`rpt-slide-${i}`} style={{ scrollMarginTop: 64, width: '100%', display: 'flex', justifyContent: 'center', position: 'relative' }}>
              {s.node}
              {isAdmin && !isPreview && (
                <div className="no-print" style={{ position: 'absolute', top: 10, right: 10, zIndex: 5, background: 'rgba(255,255,255,.92)', borderRadius: 6, padding: '4px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${C.line}`, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
                  <input type="checkbox" id={`skip-${s.id}`} checked={false} onChange={() => toggleSkip(s.id)} style={{ cursor: 'pointer' }} />
                  <label htmlFor={`skip-${s.id}`} style={{ cursor: 'pointer', color: C.muted }}>Hide from report</label>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
