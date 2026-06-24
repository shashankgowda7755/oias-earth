/**
 * Shared building blocks for the quarterly report slides — matched to the CGI
 * PDF: landscape slide frame, breadcrumb header + client logo, green section
 * title with underline, stat cards, value bars, and small helpers. Inline
 * styles (like ReportTree/ReportSponsor) so the browser print is pixel-faithful.
 */
import type { CSSProperties, ReactNode } from 'react';
import type { ReportMeta } from './reportTypes';

/* Palette pulled from the PDF. */
export const C = {
  ink: '#1a2b32',
  body: '#33454c',
  muted: '#6b7a80',
  faint: '#9aa7ac',
  line: '#e4e9e7',
  green: '#17a673',
  greenDark: '#0f7d57',
  greenSoft: '#e7f6ef',
  dark: '#10231d',
  amber: '#e89b2a',
  blue: '#3b82c4',
  red: '#e2574c',
  bg: '#ffffff',
};

export const FONT = "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";

/** Print CSS — one slide per landscape A4 page; hide screen chrome. */
export const REPORT_PRINT_CSS = `
@media screen {
  .rpt-slide {
    box-shadow: 0 1px 4px rgba(0,0,0,.10), 0 8px 28px rgba(0,0,0,.06);
    margin: 0 auto 22px;
  }
}
@media print {
  .no-print { display: none !important; }
  body { background: #fff !important; }
  @page { size: A4 landscape; margin: 0; }
  .rpt-slide { break-after: page; box-shadow: none !important; margin: 0 !important; }
  .rpt-slide:last-child { break-after: auto; }
}`;

/* ---------- helpers ---------- */

export const dash = (v: unknown): string => {
  if (v === null || v === undefined) return '—';
  const s = String(v).trim();
  return s === '' ? '—' : s;
};

export const numOrDash = (v: unknown): string => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('en-IN') : '—';
};

export const fmtDate = (s?: string | null): string =>
  s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

/** Title-case an enum value like "intense_plantation" → "Intense Plantation". */
export const enumLabel = (v?: string | null): string =>
  v ? v.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '—';

/* ---------- slide frame ---------- */

export function Breadcrumb({ meta }: { meta: ReportMeta }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, border: `1px solid ${C.line}`,
      borderRadius: 999, padding: '7px 16px', fontSize: 13, color: C.muted, background: '#fff', whiteSpace: 'nowrap',
    }}>
      Reports <span style={{ color: C.faint }}>&gt;</span> {meta.year} <span style={{ color: C.faint }}>&gt;</span>
      <strong style={{ color: C.ink, fontWeight: 700 }}>{meta.quarter_label}</strong>
    </span>
  );
}

export function ClientMark({ meta, size = 34 }: { meta: ReportMeta; size?: number }) {
  if (meta.client_logo) return <img src={meta.client_logo} alt="" style={{ height: size, objectFit: 'contain' }} />;
  if (meta.client_name) return <span style={{ fontWeight: 800, color: C.ink, fontSize: 18, letterSpacing: '.02em' }}>{meta.client_name}</span>;
  return null;
}

/** Top header row: breadcrumb + extending rule + client logo. */
export function SlideHeader({ meta }: { meta: ReportMeta }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <Breadcrumb meta={meta} />
      <span style={{ flex: 1, height: 1, background: C.line }} />
      <ClientMark meta={meta} />
    </div>
  );
}

/** CommuniTREE-style footer wordmark (matches the PDF footer). */
export function ReportFooter() {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 'auto', paddingTop: 10 }}>
      <div style={{ textAlign: 'center', lineHeight: 1 }}>
        <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '.04em', color: '#2f6b3f' }}>
          COMMUNI<span style={{ color: C.green }}>TREE</span>
        </div>
        <div style={{ fontSize: 7.5, letterSpacing: '.22em', color: C.faint, marginTop: 2 }}>CREATING MAN MADE FORESTS</div>
      </div>
    </div>
  );
}

