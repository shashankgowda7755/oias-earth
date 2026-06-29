/**
 * Shared building blocks for the quarterly report slides. Visual language ported
 * from the premium replica mock (report-replica/index.html): Poppins type, grain
 * overlays, layered card shadows, gradient title rules, tinted icon chips, dark
 * gradient panels, conic progress rings and stacked bars. Data bindings are
 * unchanged — slides still read meta / forest / computed. Inline styles keep the
 * browser print + html2canvas PDF pixel-faithful.
 */
import type { CSSProperties, ReactNode } from 'react';
import type { ReportMeta } from './reportTypes';

/* Palette — replica set. Legacy keys kept as aliases so existing slide code keeps working. */
export const C = {
  ink: '#1e2b37',
  ink2: '#33424e',
  body: '#33424e',
  muted: '#8a97a0',
  faint: '#b8c2c9',
  line: '#e9eef1',
  tint: '#f6f9fa',
  green: '#16a34a',
  green2: '#0fae8e',
  teal: '#0f9e8e',
  greenDark: '#0f7d57',
  greenSoft: '#e7f6ef',
  mint: '#e7f6ef',
  dark: '#14352b',
  dark2: '#0d251d',
  amber: '#f08a24',
  orange: '#f08a24',
  blue: '#2f6fed',
  purple: '#7c5cff',
  red: '#e23744',
  bg: '#ffffff',
  /* tinted icon-chip backgrounds */
  tintGreen: '#e7f6ef',
  tintBlue: '#e8f0fe',
  tintOrange: '#fdeede',
  tintPurple: '#efeaff',
  tintRed: '#fde8ea',
  grad: 'linear-gradient(90deg,#16a34a 0%,#0fae8e 100%)',
};

export const FONT = "'Poppins', system-ui, -apple-system, sans-serif";

/** Layered card shadow stack (replica). */
export const CARD_SHADOW =
  '0 1px 2px rgba(20,40,30,.06),0 4px 12px rgba(20,40,30,.08),0 12px 32px rgba(20,40,30,.07),inset 0 1px 0 rgba(255,255,255,.95)';

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")";

/** Font load + print CSS + grain overlays. Grain applies on screen AND print/PDF. */
export const REPORT_PRINT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
.rpt-slide { position: relative; }
.rpt-slide::before {
  content: ''; position: absolute; inset: 0; z-index: 10; pointer-events: none;
  background-image: ${GRAIN}; opacity: .04; mix-blend-mode: overlay;
}
.rpt-dark { position: relative; }
.rpt-dark::after {
  content: ''; position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background-image: ${GRAIN}; opacity: .07; mix-blend-mode: soft-light; border-radius: inherit;
}
.rpt-dark > * { position: relative; z-index: 2; }
@media screen {
  .rpt-slide {
    box-shadow: 0 2px 4px rgba(20,40,30,.08), 0 8px 24px rgba(20,40,30,.14), 0 28px 64px rgba(20,40,30,.18);
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

/* ---------- tinted icon chip ---------- */

export type Tint = 'green' | 'blue' | 'orange' | 'purple' | 'red';
const TINT_BG: Record<Tint, string> = {
  green: C.tintGreen, blue: C.tintBlue, orange: C.tintOrange, purple: C.tintPurple, red: C.tintRed,
};
const TINT_FG: Record<Tint, string> = {
  green: C.green, blue: C.blue, orange: C.orange, purple: C.purple, red: C.red,
};

/** Rounded icon chip with a colored tint (replica .ico variants). */
export function TintIcon({ children, tint = 'green', size = 42 }: { children: ReactNode; tint?: Tint; size?: number }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: Math.round(size * 0.26), background: TINT_BG[tint], color: TINT_FG[tint],
      display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', fontSize: Math.round(size * 0.5),
    }}>{children}</span>
  );
}

/* ---------- slide frame ---------- */

export function Breadcrumb({ meta }: { meta: ReportMeta }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, border: `1px solid ${C.line}`,
      borderRadius: 999, padding: '9px 18px', fontSize: 13, color: '#5f6b73', background: '#fff', whiteSpace: 'nowrap',
      boxShadow: '0 2px 6px rgba(20,40,30,.07),0 6px 18px rgba(20,40,30,.09),inset 0 1px 0 rgba(255,255,255,.9)',
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

/** COMMUNITREE-style footer wordmark (matches the PDF footer). */
export function ReportFooter({ meta }: { meta?: ReportMeta } = {}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 'auto', paddingTop: 10 }}>
      <div style={{ textAlign: 'center', lineHeight: 1 }}>
        {meta?.communitree_logo ? (
          <img src={meta.communitree_logo} alt="COMMUNITREE" style={{ height: 32, objectFit: 'contain' }} />
        ) : (
          <>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '.04em', color: '#2f6b3f' }}>
              COMMUNI<span style={{ color: C.green }}>TREE</span>
            </div>
            <div style={{ fontSize: 7.5, letterSpacing: '.22em', color: C.faint, marginTop: 2 }}>CREATING MAN MADE FORESTS</div>
          </>
        )}
      </div>
    </div>
  );
}

