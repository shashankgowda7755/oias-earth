/**
 * The two wizard step bodies (CONFIRMED via live walk-through):
 *   Step 1 'Basic Info'  +  Step 2 'Grid Config'.
 *
 * Each is presentational: it receives the form state, the field-error map, an
 * `update` setter, and (Step 1) the async picker loaders. No data fetching here
 * — the wizard owns state; the AutocompleteField components fetch on demand.
 */
import type { ReactNode } from 'react';
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
import type { FieldErrors, ForestFormState } from './types';

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
            label="City" required placeholder="Enter City"
            value={form.forest_city}
            onChange={(v) => update('forest_city', v)}
            {...err(errors, 'forest_city')}
          />
          <TextField
            label="State" required placeholder="Enter State"
            value={form.forest_state}
            onChange={(v) => update('forest_state', v)}
            {...err(errors, 'forest_state')}
          />
          <TextField
            label="Country" required placeholder="Enter Country"
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
          onAddress={(addr) => update('forest_address', addr)}
          {...(errors.forest_geo_lat ? { latError: errors.forest_geo_lat } : {})}
          {...(errors.forest_geo_long ? { longError: errors.forest_geo_long } : {})}
        />
      </div>

      {/* Assignments */}
      <SubHeading>Assignments</SubHeading>
      <Grid>
        <AutocompleteField
          label="Site Manager" required placeholder="Search Site Manager…"
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
          label="User" required placeholder="Search User…"
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
            label="Sponsor" required
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

  const gridReady =
    Number.isInteger(boxRows) && boxRows > 0 &&
    Number.isInteger(boxColumn) && boxColumn > 0 &&
    Number.isInteger(treeRow) && treeRow > 0 &&
    Number.isInteger(treeColumn) && treeColumn > 0;

  return (
    <div>
      <SectionTitle>Grid Config</SectionTitle>
      <SubHeading>Box &amp; Tree Grid</SubHeading>
      <Grid>
        <TextField label="Box Rows" required type="number" inputMode="numeric"
          value={form.box_rows} onChange={(v) => update('box_rows', v)} {...err(errors, 'box_rows')} />
        <TextField label="Box Column" required type="number" inputMode="numeric"
          value={form.box_column} onChange={(v) => update('box_column', v)} {...err(errors, 'box_column')} />
        <TextField label="Box to Box Distance (ft)" required type="number" inputMode="numeric"
          value={form.box_to_box_distance} onChange={(v) => update('box_to_box_distance', v)} {...err(errors, 'box_to_box_distance')} />
        <TextField label="Tree Rows" required type="number" inputMode="numeric"
          value={form.tree_row} onChange={(v) => update('tree_row', v)} {...err(errors, 'tree_row')} />
        <TextField label="Tree Column" required type="number" inputMode="numeric"
          value={form.tree_column} onChange={(v) => update('tree_column', v)} {...err(errors, 'tree_column')} />
        <TextField label="Tree to Tree Distance (ft)" required type="number" inputMode="numeric"
          value={form.tree_to_tree_distance} onChange={(v) => update('tree_to_tree_distance', v)} {...err(errors, 'tree_to_tree_distance')} />
        <TextField label="Direction Angle" required type="number" inputMode="numeric"
          value={form.direction_angle} onChange={(v) => update('direction_angle', v)} {...err(errors, 'direction_angle')} />
        <TextField label="Boundary Gap (ft)" required type="number" inputMode="numeric"
          value={form.boundary_gap} onChange={(v) => update('boundary_gap', v)} {...err(errors, 'boundary_gap')} />
        <TextField label="Pathway Spacing (ft)" required type="number" inputMode="numeric"
          value={form.pathway_spacing} onChange={(v) => update('pathway_spacing', v)} {...err(errors, 'pathway_spacing')} />
        <TextField label="Project Site" required placeholder="Enter Project Site"
          value={form.project_site} onChange={(v) => update('project_site', v)} {...err(errors, 'project_site')} />
        <TextField label="Project Period (years)" required type="number" inputMode="numeric"
          value={form.project_period} onChange={(v) => update('project_period', v)} {...err(errors, 'project_period')} />
        <DateField label="Plantation Date" required
          value={form.plantation_date} onChange={(v) => update('plantation_date', v)} {...err(errors, 'plantation_date')} />
      </Grid>

      {/* Box cards grid — appears once the grid dims are valid. */}
      <div className="mt-6">
        <SubHeading>Box Layout</SubHeading>
        {gridReady ? (
          <BoxGrid
            boxRows={boxRows}
            boxColumn={boxColumn}
            treeRow={treeRow}
            treeColumn={treeColumn}
            boxes={form.boxes}
            onChange={(boxes) => update('boxes', boxes)}
          />
        ) : (
          <p className="rounded-card border border-dashed border-border bg-appbg px-3 py-6 text-center text-sm text-textSecondary">
            Fill in Box Rows, Box Column, Tree Rows and Tree Column (all &gt; 0) to
            generate the box grid.
          </p>
        )}
      </div>
    </div>
  );
}
