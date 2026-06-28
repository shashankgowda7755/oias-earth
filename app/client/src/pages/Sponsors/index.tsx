/**
 * Sponsors section (spec screens[2]).
 *
 * Renders the shared <DataTable> wired to POST /api/v1/sponsors/list via React
 * Query, with create / edit / delete dialogs. Reproduces the documented flow
 * (flows[2] "Create simple entity"): + Add -> dialog -> validate required ->
 * write -> success toast -> close -> list refetch (via query invalidation).
 *
 * Columns (spec screens[2].dataDisplayed): logo (avatar), sponsor_name,
 * industry, headquarters, website_url (link), established_year, is_active
 * (badge), and a row-actions cell (edit / delete).
 *
 * OPEN QUESTIONS carried as TODOs:
 *  - openQuestions[0]: list search field name is inferred ({page,limit} only
 *    confirmed). We send `search`; harmless if the server ignores it.
 *  - openQuestions[4]: delete UX + soft-vs-hard delete not visually confirmed.
 *    Backend does a soft delete (is_active=false); we present a confirm step.
 *  - openQuestions[3]: writes go via REST (the shell speaks REST only).
 *
 * The FilterButton is rendered disabled: the per-table filter contents for
 * sponsors are not enumerated in the spec (openQuestions[5]), so we keep the
 * affordance visible (faithful) but inert rather than invent filter fields.
 */
import { useMemo, useState } from 'react';
import {
  AddButton,
  Button,
  ConfirmDialog,
  DataTable,
  FilterButton,
  FormDialog,
  useToast,
  type Column,
} from '../../components';
import { errorText, type ApiError } from '../../lib/api';
import type { SponsorRow } from '../../types/entities';
import { SponsorAvatar } from './SponsorAvatar';
import { SponsorForm } from './SponsorForm';
import {
  EMPTY_SPONSOR_FORM,
  hasErrors,
  sponsorFormToPayload,
  sponsorRowToForm,
  validateSponsorForm,
  type SponsorFormErrors,
  type SponsorFormValues,
} from './sponsorModel';
import {
  useCreateSponsor,
  useDeleteSponsor,
  useSponsorsList,
  useUpdateSponsor,
} from './useSponsors';

type DialogMode =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; row: SponsorRow };

