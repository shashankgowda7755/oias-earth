/**
 * Sponsors module — React Query hooks for list + create/update/delete.
 *
 * - List query key includes {page,limit,search} so each distinct view is
 *   cached independently and re-selecting the Sponsors tab does not refetch
 *   (spec TabNav: "results are cached client-side (React Query)").
 * - Mutations invalidate the whole 'sponsors' list namespace so the table
 *   reflects writes immediately (spec flows[2]: "success toast -> refetch list").
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import {
  createEntity,
  deleteEntity,
  listEntity,
  updateEntity,
  type ApiError,
} from '../../lib/api';
import type { EntityName, Paginated, SponsorRow } from '../../types/entities';

/**
 * The list endpoint is `sponsors/list`, but the generic CRUD whitelist on the
 * server keys writes off the SINGULAR url segment `sponsor`
 * (server/src/routes/crud.ts -> ENTITIES.sponsor). Both segments are now valid
 * `EntityName` values (widened during integration), so no cast is needed.
 */
const LIST_ENTITY: EntityName = 'sponsors';
const WRITE_ENTITY: EntityName = 'sponsor'; // CRUD whitelist key (singular)

export const sponsorsKeys = {
  all: ['sponsors'] as const,
  list: (params: { page: number; limit: number; search: string }) =>
    ['sponsors', params] as const,
};

export interface SponsorListParams {
  page: number;
  limit: number;
  search: string;
}

export function useSponsorsList(
  params: SponsorListParams,
): UseQueryResult<Paginated<SponsorRow>, ApiError> {
  return useQuery({
    queryKey: sponsorsKeys.list(params),
    queryFn: () =>
      listEntity<SponsorRow>(LIST_ENTITY, {
        page: params.page,
        limit: params.limit,
        // only send a search term when non-empty (keeps the body minimal)
        search: params.search || undefined,
      }),
    placeholderData: (prev) => prev, // keep prior page visible during fetch
  });
}

export function useCreateSponsor() {
  const qc = useQueryClient();
  return useMutation<{ data: { id: string } }, ApiError, Record<string, unknown>>(
    {
      mutationFn: (payload) =>
        createEntity<{ data: { id: string } }>(WRITE_ENTITY, payload),
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: sponsorsKeys.all });
      },
    },
  );
}

export function useUpdateSponsor() {
  const qc = useQueryClient();
  return useMutation<
    { data: { id: string } },
    ApiError,
    { id: string; payload: Record<string, unknown> }
  >({
    mutationFn: ({ id, payload }) =>
      updateEntity<{ data: { id: string } }>(WRITE_ENTITY, id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: sponsorsKeys.all });
    },
  });
}

export function useDeleteSponsor() {
  const qc = useQueryClient();
  return useMutation<{ data: { id: string } }, ApiError, string>({
    mutationFn: (id) => deleteEntity<{ data: { id: string } }>(WRITE_ENTITY, id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: sponsorsKeys.all });
    },
  });
}
