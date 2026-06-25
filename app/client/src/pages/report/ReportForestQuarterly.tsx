/**
 * ReportForestQuarterly (/report/forest/:id, /report/forest/preview) — the
 * 21-slide quarterly forest report (+ Thank-You). Phase 1 renders from the
 * bundled Vandalur fixture so the field mapping can be verified slide-by-slide
 * against the CGI PDF. Phase 2 swaps the fixture for the live API by id +
 * ?year=&quarter=. Download = browser print (one landscape A4 page per slide).
 */
import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { buildPreviewReport } from './reportFixture';
import { downloadReportPdf } from './reportDownload';
import { C, FONT, REPORT_PRINT_CSS } from './reportPrimitives';
import { SLIDES, SLIDE_TITLES } from './slides';
import type { ForestReportData } from './reportTypes';
import { fetchForestReport } from '@/lib/publicApi';

export default function ReportForestQuarterly() {
  const { id = '' } = useParams();
  const [sp] = useSearchParams();
  const isPreview = id === 'preview' || sp.get('preview') === 'vandalur';

  const [data, setData] = useState<ForestReportData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [dl, setDl] = useState('');
  const [cur, setCur] = useState(0);

  const goTo = (i: number) => {
    const n = Math.max(0, Math.min(SLIDES.length - 1, i));
    setCur(n);
    document.getElementById(`rpt-slide-${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleDownload = async () => {
    if (dl) return;
    try {
      const fname = data
        ? `${data.forest.forest_name} ${data.meta.quarter_label} ${data.meta.year} Report.pdf`.replace(/[\\/:*?"<>|]+/g, '-')
        : 'Forest Report.pdf';
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
        <span style={{ color: C.muted, fontSize: 13 }}>
          {data.meta.client_name ? `${data.meta.client_name} · ` : ''}{data.forest.forest_name} · {data.meta.quarter_label} {data.meta.year}
          {err && <span style={{ color: C.amber, marginLeft: 10 }}>· {err}</span>}
        </span>

        <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => goTo(cur - 1)} disabled={cur === 0} aria-label="Previous section" style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 8, width: 30, height: 30, cursor: cur === 0 ? 'default' : 'pointer', color: C.ink, opacity: cur === 0 ? 0.4 : 1 }}>◀</button>
          <select value={cur} onChange={(e) => goTo(Number(e.target.value))} aria-label="Jump to section" style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: '6px 10px', fontSize: 13, color: C.ink, background: '#fff', maxWidth: 200 }}>
            {SLIDE_TITLES.map((t, i) => <option key={i} value={i}>{i + 1}. {t}</option>)}
          </select>
          <button onClick={() => goTo(cur + 1)} disabled={cur === SLIDES.length - 1} aria-label="Next section" style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 8, width: 30, height: 30, cursor: cur === SLIDES.length - 1 ? 'default' : 'pointer', color: C.ink, opacity: cur === SLIDES.length - 1 ? 0.4 : 1 }}>▶</button>
          <span style={{ fontSize: 12, color: C.faint, minWidth: 42, textAlign: 'center' }}>{cur + 1} / {SLIDES.length}</span>
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
        {SLIDES.map((Slide, i) => (
          <div key={i} id={`rpt-slide-${i}`} style={{ scrollMarginTop: 64, width: '100%', display: 'flex', justifyContent: 'center' }}>
            <Slide data={data} />
          </div>
        ))}
      </div>
    </div>
  );
}
