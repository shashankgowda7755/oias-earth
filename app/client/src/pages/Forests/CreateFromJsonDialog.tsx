/**
 * "Create from JSON" — import the FULL forest/upsert payload (Vandalur shape).
 *
 * Flow:
 *  1. Paste or upload the forest JSON (JsonImportField).
 *  2. We parse live (tolerant of JSONC comments) and show a summary card:
 *     forest name · #boxes · #species · #trees.
 *  3. "Create Forest" -> forestUpsertFull(parsed) -> async forest_upsert_v1 job.
 *
 * This complements (does not replace) the 2-step quick wizard. The rich payload
 * is what the `forest-report-to-json` skill produces (report -> JSON -> upsert).
 */
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, FormDialog, useToast } from '@/components';
import type { ApiError } from '@/lib/api';
import { JsonImportField } from './JsonImportField';
import { forestUpsertFull, parseForestJson } from './forestApi';
import { summarizePayload, type FullForestPayload } from './fullTypes';

export interface CreateFromJsonDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

function SummaryStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-card border border-border bg-appbg px-4 py-3">
      <span className="text-xl font-semibold tabular-nums text-textPrimary">{value}</span>
      <span className="text-label text-textSecondary">{label}</span>
    </div>
  );
}

export function CreateFromJsonDialog({ open, onClose, onSaved }: CreateFromJsonDialogProps) {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [text, setText] = useState('');
  const [parseError, setParseError] = useState<string | undefined>(undefined);

  // Live parse: only surface an error once the user has typed something.
  const parsed = useMemo<FullForestPayload | null>(() => {
    if (!text.trim()) return null;
    const res = parseForestJson(text);
    if (res.ok) return res.payload;
    return null;
  }, [text]);

  const liveError = useMemo<string | undefined>(() => {
    if (!text.trim()) return undefined;
    const res = parseForestJson(text);
    return res.ok ? undefined : res.error;
  }, [text]);

  const summary = parsed ? summarizePayload(parsed) : null;

  const createMutation = useMutation({
    mutationFn: (payload: FullForestPayload) => forestUpsertFull(payload),
    onSuccess: () => {
      toast.success('Forest created from JSON. Processing job queued.');
      void queryClient.invalidateQueries({ queryKey: ['forest'] });
      onSaved?.();
      reset();
      onClose();
    },
    onError: (e: ApiError) => {
      toast.error(e.message || 'Failed to create forest from JSON.');
    },
  });

  const reset = () => {
    setText('');
    setParseError(undefined);
  };

  const handleClose = () => {
    if (createMutation.isPending) return;
    onClose();
  };

  const handleCreate = () => {
    const res = parseForestJson(text);
    if (!res.ok) {
      setParseError(res.error);
      toast.error(res.error);
      return;
    }
    setParseError(undefined);
    createMutation.mutate(res.payload);
  };

  const submitting = createMutation.isPending;
  const canCreate = Boolean(parsed) && !submitting;

  const footer = (
    <footer className="flex flex-col-reverse items-stretch gap-2 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <Button type="button" variant="text" onClick={handleClose} disabled={submitting}>
        Cancel
      </Button>
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outlined" onClick={reset} disabled={submitting || !text}>
          Clear
        </Button>
        <Button
          type="button"
          variant="primary"
          loading={submitting}
          disabled={!canCreate}
          onClick={handleCreate}
        >
          Create Forest
        </Button>
      </div>
    </footer>
  );

  return (
    <FormDialog
      open={open}
      title="Create Forest from JSON"
      maxWidth="lg"
      onClose={handleClose}
      onSubmit={() => {
        if (canCreate) handleCreate();
      }}
      submitting={submitting}
      footer={footer}
    >
      <p className="mb-4 text-sm text-textSecondary">
        Paste or upload the full <code className="rounded bg-black/[0.06] px-1">forest/upsert</code>{' '}
        JSON (the shape produced by the report-to-JSON tool). We&apos;ll summarise it before you
        create — boxes and trees are generated server-side from{' '}
        <code className="rounded bg-black/[0.06] px-1">box_data</code>.
      </p>

      <JsonImportField
        value={text}
        onChange={(v) => {
          setText(v);
          setParseError(undefined);
        }}
        error={parseError ?? liveError}
        disabled={submitting}
      />

      {summary ? (
        <div className="mt-5">
          <h3 className="mb-2 text-sm font-medium text-textPrimary">Summary</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryStat label="Forest" value={summary.forestName} />
            <SummaryStat label="Boxes" value={summary.boxCount} />
            <SummaryStat label="Species" value={summary.speciesCount} />
            <SummaryStat label="Trees" value={summary.treeCount} />
          </div>
        </div>
      ) : null}
    </FormDialog>
  );
}