/** Big section title with the green underline (PDF section heads). */
export function SectionTitle({ children, eyebrow }: { children: ReactNode; eyebrow?: string }) {
  return (
    <div style={{ marginBottom: 22 }}>
      {eyebrow && <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: C.green, marginBottom: 6 }}>{eyebrow}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <h2 style={{ fontSize: 30, fontWeight: 800, color: C.ink, margin: 0, whiteSpace: 'nowrap' }}>{children}</h2>
        <span style={{ flex: 1, height: 3, borderRadius: 2, background: `linear-gradient(90deg, ${C.green}, ${C.greenSoft})` }} />
      </div>
    </div>
  );
}

/**
 * The landscape page frame. Fixed 1120×792 canvas (A4-landscape ratio) so the
 * layout is stable on screen and prints one-slide-per-page. Header + footer are
 * rendered automatically; pass `bare` for the cover/contents/thanks slides that
 * draw their own header.
 */
export function SlidePage({
  meta,
  children,
  bare = false,
  pad = 40,
  style,
}: {
  meta: ReportMeta;
  children: ReactNode;
  bare?: boolean;
  pad?: number;
  style?: CSSProperties;
}) {
  return (
    <section
      className="rpt-slide"
      style={{
        width: '100%', maxWidth: 1120, aspectRatio: '1120 / 792', background: C.bg, color: C.body,
        fontFamily: FONT, display: 'flex', flexDirection: 'column', padding: pad, boxSizing: 'border-box',
        position: 'relative', overflow: 'hidden', ...style,
      }}
    >
      {!bare && <SlideHeader meta={meta} />}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, paddingTop: bare ? 0 : 18 }}>
        {children}
      </div>
      {!bare && <ReportFooter />}
    </section>
  );
}

/* ---------- small shared widgets ---------- */

export function StatCard({
  label, value, unit, icon, valueColor = C.ink, sub,
}: { label: string; value: ReactNode; unit?: string; icon?: ReactNode; valueColor?: string; sub?: string }) {
  return (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: 14, padding: '16px 18px', background: '#fff', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {icon && <div style={{ width: 40, height: 40, borderRadius: '50%', background: C.greenSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.green }}>{icon}</div>}
      <div style={{ fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: C.muted }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: valueColor, lineHeight: 1.05 }}>
        {value}{unit && <span style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginLeft: 4 }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 11.5, color: C.faint }}>{sub}</div>}
    </div>
  );
}

/** Labelled horizontal bar (slide 8 value flow). */
export function ValueBar({ label, value, max, accent, suffix = ' Cr', tag }: { label: string; value: number | null; max: number; accent: string; suffix?: string; tag?: string }) {
  const pct = value != null && max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <div style={{ fontSize: 12, color: C.muted }}>{label}</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.ink }}>{value != null ? `₹${value.toFixed(2)}${suffix}` : '—'}</div>
        </div>
        {tag && <span style={{ fontSize: 11, color: C.faint }}>{tag}</span>}
      </div>
      <div style={{ height: 6, borderRadius: 3, background: C.line, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: accent, borderRadius: 3 }} />
      </div>
    </div>
  );
}

/** Two-tone proportion bar (slide 10/11 distribution). */
export function SplitBar({ segments, height = 26 }: { segments: { pct: number; color: string; label?: string }[]; height?: number }) {
  return (
    <div style={{ display: 'flex', height, borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.line}` }}>
      {segments.filter((s) => s.pct > 0).map((s, i) => (
        <div key={i} style={{ width: `${s.pct}%`, background: s.color, color: '#fff', fontSize: 11.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {s.label}
        </div>
      ))}
    </div>
  );
}

/** Empty-state placeholder used where the PDF would show an image/content the data lacks. */
export function EmptyBlock({ label, height = 120 }: { label: string; height?: number }) {
  return (
    <div style={{ height, border: `1px dashed ${C.line}`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.faint, fontSize: 12.5, background: '#fbfdfc' }}>
      {label}
    </div>
  );
}

/** Image with graceful empty fallback. */
export function ReportImage({ src, alt = '', height, label = 'No image', radius = 12, style }: { src?: string; alt?: string; height?: number; label?: string; radius?: number; style?: CSSProperties }) {
  if (!src) return <EmptyBlock label={label} height={height ?? 120} />;
  return <img src={src} alt={alt} style={{ width: '100%', height, objectFit: 'cover', borderRadius: radius, display: 'block', ...style }} />;
}
