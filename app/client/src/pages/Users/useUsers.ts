/**
 * Data hooks for the Users section.
 *
 * Wraps the shared `listEntity` / `createEntity` / `updateEntity` /
 * `deleteEntity` helpers in @tanstack/react-query so:
 *   - the users list is cached by {page,limit,search} (re-selecting the Users
 *     tab does not refetch — matches the spec's tab behaviour);
 *   - the roles list (for the Add User role <select>) is fetched once and cached
 *     aggressively (it changes rarely);
 *   - create/update/delete mutations invalidate the users list so the table
 *     refetches the authoritative server state after a write.
 *
 * BACKEND ID CONTRACT (important — divergence from CONTRACTS.md §6):
 *   CONTRACTS.md says to use `user_role_id` as the id for edit/delete. The
 *   actual rebuild backend (`server/src/routes/crud.ts`) keys the user
 *   PATCH/DELETE routes on the **profile id** (`UserRow.id`), updating the
 *   linked user_roles row internally. We therefore send `row.id` to
 *   update/delete. If this section is ever pointed at the original GraphQL
 *   backend (which used the join-row id), revisit `userMutationId` below.
 *   Tracked as a shared-contract gap in the module return notes.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import {
  createEntity,
  deleteEntity,
  listEntity,
  updateEntity,
} from '@/lib/api';
import type { Paginated, RoleRow, UserRow } from '@/types/entities';

/* ----------------------------- Query keys ----------------------------- */

export interface UsersListArgs {
  page: number;
  limit: number;
  search: string;
}

export const usersKeys = {
  all: ['users'] as const,
  list: (args: UsersListArgs) => ['users', 'list', args] as const,
  roles: ['users', 'roles'] as const,
};

/* ------------------------------- Reads -------------------------------- */

/** Paginated users list. Key includes page/limit/search (per the contract). */
export function useUsersList(args: UsersListArgs) {
  return useQuery<Paginated<UserRow>>({
    queryKey: usersKeys.list(args),
    queryFn: () =>
      listEntity<UserRow>('users', {
        page: args.page,
        limit: args.limit,
        // only send a search term when non-empty (openQuestions[0]: server
        // search field is inferred — backend treats it best-effort).
        search: args.search.trim() || undefined,
      }),
    // keep showing the previous page while the next one loads (no flicker)
    placeholderData: keepPreviousData,
  });
}

/** Roles for the Add/Edit User role <select>. Cached — rarely changes. */
export function useRolesList() {
  return useQuery<Paginated<RoleRow>>({
    queryKey: usersKeys.roles,
    // The roles list is small; request a generous page so the select is
    // complete. (Spec confirms only {page,limit} on roles/list.)
    queryFn: () => listEntity<RoleRow>('roles', { page: 1, limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });
}

/* ------------------------------ Writes -------------------------------- */

/**
 * Payload sent to POST /api/v1/users and PATCH /api/v1/users/:id.
 * `password` and `roleId` are optional on edit (omit password to keep it).
 * Field names match the backend's CreateUserBody (camelCase aliases).
 */
export interface UserWritePayload {
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  mobile?: string;
  password?: string;
  roleId?: number;
}

/** The id to send to update/delete. See BACKEND ID CONTRACT note above. */
export function userMutationId(row: UserRow): string | number {
  return row.id;
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UserWritePayload) =>
      createEntity<{ data: { id: string } }, UserWritePayload>(
        'users',
        payload,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: usersKeys.all });
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string | number;
      payload: UserWritePayload;
    }) =>
      updateEntity<{ data: { id: string } }, UserWritePayload>(
        'users',
        id,
        payload,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: usersKeys.all });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => deleteEntity('users', id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: usersKeys.all });
    },
  });
}