/** Big section title with the gradient rule (replica .htitle + .rule). */
export function SectionTitle({ children, eyebrow, size = 30, right }: { children: ReactNode; eyebrow?: string; size?: number; right?: ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      {eyebrow && <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: C.teal, marginBottom: 4 }}>{eyebrow}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <h2 style={{ fontSize: size, fontWeight: 700, color: C.ink, margin: 0, whiteSpace: 'nowrap', lineHeight: 1.05 }}>{children}</h2>
        <span style={{ flex: 1, height: 5, borderRadius: 5, background: C.grad }} />
        {right}
      </div>
    </div>
  );
}

/** Pill badge (replica .pill-r / .crumb). */
export function Pill({ children, filled = false, style }: { children: ReactNode; filled?: boolean; style?: CSSProperties }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 999, padding: '11px 20px', fontSize: 15, fontWeight: 600,
      border: filled ? 'none' : `1px solid ${C.line}`, background: filled ? C.dark : '#fff', color: filled ? '#fff' : C.ink2,
      boxShadow: filled ? 'none' : '0 4px 14px rgba(20,40,30,.05)', whiteSpace: 'nowrap', ...style,
    }}>{children}</span>
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
        position: 'relative', overflow: 'hidden', borderRadius: 4, ...style,
      }}
    >
      {!bare && <SlideHeader meta={meta} />}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, paddingTop: bare ? 0 : 18, position: 'relative', zIndex: 1 }}>
        {children}
      </div>
      {!bare && <ReportFooter meta={meta} />}
    </section>
  );
}

/* ---------- card ---------- */

/** Base card surface with the layered replica shadow. */
export function Card({ children, dark = false, style, className }: { children: ReactNode; dark?: boolean; style?: CSSProperties; className?: string }) {
  const base: CSSProperties = dark
    ? { background: C.dark, color: '#fff', border: 'none', borderRadius: 16 }
    : { background: '#fff', border: `1px solid ${C.line}`, borderRadius: 16, boxShadow: CARD_SHADOW };
  return <div className={[dark ? 'rpt-dark' : '', className].filter(Boolean).join(' ')} style={{ ...base, ...style }}>{children}</div>;
}

export function StatCard({
  label, value, unit, icon, tint = 'green', valueColor = C.ink, sub,
}: { label: string; value: ReactNode; unit?: string; icon?: ReactNode; tint?: Tint; valueColor?: string; sub?: string }) {
  return (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: 16, padding: '12px 16px', background: '#fff', display: 'flex', flexDirection: 'column', gap: 5, boxShadow: CARD_SHADOW }}>
      {icon && <TintIcon tint={tint} size={32}>{icon}</TintIcon>}
      <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: C.muted, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: valueColor, lineHeight: 1.05 }}>
        {value}{unit && <span style={{ fontSize: 14, fontWeight: 600, color: C.muted, marginLeft: 4 }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 13, color: C.muted }}>{sub}</div>}
    </div>
  );
}

/* ---------- dark gradient panel (replica hero / value-flow header / thanks) ---------- */

export function DarkPanel({ children, style, radius = 18 }: { children: ReactNode; style?: CSSProperties; radius?: number }) {
  return (
    <div
      className="rpt-dark"
      style={{
        position: 'relative', overflow: 'hidden', borderRadius: radius, color: '#fff',
        background: `linear-gradient(135deg,${C.dark} 0%,${C.dark2} 60%,#0a2419 100%)`,
        ...style,
      }}
    >
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'radial-gradient(circle at 12% 20%,rgba(80,160,90,.35),transparent 40%),radial-gradient(circle at 88% 80%,rgba(80,160,90,.3),transparent 40%)' }} />
      <div style={{ position: 'relative', zIndex: 2 }}>{children}</div>
    </div>
  );
}

/* ---------- conic progress ring (replica project-status %) ---------- */

