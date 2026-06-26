/**
 * Reports section — DataTable of quarterly/periodic forest reports with
 * create / edit / delete and a filter popover driven by reports/list's
 * `filter_limit` metadata.
 *
 * Faithful to spec screens[Reports]:
 *   columns: year, quarter, report_date, plantation_date, start/end_date, mode,
 *   type, version, project_period, Forest (joined name), CreatedBy/UpdatedBy
 *   (joined user), is_active  (+ row actions).
 *   apisOnLoad: POST /api/v1/reports/list (response adds filter_limit).
 *
 * IMPROVEMENT NOTES (faithful build + proposal):
 *  - The original surfaces ~13 columns which overflows on small screens; we keep
 *    every documented column (faithful) but make the table horizontally
 *    scrollable (DataTable already wraps in overflow-x-auto) and right-pin a
 *    sticky-feeling Actions column. PROPOSAL: a column-visibility / density
 *    toggle would scale better than horizontal scroll.
 *  - Writes hit the SINGULAR `/report` CRUD route while reads hit the PLURAL
 *    `/reports/list` route (backend quirk). See reportApi.ts; flagged as a
 *    shared-contract gap so the integrator can align EntityName.
 *  - report_data JSON schema is undocumented (openQuestions[6]); the form takes
 *    free-form validated JSON instead of inventing fields.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AddButton,
  Button,
  ConfirmDialog,
  DataTable,
  FilterButton,
  useToast,
  type Column,
} from '../../components';
import type { ApiError } from '../../lib/api';
import type { ReportRow } from '../../types/entities';
import { ReportFormDialog } from './ReportFormDialog';
import {
  EMPTY_FILTERS,
  ReportFilterPopover,
  hasActiveFilters,
  toFilterParams,
  type ReportFilterValues,
} from './ReportFilterPopover';
import {
  EMPTY_REPORT_FORM,
  formFromRow,
  formToPayload,
  type ReportFormState,
} from './reportForms';
import {
  useCreateReport,
  useDeleteReport,
  useForestOptions,
  useReportsList,
  useUpdateReport,
} from './useReports';
import { sendReport, getReportRecipient } from './reportApi';

type DialogState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; row: ReportRow };

export default function Reports() {
  const toast = useToast();
  const navigate = useNavigate();

  // --- table/query state ---
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<ReportFilterValues>(EMPTY_FILTERS);

  const filterParams = useMemo(() => toFilterParams(filters), [filters]);

  const { data, isLoading, isFetching, error } = useReportsList({
    page,
    limit,
    search,
    filters: filterParams,
  });

  const forestOptionsQuery = useForestOptions();
  const forestOptions = forestOptionsQuery.data ?? [];

  const rows = data?.data ?? [];
  const total = data?.pagination.total ?? 0;

  // --- dialogs / popover ---
  const [dialog, setDialog] = useState<DialogState>({ kind: 'closed' });
  const [filterOpen, setFilterOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ReportRow | null>(null);
  const [pendingSend, setPendingSend] = useState<ReportRow | null>(null);
  const [sendTo, setSendTo] = useState('');
  const [sending, setSending] = useState(false);

  const openSend = (r: ReportRow) => {
    setPendingSend(r);
    setSendTo('');
    getReportRecipient(r.id)
      .then((res) => setSendTo(res.email || ''))
      .catch(() => undefined);
  };

  const handleSend = async () => {
    if (!pendingSend) return;
    setSending(true);
    try {
      const r = await sendReport(pendingSend.id, sendTo.trim());
      toast.success(`Report sent to ${r.to}.`);
      setPendingSend(null);
      setSendTo('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Send failed.');
    } finally {
      setSending(false);
    }
  };

  const createMut = useCreateReport();
  const updateMut = useUpdateReport();
  const deleteMut = useDeleteReport();

  const initialForm: ReportFormState =
    dialog.kind === 'edit' ? formFromRow(dialog.row) : EMPTY_REPORT_FORM;

  const handleSubmit = (state: ReportFormState) => {
    const payload = formToPayload(state);
    if (dialog.kind === 'create') {
      createMut.mutate(payload, {
        onSuccess: () => {
          toast.success('Report created');
          setDialog({ kind: 'closed' });
          setPage(1);
        },
        onError: (e: ApiError) =>
          toast.error(e.message || 'Failed to create report'),
      });
    } else if (dialog.kind === 'edit') {
      updateMut.mutate(
        { id: dialog.row.id, payload },
        {
          onSuccess: () => {
            toast.success('Report updated');
            setDialog({ kind: 'closed' });
          },
          onError: (e: ApiError) =>
            toast.error(e.message || 'Failed to update report'),
        },
      );
    }
  };

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    deleteMut.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success('Report deleted');
        setPendingDelete(null);
        // step back a page if we just removed the last row on this page
        if (rows.length === 1 && page > 1) setPage((p) => p - 1);
      },
      onError: (e: ApiError) => {
        toast.error(e.message || 'Failed to delete report');
        setPendingDelete(null);
      },
    });
  };

  const columns = useMemo<Column<ReportRow>[]>(
    () => [
      {
        key: 'year',
        header: 'Year',
        render: (r) => r.year ?? '—',
        className: 'whitespace-nowrap',
      },
      {
        key: 'quarter',
        header: 'Quarter',
        render: (r) => (r.quarter != null ? `Q${r.quarter}` : '—'),
        className: 'whitespace-nowrap',
      },
      {
        key: 'Forest',
        header: 'Forest',
        render: (r) =>
          r.Forest ? (
            <span className="whitespace-nowrap">
              {r.Forest.forest_name}
              {r.Forest.forest_unique_id ? (
                <span className="ml-1 text-textSecondary">
                  ({r.Forest.forest_unique_id})
                </span>
              ) : null}
            </span>
          ) : (
            '—'
          ),
      },
      {
        key: 'type',
        header: 'Type',
        render: (r) => r.type || '—',
        className: 'whitespace-nowrap capitalize',
      },
      {
        key: 'mode',
        header: 'Mode',
        render: (r) => r.mode || '—',
        className: 'whitespace-nowrap capitalize',
      },
      {
        key: 'version',
        header: 'Version',
        render: (r) => r.version ?? '—',
        className: 'whitespace-nowrap',
      },
      {
        key: 'project_period',
        header: 'Project Period',
        render: (r) => (r.project_period != null ? `${r.project_period} yr` : '—'),
        className: 'whitespace-nowrap',
      },
      {
        key: 'report_date',
        header: 'Report Date',
        render: (r) => formatDate(r.report_date),
        className: 'whitespace-nowrap',
      },
      {
        key: 'plantation_date',
        header: 'Plantation Date',
        render: (r) => formatDate(r.plantation_date),
        className: 'whitespace-nowrap',
      },
      {
        key: 'start_date',
        header: 'Start Date',
        render: (r) => formatDate(r.start_date),
        className: 'whitespace-nowrap',
      },
      {
        key: 'end_date',
        header: 'End Date',
        render: (r) => formatDate(r.end_date),
        className: 'whitespace-nowrap',
      },
      {
        key: 'created_by',
        header: 'Created By',
        render: (r) => r.CreatedBy?.first_name || '—',
        className: 'whitespace-nowrap',
      },
      {
        key: 'updated_by',
        header: 'Updated By',
        render: (r) => r.UpdatedBy?.first_name || '—',
        className: 'whitespace-nowrap',
      },
      {
        key: 'is_active',
        header: 'Active',
        render: (r) => <StatusPill active={r.is_active} />,
        className: 'whitespace-nowrap',
      },
    ],
    [],
  );

  // Row actions render in DataTable's LEFT sticky column (consistent site-wide).
  const renderRowActions = (r: ReportRow) => {
    const forestId = r.forest_id ?? r.Forest?.id ?? '';
    const viewUrl = forestId
      ? `/report/forest/${forestId}?year=${r.year ?? ''}&quarter=${r.quarter ?? ''}`
      : null;
    return (
      <RowActions
        onView={viewUrl ? () => window.open(viewUrl, '_blank', 'noopener') : undefined}
        onSend={() => openSend(r)}
        onEdit={() => setDialog({ kind: 'edit', row: r })}
        onDelete={() => setPendingDelete(r)}
        label={`report ${r.Forest?.forest_name ?? ''} ${r.year} Q${r.quarter}`}
      />
    );
  };

  const submitting = createMut.isPending || updateMut.isPending;

  return (
    <section aria-label="Reports">
      <DataTable<ReportRow>
        columns={columns}
        rows={rows}
        renderRowActions={renderRowActions}
        getRowId={(r) => r.id}
        loading={isLoading}
        error={error ? error.message : null}
        emptyContent={
          hasActiveFilters(filters) || search
            ? 'No reports match your filters.'
            : 'No reports yet. Click “Add Report” to create one.'
        }
        page={page}
        limit={limit}
        total={total}
        onPageChange={setPage}
        onLimitChange={(l) => {
          setLimit(l);
          setPage(1);
        }}
        search={search}
        onSearch={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search reports..."
        caption="Reports list"
        onRowClick={(r) => {
          const fid = r.forest_id ?? r.Forest?.id;
          if (fid) navigate(`/report/forest/${fid}?year=${r.year ?? ''}&quarter=${r.quarter ?? ''}`);
        }}
        toolbar={
          <>
            <AddButton
              label="Add Report"
              onClick={() => setDialog({ kind: 'create' })}
            />
            {/* relative wrapper anchors the filter popover to the button */}
            <div className="relative">
              <FilterButton
                active={hasActiveFilters(filters)}
                aria-label="Filter reports"
                aria-expanded={filterOpen}
                aria-haspopup="dialog"
                onClick={() => setFilterOpen((o) => !o)}
              />
              <ReportFilterPopover
                open={filterOpen}
                onClose={() => setFilterOpen(false)}
                filterLimit={data?.filter_limit}
                forestOptions={forestOptions}
                value={filters}
                onApply={(next) => {
                  setFilters(next);
                  setPage(1);
                  setFilterOpen(false);
                }}
                onClear={() => {
                  setFilters(EMPTY_FILTERS);
                  setPage(1);
                  setFilterOpen(false);
                }}
              />
            </div>
          </>
        }
      />

      {/* subtle background refetch indicator (keeps prior page visible) */}
      {isFetching && !isLoading ? (
        <p className="mt-2 text-xs text-textSecondary" role="status">
          Updating…
        </p>
      ) : null}

      <ReportFormDialog
        open={dialog.kind === 'create' || dialog.kind === 'edit'}
        mode={dialog.kind === 'edit' ? 'edit' : 'create'}
        initialValue={initialForm}
        forestOptions={forestOptions}
        forestOptionsLoading={forestOptionsQuery.isLoading}
        submitting={submitting}
        onSubmit={handleSubmit}
        onClose={() => setDialog({ kind: 'closed' })}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete report?"
        message={
          pendingDelete
            ? `This will deactivate the ${pendingDelete.year} Q${pendingDelete.quarter} report for ${pendingDelete.Forest?.forest_name ?? 'this forest'}. You can recreate it later.`
            : ''
        }
        confirmLabel="Delete"
        confirming={deleteMut.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      {pendingSend !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-card border border-border bg-surface p-6 shadow-dialog">
            <h3 className="text-lg font-semibold text-textPrimary">Send report</h3>
            <p className="mt-1 text-sm text-textSecondary">
              {pendingSend.Forest?.forest_name ?? 'Forest'} · Q{pendingSend.quarter} {pendingSend.year} — a branded email with the live report link is sent via Gmail.
            </p>
            <label className="mt-4 block text-sm text-textSecondary" htmlFor="send-to">Recipient email</label>
            <input
              id="send-to"
              type="email"
              value={sendTo}
              onChange={(e) => setSendTo(e.target.value)}
              placeholder="sponsor@example.com"
              className="mt-1 w-full rounded-button border border-border bg-appbg px-3 py-2 text-sm text-textPrimary focus:border-primary focus:outline-none"
              autoFocus
            />
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setPendingSend(null)} className="rounded-button border border-border px-4 py-2 text-sm text-textPrimary hover:bg-white/5">Cancel</button>
              <Button variant="primary" onClick={handleSend} loading={sending} disabled={!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(sendTo.trim())}>Send</Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

/* ----------------------------- helpers ----------------------------- */

function formatDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        active
          ? 'bg-primary/10 text-primary'
          : 'bg-white/5 text-textSecondary'
      }`}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

/**
 * Per-row Edit / Delete menu. A small accessible popover menu (button +
 * role="menu") rather than always-visible icons, matching the compact MUI
 * row-action affordance.
 */
function RowActions({
  onView,
  onSend,
  onEdit,
  onDelete,
  label,
}: {
  onView?: () => void;
  onSend?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative inline-block text-left"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        type="button"
        aria-label={`Actions for ${label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="rounded-full p-1.5 text-textSecondary hover:bg-white/5 hover:text-textPrimary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute left-0 z-40 mt-1 w-40 overflow-hidden rounded-card border border-border bg-surface py-1 text-left shadow-dialog"
        >
          {onView ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onView();
              }}
              className="block w-full px-4 py-2 text-sm text-textPrimary hover:bg-white/5"
            >
              View report ↗
            </button>
          ) : null}
          {onSend ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onSend();
              }}
              className="block w-full px-4 py-2 text-sm text-textPrimary hover:bg-white/5"
            >
              Send report
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="block w-full px-4 py-2 text-sm text-textPrimary hover:bg-white/5"
          >
            Edit
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="block w-full px-4 py-2 text-sm text-danger hover:bg-danger/5"
          >
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}
