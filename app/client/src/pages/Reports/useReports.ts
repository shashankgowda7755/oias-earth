/**
 * React Query hooks for the Reports module.
 *
 * - useReportsList: keyed by {page, limit, search, filters} so tab re-selection
 *   serves from cache (matches the spec's cached-list behaviour) while any param
 *   change refetches. Returns the normalised Paginated<ReportRow> incl.
 *   `filter_limit` for the filter popover.
 * - mutation hooks invalidate the 'reports' list on success.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { ApiError } from '../../lib/api';
import type { Paginated, ReportRow } from '../../types/entities';
import {
  createReport,
  deleteReport,
  fetchForestOptions,
  listReports,
  updateReport,
  type ForestOption,
} from './reportApi';
import type { ReportWritePayload } from './reportForms';

export interface ReportListArgs {
  page: number;
  limit: number;
  search: string;
  filters: Record<string, unknown>;
}

const REPORTS_KEY = 'reports' as const;

export function reportsListKey(args: ReportListArgs) {
  return [REPORTS_KEY, args] as const;
}

export function useReportsList(args: ReportListArgs) {
  return useQuery<Paginated<ReportRow>, ApiError>({
    queryKey: reportsListKey(args),
    queryFn: () =>
      listReports({
        page: args.page,
        limit: args.limit,
        search: args.search || undefined,
        filters:
          Object.keys(args.filters).length > 0 ? args.filters : undefined,
      }),
    placeholderData: (prev) => prev, // keep table mounted across page changes
  });
}

/** Forest picker options — cached; rarely changes within a session. */
export function useForestOptions() {
  return useQuery<ForestOption[], ApiError>({
    queryKey: ['forest', 'options'],
    queryFn: fetchForestOptions,
    staleTime: 5 * 60 * 1000,
  });
}

function useInvalidateReports() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: [REPORTS_KEY] });
}

export function useCreateReport() {
  const invalidate = useInvalidateReports();
  return useMutation<{ id: string }, ApiError, ReportWritePayload>({
    mutationFn: (payload) => createReport(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateReport() {
  const invalidate = useInvalidateReports();
  return useMutation<
    { id: string },
    ApiError,
    { id: string; payload: ReportWritePayload }
  >({
    mutationFn: ({ id, payload }) => updateReport(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteReport() {
  const invalidate = useInvalidateReports();
  return useMutation<{ id: string }, ApiError, string>({
    mutationFn: (id) => deleteReport(id),
    onSuccess: invalidate,
  });
}
