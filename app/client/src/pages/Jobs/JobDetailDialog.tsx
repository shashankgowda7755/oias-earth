/**
 * Read-only detail view for a single job, rendered in the shared FormDialog.
 *
 * Jobs are a READ-ONLY async monitor (no create/edit/delete), so this dialog:
 *   - shows a summary header (job_id, type, status, created/updated)
 *   - shows job_description / payload / result as pretty JSON (JsonViewer)
 *   - has NO Save action — the footer is replaced with a single "Close" button
 *     via FormDialog's `footer` prop, and onSubmit is a no-op.
 *
 * We reuse FormDialog rather than a bespoke modal so the section inherits the
 * shared accessibility (role="dialog", Escape-to-close, focus management) and
 * the documented look.
 */
import { Button, FormDialog } from '@/components';
import type { JobRow } from '@/types/entities';
import { StatusBadge } from './StatusBadge';
import { JsonViewer } from './JsonViewer';
import { formatTimestamp } from './lib/format';

export interface JobDetailDialogProps {
  open: boolean;
  job: JobRow | null;
  onClose: () => void;
}

export function JobDetailDialog({ open, job, onClose }: JobDetailDialogProps) {
  // When closed, render nothing (FormDialog also guards on `open`).
  if (!open || !job) return null;

  return (
    <FormDialog
      open={open}
      title="Job details"
      maxWidth="lg"
      onClose={onClose}
      // Read-only: there is nothing to submit. onSubmit is required by the
      // shared FormDialog contract, so we close on it as a harmless fallback
      // (e.g. if Enter is pressed) — but the visible footer has no Save button.
      onSubmit={onClose}
      footer={
        <footer className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="primary" onClick={onClose}>
            Close
          </Button>
        </footer>
      }
    >
      <div className="space-y-5">
        {/* Summary grid */}
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <SummaryItem label="Job ID">
            <span className="break-all font-medium text-textPrimary">
              {job.job_id || '—'}
            </span>
          </SummaryItem>
          <SummaryItem label="Type">
            <span className="text-textPrimary">{job.job_type || '—'}</span>
          </SummaryItem>
          <SummaryItem label="Status">
            <StatusBadge status={job.status} />
          </SummaryItem>
          <SummaryItem label="Created by">
            <span className="break-all text-textPrimary">
              {job.created_by || '—'}
            </span>
          </SummaryItem>
          <SummaryItem label="Created at">
            <span className="text-textPrimary">
              {formatTimestamp(job.created_at)}
            </span>
          </SummaryItem>
          <SummaryItem label="Updated at">
            <span className="text-textPrimary">
              {formatTimestamp(job.updated_at)}
            </span>
          </SummaryItem>
        </dl>

        {/* JSON sections */}
        <div className="space-y-4 border-t border-border pt-4">
          <JsonViewer label="Job description" value={job.job_description} />
          <JsonViewer label="Payload" value={job.payload} />
          <JsonViewer label="Result" value={job.result} />
        </div>
      </div>
    </FormDialog>
  );
}

function SummaryItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-textSecondary">
        {label}
      </dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}