export default function Sponsors() {
  const toast = useToast();

  /* ----------------------------- list state ----------------------------- */
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');

  const listQuery = useSponsorsList({ page, limit, search });
  const rows = listQuery.data?.data ?? [];
  const total = listQuery.data?.pagination.total ?? 0;

  /* --------------------------- create / edit ---------------------------- */
  const [dialog, setDialog] = useState<DialogMode>({ kind: 'closed' });
  const [values, setValues] = useState<SponsorFormValues>(EMPTY_SPONSOR_FORM);
  const [errors, setErrors] = useState<SponsorFormErrors>({});
  const [touched, setTouched] = useState(false);

  const createMutation = useCreateSponsor();
  const updateMutation = useUpdateSponsor();
  const submitting = createMutation.isPending || updateMutation.isPending;

  const openCreate = () => {
    setValues(EMPTY_SPONSOR_FORM);
    setErrors({});
    setTouched(false);
    setDialog({ kind: 'create' });
  };

  const openEdit = (row: SponsorRow) => {
    setValues(sponsorRowToForm(row));
    setErrors({});
    setTouched(false);
    setDialog({ kind: 'edit', row });
  };

  const closeDialog = () => {
    if (submitting) return;
    setDialog({ kind: 'closed' });
  };

  const handleFieldChange = <K extends keyof SponsorFormValues>(
    key: K,
    value: SponsorFormValues[K],
  ) => {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      // live-revalidate once the user has attempted a submit
      if (touched) setErrors(validateSponsorForm(next));
      return next;
    });
  };

  const resetForm = () => {
    if (dialog.kind === 'edit') {
      setValues(sponsorRowToForm(dialog.row));
    } else {
      setValues(EMPTY_SPONSOR_FORM);
    }
    setErrors({});
    setTouched(false);
  };

  const handleSubmit = () => {
    const nextErrors = validateSponsorForm(values);
    setTouched(true);
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return; // spec flows[2]: no submit on errors

    const payload = sponsorFormToPayload(values);

    if (dialog.kind === 'create') {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success('Sponsor created');
          setDialog({ kind: 'closed' });
        },
        onError: (err: ApiError) =>
          toast.error(err.message || 'Failed to create sponsor'),
      });
    } else if (dialog.kind === 'edit') {
      updateMutation.mutate(
        { id: dialog.row.id, payload },
        {
          onSuccess: () => {
            toast.success('Sponsor updated');
            setDialog({ kind: 'closed' });
          },
          onError: (err: ApiError) =>
            toast.error(err.message || 'Failed to update sponsor'),
        },
      );
    }
  };

  /* ------------------------------- delete ------------------------------- */
  const [pendingDelete, setPendingDelete] = useState<SponsorRow | null>(null);
  const deleteMutation = useDeleteSponsor();

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    deleteMutation.mutate(target.id, {
      onSuccess: () => {
        toast.success('Sponsor deleted');
        setPendingDelete(null);
        // if we just removed the last row on a page > 1, step back a page
        if (rows.length === 1 && page > 1) setPage((p) => p - 1);
      },
      onError: (err: ApiError) =>
        toast.error(err.message || 'Failed to delete sponsor'),
    });
  };

  /* ------------------------------ columns ------------------------------- */
  const columns = useMemo<Column<SponsorRow>[]>(
    () => [
      {
        key: 'logo',
        header: 'Logo',
        className: 'w-16',
        render: (row) => (
          <SponsorAvatar name={row.sponsor_name} logoUrl={row.sponsor_logo} />
        ),
      },
      {
        key: 'sponsor_name',
        header: 'Name',
        render: (row) => (
          <span className="font-medium text-textPrimary">
            {row.sponsor_name}
          </span>
        ),
      },
      {
        key: 'industry',
        header: 'Industry',
        render: (row) => row.industry?.trim() || '—',
      },
      {
        key: 'headquarters',
        header: 'Headquarters',
        render: (row) => row.headquarters?.trim() || '—',
      },
      {
        key: 'website_url',
        header: 'Website',
        render: (row) =>
          row.website_url ? (
            <a
              href={row.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              {prettyUrl(row.website_url)}
            </a>
          ) : (
            '—'
          ),
      },
      {
        key: 'established_year',
        header: 'Established',
        render: (row) => row.established_year || '—',
      },
      {
        key: 'is_active',
        header: 'Active',
        render: (row) => <StatusBadge active={row.is_active} />,
      },
      {
        key: 'actions',
        header: <span className="sr-only">Actions</span>,
        className: 'w-28 text-right',
        render: (row) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="text"
              className="!px-2 !py-1"
              onClick={() => openEdit(row)}
              aria-label={`Edit ${row.sponsor_name}`}
              title="Edit"
            >
              <EditIcon />
            </Button>
            <Button
              variant="text"
              className="!px-2 !py-1 text-danger hover:bg-danger/10"
              onClick={() => setPendingDelete(row)}
              aria-label={`Delete ${row.sponsor_name}`}
              title="Delete"
            >
              <TrashIcon />
            </Button>
          </div>
        ),
      },
    ],
    [page, rows.length],
  );

  const dialogOpen = dialog.kind !== 'closed';

  return (
    <section aria-labelledby="sponsors-heading" className="space-y-4">
      <h1 id="sponsors-heading" className="sr-only">
        Sponsors
      </h1>

      <DataTable<SponsorRow>
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        loading={listQuery.isLoading}
        error={listQuery.isError ? errorText(listQuery.error, 'Could not load sponsors.') : null}
        emptyContent="No sponsors found."
        caption="Sponsors"
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
        searchPlaceholder="Search sponsors..."
        toolbar={
          <>
            <AddButton label="Add Sponsor" onClick={openCreate} />
            {/* TODO(openQuestions[5]): sponsor filter fields not enumerated. */}
            <FilterButton disabled title="Filters not available" />
          </>
        }
      />

      <FormDialog
        open={dialogOpen}
        title={dialog.kind === 'edit' ? 'Edit Sponsor' : 'Add Sponsor'}
        submitLabel={dialog.kind === 'edit' ? 'Save changes' : 'Create'}
        submitting={submitting}
        onSubmit={handleSubmit}
        onClose={closeDialog}
        onReset={resetForm}
        maxWidth="lg"
      >
        <SponsorForm
          values={values}
          errors={errors}
          onChange={handleFieldChange}
          disabled={submitting}
        />
      </FormDialog>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete sponsor?"
        message={
          pendingDelete
            ? `"${pendingDelete.sponsor_name}" will be deactivated and removed from the list. This can be reversed by an administrator.`
            : ''
        }
        confirmLabel="Delete"
        confirming={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => {
          if (!deleteMutation.isPending) setPendingDelete(null);
        }}
      />
    </section>
  );
}

/* ------------------------------- helpers ------------------------------- */

/** Strip protocol + trailing slash for a tidy in-cell link label. */
function prettyUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        active
          ? 'bg-primary/10 text-primary'
          : 'bg-black/[0.06] text-textSecondary'
      }`}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function EditIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}
