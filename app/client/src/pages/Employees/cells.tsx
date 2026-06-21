/**
 * Presentational table cells for the Employees DataTable.
 *
 * Kept separate from index.tsx so the table column config stays readable and
 * the avatar / status / actions widgets are unit-friendly. All purely visual;
 * no data fetching here.
 */
import { useState, type ReactNode } from 'react';

/* ----------------------------- AvatarCell ----------------------------- */
/**
 * Round avatar with a 2-letter initials fallback (spec AvatarCell:
 * "Round avatar or 2-letter initials in user/sponsor/employee tables").
 * If the image fails to load we fall back to initials rather than a broken img.
 */
export function AvatarCell({
  name,
  src,
}: {
  name: string;
  src: string | null;
}): ReactNode {
  const [broken, setBroken] = useState(false);
  const initials = toInitials(name);
  const showImage = Boolean(src) && !broken;

  return (
    <div className="flex items-center gap-3">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-semibold uppercase text-primary"
        aria-hidden={showImage ? undefined : true}
      >
        {showImage ? (
          <img
            src={src as string}
            alt={`${name} profile`}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setBroken(true)}
          />
        ) : (
          initials
        )}
      </span>
      <span className="font-medium text-textPrimary">{name || '—'}</span>
    </div>
  );
}

function toInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0] ?? '').slice(0, 2);
  return `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`;
}

/* ----------------------------- ActiveBadge ----------------------------- */
/** Status pill mirroring MUI chip styling for the is_active column. */
export function ActiveBadge({ active }: { active: boolean }): ReactNode {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        active
          ? 'bg-primary/10 text-primary'
          : 'bg-black/[0.06] text-textSecondary'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-primary' : 'bg-textSecondary'}`}
        aria-hidden="true"
      />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

/* ----------------------------- TextCell ----------------------------- */
/** Renders a value or an em-dash placeholder for null/empty. */
export function TextCell({ value }: { value: string | null }): ReactNode {
  const t = (value ?? '').trim();
  return t ? <span>{t}</span> : <span className="text-textSecondary">—</span>;
}

/* ----------------------------- RowActions ----------------------------- */
/**
 * Inline Edit / Delete icon buttons for a table row. Accessible names include
 * the record name so screen-reader users know which row each control affects.
 */
export function RowActions({
  recordName,
  onEdit,
  onDelete,
}: {
  recordName: string;
  onEdit: () => void;
  onDelete: () => void;
}): ReactNode {
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${recordName}`}
        title="Edit"
        className="rounded-full p-1.5 text-textSecondary transition-colors hover:bg-white/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <EditIcon />
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete ${recordName}`}
        title="Delete"
        className="rounded-full p-1.5 text-textSecondary transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
      >
        <DeleteIcon />
      </button>
    </div>
  );
}

function EditIcon(): ReactNode {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function DeleteIcon(): ReactNode {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}
