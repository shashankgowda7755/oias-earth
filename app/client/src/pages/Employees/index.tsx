/**
 * Employees section (spec screens[Employees]).
 *
 * Columns (spec dataDisplayed): profile_image (avatar), name, designation,
 * contact_no, email_id, is_active, + row actions (edit / delete).
 * List source: POST /api/v1/employee/list — note the flat
 * {data,total,page,limit} pagination shape, which listEntity() normalises for
 * us (openQuestions[7]).
 *
 * Data flow:
 *   - useEmployeeList(React Query) drives the table; key includes page/limit/
 *     search so views are cached and the tab does not refetch on re-select.
 *   - Add/Edit open the shared FormDialog via EmployeeFormDialog.
 *   - Delete opens the shared ConfirmDialog.
 *   - create/update/delete mutations invalidate the list and toast on
 *     success/error (spec flow "Create simple entity").
 *
 * The DataTable owns search debouncing and pagination UI; this component owns
 * the committed page/limit/search state and the dialog/selection state.
 *
 * FILTER: the spec shows a FilterButton on every table but does not define the
 * Employees filter popover contents (openQuestions[5]). We render the button
 * disabled with an explanatory title rather than invent filter fields.
 */
import { useMemo, useState } from 'react';
import {
  AddButton,
  ConfirmDialog,
  DataTable,
  FilterButton,
  useToast,
  type Column,
} from '@/components';
import type { EmployeeRow } from '@/types/entities';
import { AvatarCell, ActiveBadge, TextCell, RowActions } from './cells';
import { EmployeeFormDialog } from './EmployeeFormDialog';
import {
  useEmployeeList,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
} from './useEmployees';
import {
  type EmployeeFormValues,
  emptyEmployeeForm,
  toEmployeePayload,
} from './validation';

type DialogState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; row: EmployeeRow };

function rowToFormValues(row: EmployeeRow): EmployeeFormValues {
  return {
    name: row.name ?? '',
    profile_image: row.profile_image ?? '',
    designation: row.designation ?? '',
    contact_no: row.contact_no ?? '',
    email_id: row.email_id ?? '',
    is_active: row.is_active,
  };
}

export default function Employees() {
  const toast = useToast();

  // Committed list controls.
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');

  // Dialog + delete selection.
  const [dialog, setDialog] = useState<DialogState>({ kind: 'closed' });
  const [pendingDelete, setPendingDelete] = useState<EmployeeRow | null>(null);

  const listQuery = useEmployeeList({ page, limit, search });
  const createMut = useCreateEmployee();
  const updateMut = useUpdateEmployee();
  const deleteMut = useDeleteEmployee();

  const rows = listQuery.data?.data ?? [];
  const total = listQuery.data?.pagination.total ?? 0;

  const columns = useMemo<Column<EmployeeRow>[]>(
    () => [
      {
        key: 'name',
        header: 'Name',
        render: (row) => <AvatarCell name={row.name} src={row.profile_image} />,
      },
      {
        key: 'designation',
        header: 'Designation',
        render: (row) => <TextCell value={row.designation} />,
      },
      {
        key: 'contact_no',
        header: 'Contact',
        render: (row) => <TextCell value={row.contact_no} />,
      },
      {
        key: 'email_id',
        header: 'Email',
        render: (row) => <TextCell value={row.email_id} />,
      },
      {
        key: 'is_active',
        header: 'Active',
        render: (row) => <ActiveBadge active={row.is_active} />,
      },
      {
        key: 'actions',
        header: <span className="sr-only">Actions</span>,
        headerClassName: 'text-right',
        className: 'text-right w-28',
        render: (row) => (
          <RowActions
            recordName={row.name || 'employee'}
            onEdit={() => setDialog({ kind: 'edit', row })}
            onDelete={() => setPendingDelete(row)}
          />
        ),
      },
    ],
    [],
  );

  const dialogInitial = useMemo<EmployeeFormValues>(() => {
    return dialog.kind === 'edit'
      ? rowToFormValues(dialog.row)
      : emptyEmployeeForm;
    // Recreate per dialog open so the form re-seeds; depends on the dialog.
  }, [dialog]);

  const submitting = createMut.isPending || updateMut.isPending;

  const handleSubmit = (values: EmployeeFormValues) => {
    const payload = toEmployeePayload(values);
    if (dialog.kind === 'create') {
      createMut.mutate(payload, {
        onSuccess: () => {
          toast.success('Employee added.');
          setDialog({ kind: 'closed' });
        },
        onError: (err) => toast.error(err.message),
      });
    } else if (dialog.kind === 'edit') {
      updateMut.mutate(
        { id: dialog.row.id, payload },
        {
          onSuccess: () => {
            toast.success('Employee updated.');
            setDialog({ kind: 'closed' });
          },
          onError: (err) => toast.error(err.message),
        },
      );
    }
  };

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    const row = pendingDelete;
    deleteMut.mutate(row.id, {
      onSuccess: () => {
        toast.success('Employee deleted.');
        setPendingDelete(null);
        // If we just removed the last row on a page past the first, step back
        // so the user is not stranded on an empty page.
        if (rows.length === 1 && page > 1) setPage((p) => p - 1);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <section aria-labelledby="employees-heading" className="space-y-4">
      <h1 id="employees-heading" className="sr-only">
        Employees
      </h1>

      <DataTable<EmployeeRow>
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        loading={listQuery.isLoading}
        error={listQuery.isError ? listQuery.error.message : null}
        emptyContent="No employees found."
        caption="Employees"
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
        searchPlaceholder="Search employees..."
        toolbar={
          <>
            <AddButton
              label="Add Employee"
              onClick={() => setDialog({ kind: 'create' })}
            />
            {/* TODO(openQuestions[5]): Employees filter popover contents are
                undefined in the spec. Disabled until specified. */}
            <FilterButton
              disabled
              title="Filters for employees are not defined in the spec yet"
              aria-label="Filter employees (unavailable)"
            />
          </>
        }
      />

      <EmployeeFormDialog
        open={dialog.kind !== 'closed'}
        mode={dialog.kind === 'edit' ? 'edit' : 'create'}
        initialValues={dialogInitial}
        submitting={submitting}
        onSubmit={handleSubmit}
        onClose={() => setDialog({ kind: 'closed' })}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete employee?"
        message={
          pendingDelete
            ? `Delete "${pendingDelete.name || 'this employee'}"? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        confirming={deleteMut.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </section>
  );
}