export function ConicRing({ pct, size = 60, color = C.green, label }: { pct: number | null; size?: number; color?: string; label?: string }) {
  const p = pct != null && Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : 0;
  const inner = Math.round(size * 0.73);
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: `conic-gradient(${color} ${p}%,${C.line} 0)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
      <div style={{ width: inner, height: inner, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: C.ink }}>
        {label ?? (pct != null ? `${p.toFixed(1)}%` : '—')}
      </div>
    </div>
  );
}

/** Labelled horizontal bar (slide 8 value flow). */
export function ValueBar({ label, value, max, accent, suffix = ' Cr', tag }: { label: string; value: number | null; max: number; accent: string; suffix?: string; tag?: string }) {
  const pct = value != null && max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <div style={{ fontSize: 12, color: C.muted }}>{label}</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>{value != null ? `₹${value.toFixed(2)}${suffix}` : '—'}</div>
        </div>
        {tag && <span style={{ fontSize: 11, color: C.faint }}>{tag}</span>}
      </div>
      <div style={{ height: 7, borderRadius: 6, background: '#eef1f3', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: accent, borderRadius: 6 }} />
      </div>
    </div>
  );
}

/**
 * Stacked proportion bar with inline % labels (replica watering-vs-weather +
 * effort split). Segments below a width threshold hide their label to avoid
 * cramped text.
 */
export function StackedBar({ segments, height = 30 }: { segments: { pct: number; color: string; label?: string; textColor?: string }[]; height?: number }) {
  return (
    <div style={{ display: 'flex', height, borderRadius: 7, overflow: 'hidden', fontSize: 11, fontWeight: 600, color: '#fff' }}>
      {segments.filter((s) => s.pct > 0).map((s, i) => (
        <div key={i} style={{ width: `${s.pct}%`, background: s.color, color: s.textColor ?? '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          {s.pct >= 8 ? s.label : ''}
        </div>
      ))}
    </div>
  );
}

/** Two-tone proportion bar (legacy; thin variant). */
export function SplitBar({ segments, height = 26 }: { segments: { pct: number; color: string; label?: string }[]; height?: number }) {
  return <StackedBar segments={segments} height={height} />;
}

const photoIcon = (size = 30) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="M21 15l-5-5L5 21" />
  </svg>
);

/**
 * Photo placeholder matching the PDF's image areas — a solid light-grey box with
 * a centered image icon + caption. FILLS its parent by default (height 100%), so
 * an empty image region occupies exactly the space a real photo would, instead
 * of collapsing to a small box. `height` pins a fixed height when there's no
 * flex parent to fill.
 */
export function PhotoPlaceholder({ label = 'Photo', height, radius = 14, fill = true }: { label?: string; height?: number; radius?: number; fill?: boolean }) {
  return (
    <div style={{
      height: height ?? (fill ? '100%' : 140), minHeight: 96, width: '100%', borderRadius: radius,
      background: '#eef2f0', border: `1px solid ${C.line}`, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 8, color: '#aeb9b5',
    }}>
      {photoIcon()}
      <span style={{ fontSize: 12, fontWeight: 600, color: '#9aa7a2' }}>{label}</span>
    </div>
  );
}

/** Non-photo empty box (e.g. the OSR map area) — solid grey, fills its parent. */
export function EmptyBlock({ label, height }: { label: string; height?: number }) {
  return (
    <div style={{ height: height ?? '100%', minHeight: 96, width: '100%', border: `1px solid ${C.line}`, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9aa7a2', fontSize: 12.5, background: '#eef2f0' }}>
      {label}
    </div>
  );
}

/**
 * Default dummy image rendered wherever a real photo is missing or fails to
 * load. A clearly-a-placeholder graphic (image icon on a soft grey field) — NOT
 * a stock photo, so it never reads as a real, verified site image. Inline SVG
 * data-URI so it always resolves (no asset/network dependency, prints fine).
 */
const DUMMY_SVG =
  `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='240' viewBox='0 0 320 240'>` +
  `<rect width='320' height='240' fill='#eef2f0'/>` +
  `<g stroke='#c2cdc8' stroke-width='6' fill='none' stroke-linecap='round' stroke-linejoin='round'>` +
  `<rect x='96' y='78' width='128' height='96' rx='10'/>` +
  `<circle cx='128' cy='110' r='12'/>` +
  `<path d='M104 166 l36 -36 28 24 24 -20 28 32'/>` +
  `</g></svg>`;
export const DUMMY_IMAGE = `data:image/svg+xml,${encodeURIComponent(DUMMY_SVG)}`;

/**
 * Image region. Real photo → object-cover. Missing OR broken src → the default
 * dummy image fills the SAME box (with the contextual caption overlaid when the
 * src was missing) so the layout never collapses or shows an empty grey panel.
 */
export function ReportImage({ src, alt = '', height, label = 'Photo', radius = 14, style }: { src?: string; alt?: string; height?: number; label?: string; radius?: number; style?: CSSProperties }) {
  const wrap: CSSProperties = { position: 'relative', width: '100%', height: height ?? '100%', minHeight: 96, ...style };
  const missing = !src;
  return (
    <div style={wrap}>
      <img
        src={src || DUMMY_IMAGE}
        alt={alt}
        onError={(e) => {
          const t = e.currentTarget;
          if (!t.dataset.fallback) { t.dataset.fallback = '1'; t.src = DUMMY_IMAGE; }
        }}
        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: radius, display: 'block', background: '#eef2f0' }}
      />
      {missing && label ? (
        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 12, fontSize: 12, fontWeight: 600, color: '#9aa7a2', pointerEvents: 'none' }}>{label}</span>
      ) : null}
    </div>
  );
}
