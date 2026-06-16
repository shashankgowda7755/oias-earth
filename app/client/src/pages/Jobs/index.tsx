/**
 * Jobs — read-only async job monitor.
 *
 * Spec (communitree_admin_spec.json screens "Jobs"):
 *   columns: job_id, job_type, status, job_description, created_at, updated_at
 *   apisOnLoad: POST /api/v1/jobs/list  ({page,limit,search?})
 *   "read-only async job monitor (payload/result JSON). Likely background jobs
 *    e.g. report generation."
 *
 * Behaviour implemented:
 *   - DataTable wired to listEntity('jobs') via React Query. The query key
 *     includes page/limit/search, so the shell's tab cache (CONTRACTS §TabNav)
 *     keeps results warm and re-selecting the tab does not refetch.
 *   - status rendered as a coloured badge (StatusBadge).
 *   - a "View" row action opens a READ-ONLY FormDialog (JobDetailDialog) with
 *     job_description / payload / result as pretty JSON.
 *   - SearchBar filters by job_id / job_type (server-side `search` param —
 *     openQuestions[0]: the exact server search fields are inferred).
 *   - loading / empty / error states are owned by the shared DataTable.
 *   - a manual "Refresh" toolbar button re-fetches (useful for a live monitor
 *     where job statuses change server-side).
 *
 * Why NO create/edit/delete + NO field validation here (vs. the generic module
 * brief): Jobs is explicitly read-only — there is no Add/Edit form, so there
 * are no required-field inputs to validate and no write mutations to invalidate
 * the list. The AddButton is intentionally omitted from the toolbar. (If a
 * "retry/cancel job" action is added later it would be a mutation that calls
 * queryClient.invalidateQueries({ queryKey: ['jobs'] }) — noted for the
 * integrator. See spec openQuestions[6]: Job queue purpose is inferred.)
 *
 * IMPROVEMENT NOTE (per Phase-5 rules): a job monitor benefits from
 * auto-refresh + relative "x minutes ago" timestamps. We expose a manual
 * Refresh now (faithful, predictable) and leave a TODO to add polling
 * (React Query `refetchInterval`) once the backend confirms job lifecycle
 * semantics — polling an undocumented queue could mask real status meaning.
 */
import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  Button,
  DataTable,
  useToast,
  type Column,
} from '@/components';
import { listEntity, type ApiError } from '@/lib/api';
import type { JobRow } from '@/types/entities';
import { StatusBadge } from './StatusBadge';
import { JobDetailDialog } from './JobDetailDialog';
import { describeJob, formatTimestamp } from './lib/format';

export default function Jobs() {
  const toast = useToast();

  // server-pagination + search state (DataTable is controlled)
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');

  // detail dialog state
  const [selectedJob, setSelectedJob] = useState<JobRow | null>(null);
  const dialogOpen = selectedJob !== null;

  const query = useQuery({
    // key includes page/limit/search so each combination is cached separately
    queryKey: ['jobs', { page, limit, search }],
    queryFn: () => listEntity<JobRow>('jobs', { page, limit, search }),
    // keep the previous page visible while the next loads (no table flash)
    placeholderData: keepPreviousData,
  });

  const rows = query.data?.data ?? [];
  const total = query.data?.pagination.total ?? 0;
  const errorMessage = query.isError
    ? ((query.error as ApiError)?.message ?? 'Unable to load jobs.')
    : null;

  const handleRefresh = async () => {
    const result = await query.refetch();
    if (result.isError) {
      toast.error(
        (result.error as ApiError)?.message ?? 'Failed to refresh jobs.',
      );
    } else {
      toast.success('Jobs refreshed');
    }
  };

  const columns: Column<JobRow>[] = [
    {
      key: 'job_id',
      header: 'Job ID',
      className: 'font-medium',
      render: (row) => (
        <span className="break-all">{row.job_id || '—'}</span>
      ),
    },
    {
      key: 'job_type',
      header: 'Type',
      render: (row) => row.job_type || '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'job_description',
      header: 'Description',
      className: 'max-w-xs',
      render: (row) => (
        <span
          className="block truncate text-textSecondary"
          title={describeJob(row.job_description, 500)}
        >
          {describeJob(row.job_description)}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      className: 'whitespace-nowrap text-textSecondary',
      render: (row) => formatTimestamp(row.created_at),
    },
    {
      key: 'updated_at',
      header: 'Updated',
      className: 'whitespace-nowrap text-textSecondary',
      render: (row) => formatTimestamp(row.updated_at),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      className: 'w-px whitespace-nowrap text-right',
      render: (row) => (
        <Button
          variant="outlined"
          onClick={() => setSelectedJob(row)}
          aria-label={`View job ${row.job_id}`}
          className="px-3 py-1.5"
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <section aria-labelledby="section-Jobs" className="space-y-4">
      <h1 id="section-Jobs" className="sr-only">
        Jobs
      </h1>

      <DataTable<JobRow>
        caption="Async background jobs"
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        loading={query.isLoading}
        error={errorMessage}
        emptyContent="No jobs found."
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
        searchPlaceholder="Search by job ID or type..."
        // Read-only monitor: NO AddButton. Only a manual refresh control.
        toolbar={
          <Button
            variant="outlined"
            onClick={handleRefresh}
            loading={query.isRefetching}
            aria-label="Refresh jobs"
            startIcon={<RefreshIcon />}
          >
            Refresh
          </Button>
        }
      />

      <JobDetailDialog
        open={dialogOpen}
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
      />
    </section>
  );
}

function RefreshIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}
