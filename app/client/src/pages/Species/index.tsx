/**
 * Species section — admin "Manage Species" page.
 *
 * Shared <DataTable> wired to POST /api/v1/master-plantspecies/list via React
 * Query, with create / edit / delete dialogs (mirrors the Sponsors module).
 * Manages master_plantspecies: botanical/common name, category, rates, and the
 * four functional traits (timber / pollination / nesting / fruit) that drive the
 * forest wizard picker and report slide 18.
 */
import { useMemo, useState } from 'react';
import {
  AddButton,
  Button,
  ConfirmDialog,
  DataTable,
  FormDialog,
  useToast,
  type Column,
} from '../../components';
import { errorText, type ApiError } from '../../lib/api';
import type { SpeciesRow } from '../../types/entities';
import { SpeciesForm } from './SpeciesForm';
import {
  EMPTY_SPECIES_FORM,
  hasErrors,
  speciesFormToPayload,
  speciesRowToForm,
  validateSpeciesForm,
  type SpeciesFormErrors,
  type SpeciesFormValues,
} from './speciesModel';
import {
  useCreateSpecies,
  useDeleteSpecies,
  useSpeciesList,
  useUpdateSpecies,
} from './useSpecies';

type DialogMode =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; row: SpeciesRow };

export default function Species() {
  const toast = useToast();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');

  const listQuery = useSpeciesList({ page, limit, search });
  const rows = listQuery.data?.data ?? [];
  const total = listQuery.data?.pagination.total ?? 0;

  const [dialog, setDialog] = useState<DialogMode>({ kind: 'closed' });
  const [values, setValues] = useState<SpeciesFormValues>(EMPTY_SPECIES_FORM);
  const [errors, setErrors] = useState<SpeciesFormErrors>({});
  const [touched, setTouched] = useState(false);

  const createMutation = useCreateSpecies();
  const updateMutation = useUpdateSpecies();
  const submitting = createMutation.isPending || updateMutation.isPending;

  const openCreate = () => {
    setValues(EMPTY_SPECIES_FORM);
    setErrors({});
    setTouched(false);
    setDialog({ kind: 'create' });
  };

  const openEdit = (row: SpeciesRow) => {
    setValues(speciesRowToForm(row));
    setErrors({});
    setTouched(false);
    setDialog({ kind: 'edit', row });
  };

  const closeDialog = () => {
    if (submitting) return;
    setDialog({ kind: 'closed' });
  };

  const handleFieldChange = <K extends keyof SpeciesFormValues>(
    key: K,
    value: SpeciesFormValues[K],
  ) => {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      if (touched) setErrors(validateSpeciesForm(next));
      return next;
    });
  };

  const resetForm = () => {
    if (dialog.kind === 'edit') {
      setValues(speciesRowToForm(dialog.row));
    } else {
      setValues(EMPTY_SPECIES_FORM);
    }
    setErrors({});
    setTouched(false);
  };

  const handleSubmit = () => {
    const nextErrors = validateSpeciesForm(values);
    setTouched(true);
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;

    const payload = speciesFormToPayload(values);

    if (dialog.kind === 'create') {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success('Species added');
          setDialog({ kind: 'closed' });
        },
        onError: (err: ApiError) =>
          toast.error(err.message || 'Failed to add species'),
      });
    } else if (dialog.kind === 'edit') {
      updateMutation.mutate(
        { id: String(dialog.row.id), payload },
        {
          onSuccess: () => {
            toast.success('Species updated');
            setDialog({ kind: 'closed' });
          },
          onError: (err: ApiError) =>
            toast.error(err.message || 'Failed to update species'),
        },
      );
    }
  };

  const [pendingDelete, setPendingDelete] = useState<SpeciesRow | null>(null);
  const deleteMutation = useDeleteSpecies();

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    deleteMutation.mutate(String(target.id), {
      onSuccess: () => {
        toast.success('Species deleted');
        setPendingDelete(null);
        if (rows.length === 1 && page > 1) setPage((p) => p - 1);
      },
      onError: (err: ApiError) =>
        toast.error(err.message || 'Failed to delete species'),
    });
  };

  const columns = useMemo<Column<SpeciesRow>[]>(
    () => [
      {
        key: 'speciesName',
        header: 'Botanical',
        render: (row) => (
          <span className="font-medium italic text-textPrimary">
            {row.speciesName || '—'}
          </span>
        ),
      },
      {
        key: 'commonName',
        header: 'Common',
        render: (row) => row.commonName?.trim() || '—',
      },
      {
        key: 'traits',
        header: 'Traits',
        className: 'w-36',
        render: (row) => (
          <div className="flex items-center gap-1">
            <TraitChip on={row.isTimberProduction} letter="T" title="Timber" />
            <TraitChip on={row.isFloweringPlant} letter="P" title="Pollination" />
            <TraitChip on={row.isNestingHabitat} letter="N" title="Nesting" />
            <TraitChip on={row.isFruitBearing} letter="F" title="Fruit" />
          </div>
        ),
      },
      {
        key: 'isActive',
        header: 'Active',
        className: 'w-20',
        render: (row) => <StatusBadge active={row.isActive} />,
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
              aria-label={`Edit ${row.speciesName ?? 'species'}`}
              title="Edit"
            >
              <EditIcon />
            </Button>
            <Button
              variant="text"
              className="!px-2 !py-1 text-danger hover:bg-danger/10"
              onClick={() => setPendingDelete(row)}
              aria-label={`Delete ${row.speciesName ?? 'species'}`}
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
    <section aria-labelledby="species-heading" className="space-y-4">
      <h1 id="species-heading" className="sr-only">
        Species
      </h1>

      <DataTable<SpeciesRow>
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        loading={listQuery.isLoading}
        error={listQuery.isError ? errorText(listQuery.error, 'Could not load species.') : null}
        emptyContent="No species found."
        caption="Species"
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
        searchPlaceholder="Search species..."
        toolbar={<AddButton label="Add Species" onClick={openCreate} />}
      />

      <FormDialog
        open={dialogOpen}
        title={dialog.kind === 'edit' ? 'Edit Species' : 'Add Species'}
        submitLabel={dialog.kind === 'edit' ? 'Save changes' : 'Add species'}
        submitting={submitting}
        onSubmit={handleSubmit}
        onClose={closeDialog}
        onReset={resetForm}
        maxWidth="lg"
      >
        <SpeciesForm
          values={values}
          errors={errors}
          onChange={handleFieldChange}
          disabled={submitting}
        />
      </FormDialog>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete species?"
        message={
          pendingDelete
            ? `"${pendingDelete.speciesName ?? 'This species'}" will be permanently removed from the catalog. This cannot be undone.`
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

function TraitChip({
  on,
  letter,
  title,
}: {
  on: boolean;
  letter: string;
  title: string;
}) {
  return (
    <span
      title={title}
      aria-label={`${title}: ${on ? 'yes' : 'no'}`}
      className={`inline-flex h-5 w-5 items-center justify-center rounded text-xs font-medium ${
        on ? 'bg-primary/15 text-primary' : 'bg-black/[0.06] text-textSecondary/50'
      }`}
    >
      {letter}
    </span>
  );
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
