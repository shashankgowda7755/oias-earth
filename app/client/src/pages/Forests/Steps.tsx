/**
 * The two wizard step bodies (CONFIRMED via live walk-through):
 *   Step 1 'Basic Info'  +  Step 2 'Grid Config'.
 *
 * Each is presentational: it receives the form state, the field-error map, an
 * `update` setter, and (Step 1) the async picker loaders. No data fetching here
 * — the wizard owns state; the AutocompleteField components fetch on demand.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import {
  AutocompleteField,
  DateField,
  TextAreaField,
  TextField,
  type AutocompleteOption,
} from '@/components';
import { LocationPicker } from './LocationPicker';
import { MultiAutocompleteField } from './MultiAutocompleteField';
import { BoxGrid } from './BoxGrid';
import { loadSpeciesOptions } from './api';
import { autoFillBoxes } from './boxAutoFill';
import { genClientCode, genForestCode, previewTreeIds } from './treeId';
import { boxPlanted, type FieldErrors, type ForestFormState, type GlobalSpeciesRow } from './types';

/** Setter: update one field by key. */
type Update = <K extends keyof ForestFormState>(
  key: K,
  value: ForestFormState[K],
) => void;

interface StepProps {
  form: ForestFormState;
  errors: FieldErrors;
  update: Update;
}

/* ----------------------------- layout helpers ----------------------------- */

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="mb-1 text-base font-semibold text-textPrimary">{children}</h3>;
}

