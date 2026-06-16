/**
 * React Query data layer for the Employees section.
 *
 * - List query key includes {page,limit,search} so each distinct view is cached
 *   independently and re-selecting the Employees tab does not refetch (spec
 *   TabNav behavior: "results are cached client-side (React Query)").
 * - Mutations (create/update/delete) invalidate every 'employee' list query on
 *   success so the table reflects the write (spec flow "Create simple entity":
 *   success -> refetch list).
 *
 * The REST route segment for employees is the singular 'employee' (see
 * spec rest_list_shapes.json "employee/list" and CONTRACTS.md EntityName).
 * listEntity() already normalises the flat {data,total,page,limit} pagination
 * shape for us (openQuestions[7]).
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import {
  listEntity,
  createEntity,
  updateEntity,
  deleteEntity,
  type ApiError,
} from '@/lib/api';
import type { EmployeeRow, Paginated } from '@/types/entities';

export const EMPLOYEE_ENTITY = 'employee' as const;

export interface EmployeeListArgs {
  page: number;
  limit: number;
  search: string;
}

/** Root key for all employee list caches; mutations invalidate this prefix. */
export const employeeListRootKey = [EMPLOYEE_ENTITY, 'list'] as const;

export function employeeListKey(args: EmployeeListArgs) {
  return [...employeeListRootKey, args] as const;
}

export function useEmployeeList(
  args: EmployeeListArgs,
): UseQueryResult<Paginated<EmployeeRow>, ApiError> {
  const { page, limit, search } = args;
  return useQuery<Paginated<EmployeeRow>, ApiError>({
    queryKey: employeeListKey(args),
    queryFn: () =>
      listEntity<EmployeeRow>(EMPLOYEE_ENTITY, {
        page,
        limit,
        // Only send a search term when present; backend search field is
        // inferred (openQuestions[0]).
        ...(search ? { search } : {}),
      }),
    // Keep the previous page visible while the next page loads (no flash of
    // empty/loading between pages) — matches the original's table behavior.
    placeholderData: (prev) => prev,
  });
}

function useInvalidateEmployeeLists() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: employeeListRootKey });
}

export function useCreateEmployee() {
  const invalidate = useInvalidateEmployeeLists();
  return useMutation<unknown, ApiError, Record<string, unknown>>({
    mutationFn: (payload) => createEntity(EMPLOYEE_ENTITY, payload),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateEmployee() {
  const invalidate = useInvalidateEmployeeLists();
  return useMutation<
    unknown,
    ApiError,
    { id: string; payload: Record<string, unknown> }
  >({
    mutationFn: ({ id, payload }) => updateEntity(EMPLOYEE_ENTITY, id, payload),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteEmployee() {
  const invalidate = useInvalidateEmployeeLists();
  return useMutation<unknown, ApiError, string>({
    // TODO(openQuestions[4]): delete UX + soft vs hard delete is unconfirmed.
    // The data model carries `is_active`, suggesting a soft delete; the backend
    // DELETE route soft-deletes (sets is_active=false) per the server contract.
    // We surface a standard confirm + DELETE and let the server decide.
    mutationFn: (id) => deleteEntity(EMPLOYEE_ENTITY, id),
    onSuccess: () => invalidate(),
  });
}
