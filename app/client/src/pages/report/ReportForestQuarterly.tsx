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
import { C, FONT, REPORT_PRINT_CSS } from './reportPrimitives';
import { SLIDES } from './slides';
import type { ForestReportData } from './reportTypes';

export default function ReportForestQuarterly() {
  const { id = '' } = useParams();
  const [sp] = useSearchParams();
  const isPreview = id === 'preview' || sp.get('preview') === 'vandalur';

  const [data, setData] = useState<ForestReportData | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const preview = useMemo(() => buildPreviewReport(), []);

  useEffect(() => {
    if (isPreview) {
      setData(preview);
      return;
    }
    // Phase 2: fetchForestReport(id, year, quarter). Until then, fall back to the
    // fixture so the route renders; mark it so it's never mistaken for live data.
    setData(preview);
    setErr('Live data wiring lands in Phase 2 — showing the Vandalur preview.');
  }, [id, isPreview, preview]);

  if (!data) return <div style={{ padding: 48, fontFamily: FONT, color: C.muted }}>Loading report…</div>;

  return (
    <div style={{ background: '#eef1ef', minHeight: '100vh', fontFamily: FONT }}>
      <style>{REPORT_PRINT_CSS}</style>

      <div className="no-print" style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(238,241,239,.92)', backdropFilter: 'blur(6px)', borderBottom: `1px solid ${C.line}`, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ color: C.muted, fontSize: 13 }}>
          {data.meta.client_name ? `${data.meta.client_name} · ` : ''}{data.forest.forest_name} · {data.meta.quarter_label} {data.meta.year}
          {err && <span style={{ color: C.amber, marginLeft: 10 }}>· {err}</span>}
        </span>
        <button onClick={() => window.print()} style={{ background: C.green, color: '#fff', border: 'none', borderRadius: 999, padding: '10px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          ↓ Download PDF
        </button>
      </div>

      <div style={{ padding: '22px 16px 60px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {SLIDES.map((Slide, i) => <Slide key={i} data={data} />)}
      </div>
    </div>
  );
}
