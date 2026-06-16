/**
 * Read-only render primitives shared across the Forest DETAIL tabs.
 *
 * Every section degrades gracefully: when its source data is missing/empty the
 * tab body renders an <EmptySection/> instead of an empty shell. Values render
 * via `fmt` (→ "—" for null/blank). No edit affordances here — the detail view
 * is strictly read-only (Edit reopens the wizard/JSON path).
 */
import type { ReactNode } from 'react';

/** null/blank -> "—"; numbers get thousands separators. */
export function fmt(v: unknown): string {
  if (v == null || v === '') return '—';
  if (typeof v === 'number') return Number.isFinite(v) ? v.toLocaleString() : '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
}

/** Quarter label, e.g. (2023, 2) -> "Q2 2023". */
export function quarterLabel(year: number | undefined, quarter: number | undefined): string {
  if (year == null && quarter == null) return '—';
  const q = quarter != null ? `Q${quarter}` : '';
  return [q, year].filter(Boolean).join(' ').trim() || '—';
}

/** Human-readable enum value: snake_case -> "Snake Case". */
export function humanize(v: string | null | undefined): string {
  if (!v) return '—';
  return v
    .split('_')
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(' ');
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="mb-3 text-base font-semibold text-textPrimary">{children}</h3>;
}

export function SubTitle({ children }: { children: ReactNode }) {
  return <h4 className="mb-2 text-sm font-medium text-textSecondary">{children}</h4>;
}

export function EmptySection({ label = 'No data for this section.' }: { label?: string }) {
  return (
    <div className="rounded-card border border-dashed border-border bg-appbg px-4 py-8 text-center text-sm text-textSecondary">
      {label}
    </div>
  );
}

/** A definition list pair. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-1.5">
      <dt className="text-label text-textSecondary">{label}</dt>
      <dd className="text-sm text-textPrimary">{children}</dd>
    </div>
  );
}

/** Responsive two-column definition list wrapper. */
export function FieldGrid({ children }: { children: ReactNode }) {
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">{children}</dl>
  );
}

/** A small KPI stat tile (local; shared KpiCard not present in this tree). */
export function Stat({ label, value, unit }: { label: string; value: ReactNode; unit?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-card border border-border bg-appbg px-4 py-3">
      <span className="text-xl font-semibold tabular-nums text-textPrimary">
        {value}
        {unit ? <span className="ml-1 text-sm font-normal text-textSecondary">{unit}</span> : null}
      </span>
      <span className="text-label text-textSecondary">{label}</span>
    </div>
  );
}

/** Thumbnail image with a graceful broken-image fallback + optional caption. */
export function Thumb({
  src,
  alt,
  caption,
}: {
  src: string | undefined;
  alt: string;
  caption?: string;
}) {
  if (!src) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-card border border-dashed border-border bg-appbg text-label text-textSecondary">
        No image
      </div>
    );
  }
  return (
    <figure className="overflow-hidden rounded-card border border-border bg-appbg">
      <a href={src} target="_blank" rel="noopener noreferrer" className="block">
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="aspect-video w-full bg-white object-contain"
        />
      </a>
      {caption ? (
        <figcaption className="border-t border-border px-2 py-1 text-label text-textSecondary">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

/** A simple bordered table for the quarterly/reporting grids. */
export function DataGrid<T>({
  rows,
  columns,
  getRowKey,
}: {
  rows: T[];
  columns: { header: string; align?: 'left' | 'right' | 'center'; render: (r: T) => ReactNode }[];
  getRowKey: (r: T, i: number) => string | number;
}) {
  const alignClass = (a?: 'left' | 'right' | 'center') =>
    a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left';
  return (
    <div className="overflow-x-auto rounded-card border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-tableHeader">
            {columns.map((c, i) => (
              <th
                key={i}
                className={`whitespace-nowrap px-3 py-2 font-semibold text-textPrimary ${alignClass(c.align)}`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={getRowKey(r, ri)} className="border-t border-border">
              {columns.map((c, ci) => (
                <td
                  key={ci}
                  className={`whitespace-nowrap px-3 py-2 text-textPrimary tabular-nums ${alignClass(c.align)}`}
                >
                  {c.render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Sort quarterly rows chronologically by (year, quarter). */
export function byYearQuarter<T extends { year?: number; quarter?: number }>(a: T, b: T): number {
  const ya = a.year ?? 0;
  const yb = b.year ?? 0;
  if (ya !== yb) return ya - yb;
  return (a.quarter ?? 0) - (b.quarter ?? 0);
}
