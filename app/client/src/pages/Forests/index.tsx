/**
 * Forests section (spec screen "Forests").
 *
 * - DataTable(forest) with the full documented column set, server pagination,
 *   debounced search (POST /api/v1/forest/list {page,limit,search}).
 * - Toolbar "+ Add Forest" opens the 2-step wizard (AddForestWizard).
 * - Row kebab (⋮) menu: View / Edit / Delete (CONFIRMED row actions). View opens
 *   the read-only detail; Edit reopens the wizard prefilled (id => upsert UPDATE);
 *   Delete confirms with the danger ConfirmDialog and HARD-deletes via
 *   deleteEntity('forest', id) (POST /forest/delete {id, forest_id}).
 *
 * Data fetching uses React Query keyed on {page,limit,search} so re-selecting
 * the Forests tab serves cached data without a refetch.
 */
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AddButton, Button, ConfirmDialog, DataTable, useToast } from '@/components';
import type { Column } from '@/components';
import { deleteEntity, fetchForestFull, listEntity } from '@/lib/api';
import type { ApiError, ForestFullRecord } from '@/lib/api';
import type { ForestRow, ForestSponsorSummary } from '@/types/entities';
import { AddForestWizard } from './AddForestWizard';
import { CreateFromJsonDialog } from './CreateFromJsonDialog';
import { ForestDetailView } from './ForestDetailView';
import { rowToFullPayload, type FullForestPayload } from './fullTypes';
import { boxKey, emptyForestForm, type BoxConfig, type ForestFormState } from './types';

/* ------------------------------ formatting ------------------------------ */

function fmtGeo(row: ForestRow): string {
  const lat = row.forest_geo_lat;
  const long = row.forest_geo_long;
  if (!lat && !long) return '—';
  return `${lat ?? '—'}, ${long ?? '—'}`;
}

/** Oxygen/Carbon are stored as numeric-ish strings; header says KT. We display
 * the raw stored value (no unit math invented — see NOTES.md). */
function fmtNumeric(v: string | null): string {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  return n.toLocaleString();
}

function fmtInt(v: number | null | undefined): string {
  if (v == null) return '—';
  return Number(v).toLocaleString();
}

function fmtDate(v: string | null): string {
  if (!v) return '—';
  return v.length >= 10 ? v.slice(0, 10) : v;
}

function SponsorCell({ sponsors }: { sponsors: ForestSponsorSummary[] }) {
  if (!sponsors || sponsors.length === 0) return <span className="text-textSecondary">—</span>;
  const [first, ...rest] = sponsors;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {first?.sponsor_logo ? (
        <img
          src={first.sponsor_logo}
          alt=""
          className="h-5 w-5 flex-none rounded-sm object-contain"
          loading="lazy"
        />
      ) : null}
      <span>{first?.sponsor_name ?? '—'}</span>
      {rest.length > 0 ? (
        <span
          className="rounded-pill bg-black/[0.06] px-1.5 text-label text-textSecondary"
          title={sponsors.map((s) => s.sponsor_name).join(', ')}
        >
          +{rest.length}
        </span>
      ) : null}
    </span>
  );
}

/* --------------------------- edit prefill mapping --------------------------- */

/**
 * Map a list ForestRow into the wizard's ForestFormState for EDIT mode.
 *
 * The list response carries the scalar columns + sponsor summaries, but NOT the
 * site-manager/user relation ids nor the per-box layout. We prefill everything
 * the list exposes; the rest stays empty.
 *
 * TODO(spec openQuestions[2]): a faithful edit should hydrate site_manager_id,
 * user_id and the box layout from a per-forest GET (the list endpoint does not
 * return them). Wire that fetch when the read-one endpoint shape is confirmed.
 */
function rowToForm(row: ForestRow): ForestFormState {
  const sponsors = row.sponsors ?? [];
  const sponsorIds = sponsors.map((s) => s.id);
  const sponsorLabels: Record<string, string> = {};
  for (const s of sponsors) sponsorLabels[s.id] = s.sponsor_name;

  return {
    ...emptyForestForm(),
    id: row.id,
    forest_name: row.forest_name ?? '',
    forest_internal_id: row.forest_internal_id ?? '',
    forest_city: row.forest_city ?? '',
    forest_state: row.forest_state ?? '',
    forest_country: row.forest_country ?? '',
    forest_address: row.forest_address ?? '',
    forest_geo_lat: row.forest_geo_lat ?? '',
    forest_geo_long: row.forest_geo_long ?? '',
    sponsor_ids: sponsorIds,
    sponsor_labels: sponsorLabels,

    box_rows: row.box_rows != null ? String(row.box_rows) : '',
    box_column: row.box_column != null ? String(row.box_column) : '',
    tree_row: row.tree_row != null ? String(row.tree_row) : '',
    tree_column: row.tree_column != null ? String(row.tree_column) : '',
    project_period: row.project_period != null ? String(row.project_period) : '',
    plantation_date: fmtDate(row.plantation_date) === '—' ? '' : fmtDate(row.plantation_date),
  };
}

