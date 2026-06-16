/**
 * Users section (spec screens.Users).
 *
 * Faithful reproduction of the admin "Users" tab:
 *   - DataTable columns: User (avatar + first/last name), Username, Role,
 *     Email, Mobile, + per-row actions (Edit, Delete).
 *   - Toolbar: search box + "+ Add User".
 *   - Add/Edit via a shared FormDialog (UserFormDialog); Delete via ConfirmDialog.
 *   - Reads go through React Query (cached by page/limit/search); writes are
 *     mutations that invalidate the list (CONTRACTS.md §2 recommended usage).
 *
 * The spec lists 3x POST /graphql on load for the current-user bootstrap; the
 * rebuild shell carries the session from login in localStorage and speaks REST
 * only (no GraphQL client), so that bootstrap is intentionally omitted here.
 *
 * Open questions carried (do NOT invent business rules):
 *   - openQuestions[0]: list search/filter field names — search is sent best
 *     effort; a FilterButton is intentionally NOT rendered for Users because the
 *     spec defines no filter set for this table (openQuestions[5]).
 *   - openQuestions[4]: delete is a soft delete server-side (is_active=false);
 *     the confirm copy says "deactivate" to reflect that.
 *   - openQuestions[8]: whether non-SuperAdmin roles change visible
 *     tabs/columns is unconfirmed — the table is shown in full; see TODO below.
 */
import { useMemo, useState } from 'react';
import {
  AddButton,
  Button,
  ConfirmDialog,
  DataTable,
  useToast,
  type Column,
} from '@/components';
import type { ApiError } from '@/lib/api';
import type { UserRow } from '@/types/entities';
import { UserFormDialog } from './UserFormDialog';
import {
  useCreateUser,
  useDeleteUser,
  useRolesList,
  useUpdateUser,
  useUsersList,
  userMutationId,
  type UserWritePayload,
} from './useUsers';

const DEFAULT_LIMIT = 10;

/** Pull a flat, toast-ready message off either an ApiError or unknown throw. */
function errorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as ApiError).message;
    if (typeof m === 'string' && m) return m;
  }
  return fallback;
}

/** Display name from first/last; falls back to the username. */
function displayName(row: UserRow): string {
  const full = [row.firstName, row.lastName]
    .filter((p): p is string => Boolean(p && p.trim()))
    .join(' ')
    .trim();
  return full || row.username || '—';
}

/** Initials for the avatar fallback (first letters of name / username). */
function initials(row: UserRow): string {
  const name = displayName(row);
  const parts = name.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + second).toUpperCase() || '?';
}

function Avatar({ row }: { row: UserRow }) {
  const [broken, setBroken] = useState(false);
  const showImage = Boolean(row.imageUrl) && !broken;
  return showImage ? (
    <img
      src={row.imageUrl as string}
      alt=""
      onError={() => setBroken(true)}
      className="h-9 w-9 shrink-0 rounded-full object-cover"
    />
  ) : (
    <span
      aria-hidden="true"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
    >
      {initials(row)}
    </span>
  );
}

