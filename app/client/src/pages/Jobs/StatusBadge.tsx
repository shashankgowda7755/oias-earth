/**
 * Status pill for the Jobs monitor.
 *
 * The spec (screens + brief) names four statuses — pending / running / done /
 * failed — but the LIVE REST sample returns "completed" (see
 * spec/rest_list_shapes.json jobs/list). We map BOTH the documented names and
 * the observed synonyms to a small colour palette, and degrade gracefully to a
 * neutral grey badge for any status we haven't seen.
 *
 * Colours stay within the design-token family (semantic green/red/amber/blue)
 * rather than hardcoding new brand hexes — Tailwind's stock palette is used for
 * the non-token semantic states since the theme only exposes primary/danger.
 *
 * TODO(spec openQuestions[6]): the full set of job statuses + their lifecycle
 * is undocumented (the Job queue purpose is inferred). Confirm the enum with
 * the backend and tighten this map (and the JobRow.status type) once known.
 */
import type { ReactNode } from 'react';

type Tone = 'success' | 'danger' | 'running' | 'pending' | 'neutral';

const TONE_CLASSES: Record<Tone, string> = {
  // success — uses the brand primary green family
  success: 'bg-primary/10 text-primary ring-1 ring-inset ring-primary/30',
  // failure — uses the danger token
  danger: 'bg-danger/10 text-danger ring-1 ring-inset ring-danger/30',
  // running / in-progress — informational blue
  running: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20',
  // pending / queued — amber
  pending: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20',
  // anything unrecognised — neutral grey
  neutral: 'bg-black/[0.06] text-textSecondary ring-1 ring-inset ring-black/10',
};

/** Map a raw status string to a colour tone. Case-insensitive. */
function toneForStatus(status: string): Tone {
  const s = status.trim().toLowerCase();
  switch (s) {
    case 'done':
    case 'completed':
    case 'complete':
    case 'success':
    case 'succeeded':
    case 'finished':
      return 'success';
    case 'failed':
    case 'failure':
    case 'error':
    case 'errored':
    case 'cancelled':
    case 'canceled':
      return 'danger';
    case 'running':
    case 'processing':
    case 'in_progress':
    case 'in-progress':
    case 'active':
      return 'running';
    case 'pending':
    case 'queued':
    case 'waiting':
    case 'scheduled':
      return 'pending';
    default:
      return 'neutral';
  }
}

export interface StatusBadgeProps {
  status: string | null | undefined;
}

export function StatusBadge({ status }: StatusBadgeProps): ReactNode {
  const value = status?.trim();
  if (!value) {
    return <span className="text-textSecondary">—</span>;
  }
  const tone = toneForStatus(value);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${TONE_CLASSES[tone]}`}
      // Surface the exact raw value on hover even when capitalised for display.
      title={value}
    >
      {value.replace(/[_-]+/g, ' ')}
    </span>
  );
}