/**
 * Map the FULL forest record (GET /forest/:id) into the wizard's form for EDIT.
 *
 * Unlike rowToForm (list row only), this hydrates EVERY field the edit form has —
 * description, site manager, user, all grid distances/angles, and the saved box
 * layout — so nothing opens blank and required-field validation passes. The grid
 * is shown read-only in edit mode and is not re-sent on save (protects trees).
 */
function fullToForm(full: ForestFullRecord): ForestFormState {
  const str = (v: unknown): string => (v == null ? '' : String(v));

  const sponsors = full.sponsors ?? [];
  const sponsorIds = sponsors.map((s) => s.id);
  const sponsorLabels: Record<string, string> = {};
  for (const s of sponsors) sponsorLabels[s.id] = s.sponsor_name;

  const manager = (full.employees ?? [])[0];

  const boxes: Record<string, BoxConfig> = {};
  for (const b of full.box_data ?? []) {
    if (b.row == null || b.column == null) continue;
    const startStr = b.start != null ? String(b.start) : '';
    boxes[boxKey(b.row, b.column)] = {
      row: b.row,
      col: b.column,
      prefix: b.prefix ?? '',
      start_digits: /^\d+$/.test(startStr) ? String(startStr.length) : '1',
      start: startStr,
      species: (b.species_data ?? []).map((s) => ({
        species_id: String(s.species_id),
        species_label: `Species #${s.species_id}`,
        count: String(s.count),
      })),
    };
  }

  const planted = str(full.plantation_date);

  return {
    ...emptyForestForm(),
    id: full.id,
    forest_name: str(full.forest_name),
    forest_internal_id: str(full.forest_internal_id),
    forest_city: str(full.forest_city),
    forest_state: str(full.forest_state),
    forest_country: str(full.forest_country),
    forest_address: str(full.forest_address),
    forest_desc: str(full.forest_desc),
    forest_geo_lat: str(full.forest_geo_lat),
    forest_geo_long: str(full.forest_geo_long),
    site_manager_id: str(full.site_manager_id),
    site_manager_label: manager?.name ?? str(full.site_manager_id),
    sponsor_ids: sponsorIds,
    sponsor_labels: sponsorLabels,
    user_id: str(full.user_role_id),
    user_label: full.user_role_id ? 'Assigned user' : '',

    box_rows: str(full.box_rows),
    box_column: str(full.box_column),
    box_to_box_distance: str(full.box_to_box_distance),
    tree_row: str(full.tree_row),
    tree_column: str(full.tree_column),
    tree_to_tree_distance: str(full.tree_to_tree_distance),
    direction_angle: str(full.direction_angle),
    boundary_gap: str(full.boundary_gap),
    pathway_spacing: str(full.pathway_spacing),
    project_site: str(full.project_site),
    project_period: str(full.project_period),
    plantation_date: planted ? planted.slice(0, 10) : '',
    boxes,
  };
}

const PAGE_SIZE_DEFAULT = 10;