export default function Users() {
  const toast = useToast();

  // --- table state (server-side pagination + search) ---
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [search, setSearch] = useState('');

  // --- dialog state ---
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState<UserRow | null>(null);

  // --- data ---
  const listQuery = useUsersList({ page, limit, search });
  const rolesQuery = useRolesList();
  const createMut = useCreateUser();
  const updateMut = useUpdateUser();
  const deleteMut = useDeleteUser();

  const rows = listQuery.data?.data ?? [];
  const total = listQuery.data?.pagination.total ?? 0;

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (row: UserRow) => {
    setEditing(row);
    setFormOpen(true);
  };
  const closeForm = () => {
    if (createMut.isPending || updateMut.isPending) return;
    setFormOpen(false);
  };

  const handleSubmit = async (payload: UserWritePayload) => {
    try {
      if (editing) {
        await updateMut.mutateAsync({
          id: userMutationId(editing),
          payload,
        });
        toast.success('User updated');
      } else {
        await createMut.mutateAsync(payload);
        toast.success('User created');
        // After creating, jump to the first page so the new row is visible.
        setPage(1);
      }
      setFormOpen(false);
      setEditing(null);
    } catch (err) {
      toast.error(
        errorMessage(err, editing ? 'Failed to update user' : 'Failed to create user'),
      );
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteMut.mutateAsync(userMutationId(deleting));
      toast.success('User deactivated');
      setDeleting(null);
      // If we removed the last row on a page, step back a page.
      if (rows.length === 1 && page > 1) setPage((p) => p - 1);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to deactivate user'));
    }
  };

  const columns: Column<UserRow>[] = useMemo(
    () => [
      {
        key: 'user',
        header: 'User',
        render: (row) => (
          <div className="flex items-center gap-3">
            <Avatar row={row} />
            <span className="font-medium text-textPrimary">
              {displayName(row)}
            </span>
          </div>
        ),
      },
      {
        key: 'username',
        header: 'Username',
        render: (row) => row.username || '—',
      },
      {
        key: 'role',
        header: 'Role',
        render: (row) =>
          row.role ? (
            <span className="inline-flex items-center rounded-full bg-black/[0.06] px-2.5 py-0.5 text-xs font-medium text-textPrimary">
              {row.role}
            </span>
          ) : (
            '—'
          ),
      },
      {
        key: 'email',
        header: 'Email',
        render: (row) =>
          row.email ? (
            <a
              href={`mailto:${row.email}`}
              className="text-primary hover:underline"
            >
              {row.email}
            </a>
          ) : (
            '—'
          ),
      },
      {
        key: 'mobile',
        header: 'Mobile',
        render: (row) => row.mobile || '—',
      },
      {
        key: 'actions',
        header: <span className="sr-only">Actions</span>,
        headerClassName: 'text-right',
        className: 'text-right',
        render: (row) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="text"
              onClick={() => openEdit(row)}
              aria-label={`Edit ${displayName(row)}`}
              startIcon={<EditIcon />}
            >
              Edit
            </Button>
            <Button
              variant="text"
              onClick={() => setDeleting(row)}
              aria-label={`Delete ${displayName(row)}`}
              className="!text-danger hover:!bg-danger/10"
              startIcon={<TrashIcon />}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <section aria-label="Users">
      <DataTable<UserRow>
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        loading={listQuery.isLoading}
        error={
          listQuery.isError
            ? errorMessage(listQuery.error, 'Could not load users.')
            : null
        }
        emptyContent={
          search
            ? `No users match "${search}".`
            : 'No users found. Click "+ Add User" to create one.'
        }
        caption="List of admin users"
        page={page}
        limit={limit}
        total={total}
        onPageChange={setPage}
        onLimitChange={(next) => {
          setLimit(next);
          setPage(1);
        }}
        search={search}
        onSearch={(value) => {
          setSearch(value);
          setPage(1);
        }}
        searchPlaceholder="Search users..."
        toolbar={<AddButton label="Add User" onClick={openCreate} />}
      />

      <UserFormDialog
        open={formOpen}
        user={editing}
        roles={rolesQuery.data?.data ?? []}
        rolesLoading={rolesQuery.isLoading}
        submitting={createMut.isPending || updateMut.isPending}
        onClose={closeForm}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={deleting != null}
        title="Deactivate user?"
        message={
          deleting
            ? `Are you sure you want to deactivate ${displayName(deleting)}? They will lose access immediately. This can be reversed by re-activating the account.`
            : ''
        }
        confirmLabel="Deactivate"
        confirming={deleteMut.isPending}
        onConfirm={handleDelete}
        onCancel={() => {
          if (!deleteMut.isPending) setDeleting(null);
        }}
      />

      {/*
        TODO(openQuestions[8]): non-SuperAdmin roles may see a reduced column
        set or a read-only Users table. The spec does not confirm the per-role
        matrix, so all columns + actions are shown to any authenticated admin.
        Gate Edit/Delete on `useAuth().role` once the matrix is confirmed.
      */}
    </section>
  );
}

/* ------------------------------ Icons ------------------------------ */

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}