function SubHeading({ children }: { children: ReactNode }) {
  return (
    <p className="mb-4 border-b border-border pb-2 text-sm font-semibold text-primary">
      {children}
    </p>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}

/** Build an `error` prop only when present (clean undefined handling). */
function err(errors: FieldErrors, key: keyof ForestFormState): { error?: string } {
  const e = errors[key];
  return e ? { error: e } : {};
}

/* ------------------------- Step 1: Basic Info ------------------------- */

export interface Step1Props extends StepProps {
  loadEmployeeOptions: (q: string) => Promise<AutocompleteOption[]>;
  loadSponsorOptions: (q: string) => Promise<AutocompleteOption[]>;
  loadUserOptions: (q: string) => Promise<AutocompleteOption[]>;
}

export function Step1Basic({
  form,
  errors,
  update,
  loadEmployeeOptions,
  loadSponsorOptions,
  loadUserOptions,
}: Step1Props) {
  return (
    <div>
      <SectionTitle>Basic Info</SectionTitle>
      <SubHeading>Basic Information</SubHeading>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left column: text fields */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="Forest Name" required placeholder="Enter Forest Name"
            value={form.forest_name}
            onChange={(v) => update('forest_name', v)}
            {...err(errors, 'forest_name')}
          />
          <TextField
            label="Forest Internal ID" required placeholder="Enter Forest Internal ID"
            value={form.forest_internal_id}
            onChange={(v) => update('forest_internal_id', v)}
            {...err(errors, 'forest_internal_id')}
          />
          <TextField
            label="City" placeholder="Enter City"
            value={form.forest_city}
            onChange={(v) => update('forest_city', v)}
            {...err(errors, 'forest_city')}
          />
          <TextField
            label="State" placeholder="Enter State"
            value={form.forest_state}
            onChange={(v) => update('forest_state', v)}
            {...err(errors, 'forest_state')}
          />
          <TextField
            label="Country" placeholder="Enter Country"
            value={form.forest_country}
            onChange={(v) => update('forest_country', v)}
            {...err(errors, 'forest_country')}
          />
          <div className="sm:col-span-2">
            <TextAreaField
              label="Address" placeholder="Enter Address" rows={2}
              value={form.forest_address}
              onChange={(v) => update('forest_address', v)}
              {...err(errors, 'forest_address')}
            />
          </div>
          <div className="sm:col-span-2">
            <TextAreaField
              label="Description" placeholder="Enter Description" rows={2}
              value={form.forest_desc}
              onChange={(v) => update('forest_desc', v)}
              {...err(errors, 'forest_desc')}
            />
          </div>
        </div>

        {/* Right column: map + coordinates */}
        <LocationPicker
          required
          lat={form.forest_geo_lat}
          long={form.forest_geo_long}
          onChange={({ lat, long }) => {
            update('forest_geo_lat', lat);
            update('forest_geo_long', long);
          }}
          onPlace={(p) => {
            update('forest_address', p.address);
            if (p.city) update('forest_city', p.city);
            if (p.state) update('forest_state', p.state);
            if (p.country) update('forest_country', p.country);
          }}
          {...(errors.forest_geo_lat ? { latError: errors.forest_geo_lat } : {})}
          {...(errors.forest_geo_long ? { longError: errors.forest_geo_long } : {})}
        />
      </div>

      {/* Assignments */}
      <SubHeading>Assignments</SubHeading>
      <Grid>
        <AutocompleteField
          label="Site Manager" placeholder="Search Site Manager…"
          value={form.site_manager_id}
          onChange={(id, opt) => {
            update('site_manager_id', id);
            update('site_manager_label', opt?.label ?? '');
          }}
          loadOptions={loadEmployeeOptions}
          selectedOption={
            form.site_manager_id
              ? { value: form.site_manager_id, label: form.site_manager_label || form.site_manager_id }
              : null
          }
          {...err(errors, 'site_manager_id')}
        />
        <AutocompleteField
          label="User" placeholder="Search User…"
          value={form.user_id}
          onChange={(id, opt) => {
            update('user_id', id);
            update('user_label', opt?.label ?? '');
          }}
          loadOptions={loadUserOptions}
          selectedOption={
            form.user_id
              ? { value: form.user_id, label: form.user_label || form.user_id }
              : null
          }
          {...err(errors, 'user_id')}
        />
        <div className="sm:col-span-2">
          <MultiAutocompleteField
            label="Sponsor"
            value={form.sponsor_ids}
            labels={form.sponsor_labels}
            onChange={(ids, labels) => {
              update('sponsor_ids', ids);
              update('sponsor_labels', labels);
            }}
            loadOptions={loadSponsorOptions}
            placeholder="Search to add sponsor…"
            {...err(errors, 'sponsor_ids')}
          />
        </div>
      </Grid>
    </div>
  );
}

/* ------------------------- Step 2: Grid Config ------------------------- */

export function Step2Grid({ form, errors, update }: StepProps) {
  const boxRows = Number(form.box_rows);
  const boxColumn = Number(form.box_column);
  const treeRow = Number(form.tree_row);
  const treeColumn = Number(form.tree_column);
  const capacity = treeRow * treeColumn;

  const gridReady =
    Number.isInteger(boxRows) && boxRows > 0 &&
    Number.isInteger(boxColumn) && boxColumn > 0 &&
    Number.isInteger(treeRow) && treeRow > 0 &&
    Number.isInteger(treeColumn) && treeColumn > 0;

  const totalTrees = Number(form.total_trees) || 0;
  const gridCapacity = gridReady ? boxRows * boxColumn * capacity : 0;

  // EDIT mode: planting grid is read-only (rebuilding would erase tree timelines).
  const isEdit = Boolean(form.id);
  const configuredBoxes = Object.values(form.boxes).filter((b) => b.prefix.trim().length > 0);
  const editTreeCount = configuredBoxes.reduce((sum, b) => sum + boxPlanted(b), 0);

  // Auto-derive forest_code from forest_name when it changes.
  useEffect(() => {
    if (form.forest_name && !form.forest_code) {
      update('forest_code', genForestCode(form.forest_name));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.forest_name]);

  // Auto-derive client_code from first sponsor label when it changes.
  useEffect(() => {
    const firstLabel = Object.values(form.sponsor_labels)[0];
    if (firstLabel && !form.client_code) {
      update('client_code', genClientCode(firstLabel));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.sponsor_labels]);

  // On EDIT, don't clobber the boxes hydrated from the saved forest on first
  // render — but DO regenerate when the user changes the mix/grid afterwards.
  // (Save is now a non-destructive diff, so regenerating no longer erases tree
  // history.) A forest opened with no boxes behaves like create (auto-fills).
  const skipAutoFill = useRef(isEdit && Object.keys(form.boxes).length > 0);

  // Re-run auto-fill whenever inputs change (skips overridden boxes).
  useEffect(() => {
    if (!gridReady || totalTrees <= 0 || !form.client_code || !form.forest_code) return;
    if (skipAutoFill.current) { skipAutoFill.current = false; return; }
    const filled = autoFillBoxes({
      totalTrees,
      speciesMix: form.species_mix,
      boxRows,
      boxColumn,
      capacity,
      clientCode: form.client_code,
      forestCode: form.forest_code,
      existingBoxes: form.boxes,
    });
    update('boxes', filled);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.total_trees, form.species_mix, form.client_code, form.forest_code,
      form.box_rows, form.box_column, form.tree_row, form.tree_column]);

  const addSpeciesRow = () => {
    update('species_mix', [
      ...form.species_mix,
      { species_id: '', species_label: '', count: '' },
    ]);
  };

  const updateSpecies = (i: number, patch: Partial<GlobalSpeciesRow>) => {
    const next = form.species_mix.map((s, idx) => idx === i ? { ...s, ...patch } : s);
    update('species_mix', next);
  };

  const removeSpecies = (i: number) => {
    update('species_mix', form.species_mix.filter((_, idx) => idx !== i));
  };

  const speciesTotal = form.species_mix.reduce((s, m) => s + (Number(m.count) || 0), 0);
  const boxesUsed = gridReady && totalTrees > 0 ? Math.ceil(totalTrees / capacity) : 0;

  return (
    <div>
      {/* Layer 1: Quick Setup */}
      <SectionTitle>Tree Setup</SectionTitle>
      <SubHeading>Quick Entry</SubHeading>

      <Grid>
        <TextField
          label="Total Saplings to Plant"
          type="number"
          inputMode="numeric"
          value={form.total_trees}
          onChange={(v) => update('total_trees', v)}
          {...err(errors, 'total_trees')}
          helperText={
            gridReady && totalTrees > 0
              ? `${boxesUsed} box${boxesUsed !== 1 ? 'es' : ''} used · ${gridCapacity} max capacity`
              : undefined
          }
        />
        <div className="flex items-end gap-1">
          <TextField
            label="Client Code"
            value={form.client_code}
            onChange={(v) => update('client_code', v.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5))}
            {...err(errors, 'client_code')}
            helperText="Auto-derived from sponsor"
          />
          <TextField
            label="Forest Code"
            value={form.forest_code}
            onChange={(v) => update('forest_code', v.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5))}
            {...err(errors, 'forest_code')}
            helperText="Auto-derived from name"
          />
        </div>
      </Grid>

      {form.client_code && form.forest_code && (
        <p className="mb-4 rounded-card border border-border bg-appbg px-3 py-2 font-mono text-xs text-textSecondary">
          ID preview: {previewTreeIds(form.client_code, form.forest_code)}
        </p>
      )}

      {/* Species mix */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-textPrimary">
            Species Mix <span className="font-normal text-textSecondary">(optional — add later if unknown)</span>
          </h4>
          <button type="button" onClick={addSpeciesRow} className="text-xs font-semibold text-primary hover:underline">
            + Add species
          </button>
        </div>

        {form.species_mix.length === 0 ? (
          <p className="rounded-card border border-dashed border-border bg-appbg px-3 py-3 text-center text-sm text-textSecondary">
            No species — trees created without species assignment. Add later.
          </p>
        ) : (
          <ul className="space-y-2">
            {form.species_mix.map((row, i) => (
              <li key={i} className="flex items-end gap-2">
                <div className="flex-1">
                  <AutocompleteField
                    label="Species"
                    value={row.species_id}
                    onChange={(id, opt) => updateSpecies(i, { species_id: id, species_label: opt?.label ?? '' })}
                    loadOptions={loadSpeciesOptions}
                    selectedOption={row.species_id ? { value: row.species_id, label: row.species_label || row.species_id } : null}
                    placeholder="Search species…"
                  />
                </div>
                <div className="w-28">
                  <TextField
                    label="Count"
                    type="number"
                    inputMode="numeric"
                    value={row.count}
                    onChange={(v) => updateSpecies(i, { count: v })}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeSpecies(i)}
                  className="mb-1.5 flex h-9 w-9 flex-none items-center justify-center rounded-button text-textSecondary hover:bg-danger/5 hover:text-danger"
                  aria-label={`Remove species row ${i + 1}`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}

        {form.species_mix.length > 0 && totalTrees > 0 && (
          <p className={`mt-2 text-xs font-medium ${speciesTotal === totalTrees ? 'text-primary' : speciesTotal > totalTrees ? 'text-danger' : 'text-warning'}`}>
            {speciesTotal} / {totalTrees} assigned{speciesTotal < totalTrees ? ` — ${totalTrees - speciesTotal} unassigned (distributed evenly)` : speciesTotal > totalTrees ? ' — exceeds total' : ' ✓'}
          </p>
        )}
      </div>

      {/* Grid Config (existing fields) */}
      <SubHeading>Grid Configuration</SubHeading>
      <Grid>
        <TextField label="Box Rows" type="number" inputMode="numeric"
          value={form.box_rows} onChange={(v) => update('box_rows', v)} {...err(errors, 'box_rows')} />
        <TextField label="Box Column" type="number" inputMode="numeric"
          value={form.box_column} onChange={(v) => update('box_column', v)} {...err(errors, 'box_column')} />
        <TextField label="Box to Box Distance (ft)" type="number" inputMode="numeric"
          value={form.box_to_box_distance} onChange={(v) => update('box_to_box_distance', v)} {...err(errors, 'box_to_box_distance')} />
        <TextField label="Tree Rows" type="number" inputMode="numeric"
          value={form.tree_row} onChange={(v) => update('tree_row', v)} {...err(errors, 'tree_row')} />
        <TextField label="Tree Column" type="number" inputMode="numeric"
          value={form.tree_column} onChange={(v) => update('tree_column', v)} {...err(errors, 'tree_column')} />
        <TextField label="Tree to Tree Distance (ft)" type="number" inputMode="numeric"
          value={form.tree_to_tree_distance} onChange={(v) => update('tree_to_tree_distance', v)} {...err(errors, 'tree_to_tree_distance')} />
        <TextField label="Direction Angle" type="number" inputMode="numeric"
          value={form.direction_angle} onChange={(v) => update('direction_angle', v)} {...err(errors, 'direction_angle')} />
        <TextField label="Boundary Gap (ft)" type="number" inputMode="numeric"
          value={form.boundary_gap} onChange={(v) => update('boundary_gap', v)} {...err(errors, 'boundary_gap')} />
        <TextField label="Pathway Spacing (ft)" type="number" inputMode="numeric"
          value={form.pathway_spacing} onChange={(v) => update('pathway_spacing', v)} {...err(errors, 'pathway_spacing')} />
        <TextField label="Project Site" placeholder="Enter Project Site"
          value={form.project_site} onChange={(v) => update('project_site', v)} {...err(errors, 'project_site')} />
        <TextField label="Project Period (years)" type="number" inputMode="numeric"
          value={form.project_period} onChange={(v) => update('project_period', v)} {...err(errors, 'project_period')} />
        <DateField label="Plantation Date"
          value={form.plantation_date} onChange={(v) => update('plantation_date', v)} {...err(errors, 'plantation_date')} />
      </Grid>

      {/* Layer 2: Geo-tag toggle */}
      <div className="mt-6">
        {isEdit ? (
          <>
            <SubHeading>Box Layout</SubHeading>
            <div className="rounded-card border border-border bg-appbg px-4 py-4 text-sm text-textSecondary">
              <p className="mb-1 font-medium text-textPrimary">
                Planting layout is locked while editing
              </p>
              <p>
                {configuredBoxes.length} box{configuredBoxes.length === 1 ? '' : 'es'} •{' '}
                {editTreeCount.toLocaleString()} tree{editTreeCount === 1 ? '' : 's'} on record.
                Rebuilding the grid here would erase each tree&apos;s monitoring timeline,
                so the layout can only be changed from the dedicated tree tools. Every
                other field above saves normally.
              </p>
            </div>
          </>
        ) : (
          <>
            <label className="flex cursor-pointer items-start gap-3 rounded-card border border-border bg-appbg px-4 py-3">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={form.geo_tag_mode}
                onChange={(e) => update('geo_tag_mode', e.target.checked)}
              />
              <div>
                <p className="text-sm font-semibold text-textPrimary">Enable per-box geo-tagging</p>
                <p className="text-xs text-textSecondary">
                  Add GPS coordinates and override species per box. Required for physical QR-code tracking.
                </p>
              </div>
            </label>

            {form.geo_tag_mode && gridReady && (
              <div className="mt-4">
                <SubHeading>Box Layout — Geo-tag Mode</SubHeading>
                <BoxGrid
                  boxRows={boxRows}
                  boxColumn={boxColumn}
                  treeRow={treeRow}
                  treeColumn={treeColumn}
                  boxes={form.boxes}
                  onChange={(boxes) => update('boxes', boxes)}
                />
              </div>
            )}

            {form.geo_tag_mode && !gridReady && (
              <p className="mt-3 rounded-card border border-dashed border-border bg-appbg px-3 py-4 text-center text-sm text-textSecondary">
                Fill in grid dimensions above to show the box map.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
