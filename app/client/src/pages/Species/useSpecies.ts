/**
 * Species module — React Query hooks for list + create/update/delete.
 *
 * Mirrors useSponsors: the list endpoint is `master-plantspecies/list`, but the
 * generic CRUD whitelist keys writes off the segment `species`
 * (server/src/routes/crud.ts -> ENTITIES.species).
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
import type { EntityName, Paginated, SpeciesRow } from '../../types/entities';

const LIST_ENTITY: EntityName = 'master-plantspecies';
const WRITE_ENTITY: EntityName = 'species'; // CRUD whitelist key

export const speciesKeys = {
  all: ['species'] as const,
  list: (params: { page: number; limit: number; search: string }) =>
    ['species', params] as const,
};

export interface SpeciesListParams {
  page: number;
  limit: number;
  search: string;
}

export function useSpeciesList(
  params: SpeciesListParams,
): UseQueryResult<Paginated<SpeciesRow>, ApiError> {
  return useQuery({
    queryKey: speciesKeys.list(params),
    queryFn: () =>
      listEntity<SpeciesRow>(LIST_ENTITY, {
        page: params.page,
        limit: params.limit,
        search: params.search || undefined,
      }),
    placeholderData: (prev) => prev,
  });
}

export function useCreateSpecies() {
  const qc = useQueryClient();
  return useMutation<{ data: { id: string } }, ApiError, Record<string, unknown>>({
    mutationFn: (payload) =>
      createEntity<{ data: { id: string } }>(WRITE_ENTITY, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: speciesKeys.all });
    },
  });
}

export function useUpdateSpecies() {
  const qc = useQueryClient();
  return useMutation<
    { data: { id: string } },
    ApiError,
    { id: string; payload: Record<string, unknown> }
  >({
    mutationFn: ({ id, payload }) =>
      updateEntity<{ data: { id: string } }>(WRITE_ENTITY, id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: speciesKeys.all });
    },
  });
}

export function useDeleteSpecies() {
  const qc = useQueryClient();
  return useMutation<{ data: { id: string } }, ApiError, string>({
    mutationFn: (id) => deleteEntity<{ data: { id: string } }>(WRITE_ENTITY, id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: speciesKeys.all });
    },
  });
}