export default function Forests() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE_DEFAULT);
  const [search, setSearch] = useState('');

  const [wizardOpen, setWizardOpen] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [editValues, setEditValues] = useState<ForestFormState | null>(null);
  const [detailForest, setDetailForest] = useState<FullForestPayload | null>(null);
  const [detailRow, setDetailRow] = useState<ForestRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<ForestRow | null>(null);

  const queryParams = { page, limit, ...(search ? { search } : {}) };

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['forest', queryParams],
    queryFn: () => listEntity<ForestRow>('forest', queryParams),
    placeholderData: (prev) => prev, // keep previous page while fetching next
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEntity('forest', id),
    onSuccess: () => {
      toast.success('Forest deleted.');
      void queryClient.invalidateQueries({ queryKey: ['forest'] });
      setDeleteRow(null);
    },
    onError: (e: ApiError) => {
      toast.error(e.message || 'Failed to delete forest.');
    },
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;

  const openAdd = () => {
    setEditValues(null);
    setWizardOpen(true);
  };

  // Edit opens the wizard hydrated from the FULL record (GET /forest/:id) so no
  // field is blank. Falls back to the list row if the read-one fails.
  const openEdit = async (row: ForestRow) => {
    try {
      const full = await fetchForestFull(row.id);
      setEditValues(fullToForm(full));
    } catch {
      toast.error('Could not load the full forest; opening with summary data.');
      setEditValues(rowToForm(row));
    }
    setWizardOpen(true);
  };

  const openView = (row: ForestRow) => {
    // The list row only carries scalar columns; the rich jsonb tabs need a
    // per-forest read-one fetch (GAP — see ForestDetailView header). For now we
    // hydrate Overview from the list row and keep the original row for Edit.
    setDetailRow(row);
    setDetailForest(rowToFullPayload(row));
  };

  const closeView = () => {
    setDetailForest(null);
    setDetailRow(null);
  };

  // "Edit" from the detail view: close detail, reopen the wizard prefilled.
  const editFromDetail = () => {
    if (detailRow) void openEdit(detailRow);
    closeView();
  };

  const columns: Column<ForestRow>[] = useMemo(
    () => [
      {
        key: 'forest_name',
        header: 'Forest Name',
        className: 'whitespace-nowrap font-medium',
        render: (r) => r.forest_name || '—',
      },
      { key: 'forest_internal_id', header: 'Internal ID', render: (r) => r.forest_internal_id || '—' },
      { key: 'forest_unique_id', header: 'Unique ID', render: (r) => r.forest_unique_id || '—' },
      {
        key: 'sponsors',
        header: 'Sponsor(s)',
        render: (r) => <SponsorCell sponsors={r.sponsors} />,
      },
      {
        key: 'geo',
        header: 'Geo (Lat, Long)',
        className: 'whitespace-nowrap',
        render: (r) => fmtGeo(r),
      },
      { key: 'forest_oxygen', header: 'Oxygen (KT)', className: 'text-right tabular-nums', headerClassName: 'text-right', render: (r) => fmtNumeric(r.forest_oxygen) },
      { key: 'forest_carbonoffset', header: 'Carbon Offset (KT)', className: 'text-right tabular-nums', headerClassName: 'text-right', render: (r) => fmtNumeric(r.forest_carbonoffset) },
      {
        key: 'forest_address',
        header: 'Address',
        className: 'max-w-[16rem]',
        render: (r) =>
          r.forest_address ? (
            <span className="block max-w-[16rem] truncate" title={r.forest_address}>
              {r.forest_address.replace(/\n+/g, ', ')}
            </span>
          ) : '—',
      },
      {
        key: 'box_grid',
        header: 'Box Grid (R×C)',
        className: 'whitespace-nowrap text-center',
        headerClassName: 'text-center',
        render: (r) => `${fmtInt(r.box_rows)} × ${fmtInt(r.box_column)}`,
      },
      {
        key: 'tree_grid',
        header: 'Tree Grid (R×C)',
        className: 'whitespace-nowrap text-center',
        headerClassName: 'text-center',
        render: (r) => `${fmtInt(r.tree_row)} × ${fmtInt(r.tree_column)}`,
      },
      { key: 'total_trees', header: 'Total Trees', className: 'text-right tabular-nums', headerClassName: 'text-right', render: (r) => fmtInt(r.total_trees) },
      { key: 'average_age', header: 'Avg Age (Yrs)', className: 'text-right tabular-nums', headerClassName: 'text-right', render: (r) => fmtInt(r.average_age) },
      { key: 'total_species_planted', header: 'Species Planted', className: 'text-right tabular-nums', headerClassName: 'text-right', render: (r) => fmtInt(r.total_species_planted) },
      { key: 'plantation_date', header: 'Plantation Date', className: 'whitespace-nowrap', render: (r) => fmtDate(r.plantation_date) },
      { key: 'project_period', header: 'Project Period (Yrs)', className: 'text-right tabular-nums', headerClassName: 'text-right', render: (r) => fmtInt(r.project_period) },
    ],
    [],
  );

  return (
    <div>
      <DataTable<ForestRow>
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        loading={isLoading}
        error={isError ? ((error as ApiError | null)?.message ?? 'Failed to load forests.') : null}
        emptyContent="No forests found."
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
        searchPlaceholder="Search forests..."
        caption="Forests"
        onView={(r) => openView(r)}
        onEdit={(r) => void openEdit(r)}
        onDelete={(r) => setDeleteRow(r)}
        toolbar={
          <>
            {isFetching && !isLoading ? (
              <span className="text-label text-textSecondary" aria-live="polite">
                Updating…
              </span>
            ) : null}
            <Button variant="outlined" onClick={() => setJsonOpen(true)}>
              Create from JSON
            </Button>
            <AddButton label="Add Forest" onClick={openAdd} />
          </>
        }
      />

      <AddForestWizard
        open={wizardOpen}
        initialValues={editValues}
        onClose={() => setWizardOpen(false)}
      />

      <CreateFromJsonDialog open={jsonOpen} onClose={() => setJsonOpen(false)} />

      <ForestDetailView
        forest={detailForest}
        onClose={closeView}
        onEdit={detailRow ? editFromDetail : undefined}
      />

      <ConfirmDialog
        open={Boolean(deleteRow)}
        variant="danger"
        title="Delete forest?"
        message={
          deleteRow
            ? `Delete "${deleteRow.forest_name}"? This detaches it from all associated sponsors and trees.`
            : ''
        }
        confirmLabel="Delete"
        confirming={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteRow) deleteMutation.mutate(deleteRow.id);
        }}
        onCancel={() => {
          if (!deleteMutation.isPending) setDeleteRow(null);
        }}
      />
    </div>
  );
}
