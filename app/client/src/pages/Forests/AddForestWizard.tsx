/**
 * Add / Edit Forest — TWO-step wizard (CONFIRMED via live walk-through;
 * spec flows "Create Forest (2-step wizard)").
 *
 *   Step 1 'Basic Info'  ->  Step 2 'Grid Config' (renders the Box card grid).
 *
 * Built on the shared FormDialog (large modal) with a custom footer:
 *   - Step 1 footer: Cancel / Reset / Next ->
 *   - Step 2 footer: <- Previous / Cancel / Reset / Save Forest
 *
 * Submit -> upsertEntity('forest', values, files?). NO `id` => INSERT; `id`
 * present (EDIT mode) => UPDATE. The server runs the write as the async
 * `forest_upsert_v1` job that materializes the forest + ForestBox + ForestTree +
 * ForestCluster rows (and the ForestSponsor / ForestsEmployee join rows) — its
 * status is visible in the Jobs tab.
 */
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, FormDialog, useToast } from '@/components';
import { upsertEntity, type ApiError, type UpsertValues } from '@/lib/api';
import {
  loadEmployeeOptions,
  loadSponsorOptions,
  loadUserOptions,
} from './api';
import { Stepper } from './Stepper';
import { Step1Basic, Step2Grid } from './Steps';
import {
  emptyForestForm,
  STEP_KEYS,
  STEP_LABELS,
  type FieldErrors,
  type ForestFormState,
} from './types';
import { validateAll, validateStep } from './validation';

export interface AddForestWizardProps {
  open: boolean;
  onClose: () => void;
  /** When provided, the wizard opens in EDIT mode prefilled from these values
   *  (the form's `id` drives upsert UPDATE). Omit / undefined => create mode. */
  initialValues?: ForestFormState | null;
  /** Called after a successful save so the parent can toast/refetch. */
  onSaved?: () => void;
}

/* --------------------------- payload assembly --------------------------- */

/** Number string -> number | undefined (blank stays out of the payload). */
function num(v: string): number | undefined {
  if (v.trim() === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** Drop undefined values so we never send `field: undefined`. */
function compact(obj: Record<string, unknown>): UpsertValues {
  const out: UpsertValues = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null) out[k] = v as UpsertValues[string];
  }
  return out;
}

/**
 * Build the snake_case upsert values from the string-keyed form.
 *
 * Keys match the CONFIRMED server contract (spec/forest_create_payload.jsonc +
 * server/src/routes/forest.ts): `employee_id` (Site Manager), `user_role_id`
 * (User), `sponsor_ids`, and the per-box planting layout as `box_data[]` whose
 * boxes use `column` + `species_data[]`. (The earlier `boxes`/`col`/`species`/
 * `site_manager_id`/`user_id` keys did NOT match the server, so boxes, trees,
 * the site manager and the user were silently DROPPED on save.)
 *
 * box_data is sent ONLY on create. On edit we intentionally omit it: re-sending
 * the grid would make the server rebuild forest_trees and destroy their
 * living-proof timelines / gifts / carbon ledger. The grid is shown read-only in
 * edit mode; everything else still saves. (Full grid re-edit is a separate flow.)
 */
export function buildForestValues(f: ForestFormState): UpsertValues {
  // Only include boxes the user actually configured (prefix set).
  const configuredBoxes = Object.values(f.boxes)
    .filter((b) => b.prefix.trim().length > 0)
    .map((b) => ({
      row: b.row,
      column: b.col,
      prefix: b.prefix.trim(),
      start_digits: num(b.start_digits) ?? 3,
      start: b.start.trim() || '001',
      species_data: b.species
        .filter((s) => s.species_id)
        .map((s) => ({ species_id: Number(s.species_id), count: num(s.count) ?? 0 })),
      ...(b.box_lat && b.box_lng ? { box_lat: b.box_lat, box_lng: b.box_lng } : {}),
    }));

  return compact({
    // EDIT: id present => UPDATE.
    id: f.id,

    // Step 1
    forest_name: f.forest_name.trim(),
    forest_internal_id: f.forest_internal_id.trim(),
    forest_city: f.forest_city.trim(),
    forest_state: f.forest_state.trim(),
    forest_country: f.forest_country.trim(),
    forest_address: f.forest_address.trim() || undefined,
    forest_desc: f.forest_desc.trim() || undefined,
    forest_geo_lat: f.forest_geo_lat.trim(),
    forest_geo_long: f.forest_geo_long.trim(),
    // Site Manager => employee_id; User => user_role_id (canonical contract).
    employee_id: f.site_manager_id || undefined,
    user_role_id: f.user_id || undefined,
    // Multi relation as a JSON array string (flat-body friendly; server parses).
    sponsor_ids: f.sponsor_ids.length ? JSON.stringify(f.sponsor_ids) : undefined,

    // Step 2
    box_rows: num(f.box_rows),
    box_column: num(f.box_column),
    box_to_box_distance: num(f.box_to_box_distance),
    tree_row: num(f.tree_row),
    tree_column: num(f.tree_column),
    tree_to_tree_distance: num(f.tree_to_tree_distance),
    direction_angle: num(f.direction_angle),
    boundary_gap: num(f.boundary_gap),
    pathway_spacing: num(f.pathway_spacing),
    project_site: f.project_site.trim() || undefined,
    project_period: num(f.project_period),
    plantation_date: f.plantation_date.trim() || undefined,

    // Per-box planting layout (creates forest_boxes + forest_trees). Create-only.
    box_data: !f.id && configuredBoxes.length ? JSON.stringify(configuredBoxes) : undefined,

    // Tree ID generation fields
    client_code: f.client_code.trim() || undefined,
    forest_code: f.forest_code.trim() || undefined,
    total_trees: num(f.total_trees),
  });
}

/* ------------------------------- component ------------------------------- */

export function AddForestWizard({
  open,
  onClose,
  initialValues,
  onSaved,
}: AddForestWizardProps) {
  const toast = useToast();
  const queryClient = useQueryClient();

  const isEdit = Boolean(initialValues?.id);

  const [form, setForm] = useState<ForestFormState>(emptyForestForm);
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});

  // Re-seed the form whenever the wizard (re)opens, so Edit prefills and Add
  // starts clean. Reset step + errors too.
  useEffect(() => {
    if (open) {
      setForm(initialValues ? { ...initialValues } : emptyForestForm());
      setStepIndex(0);
      setErrors({});
    }
  }, [open, initialValues]);

  const stepKey = STEP_KEYS[stepIndex]!;
  const isLastStep = stepIndex === STEP_KEYS.length - 1;

  const saveMutation = useMutation({
    mutationFn: (values: UpsertValues) =>
      // TODO(spec write_contracts.md): forest upsert is multipart when it carries
      // file fields (dashboard/report images, permission letter). The 2-step
      // wizard captured here collects no file inputs, so we send the JSON body.
      // Add FileField(s) + a files arg here when those uploads are in scope.
      upsertEntity('forest', values),
    onSuccess: () => {
      toast.success(isEdit ? 'Forest updated. Processing job queued.' : 'Forest created. Processing job queued.');
      void queryClient.invalidateQueries({ queryKey: ['forest'] });
      onSaved?.();
      handleClose();
    },
    onError: (e: ApiError) => {
      toast.error(e.message || 'Failed to save forest.');
    },
  });

  const update = <K extends keyof ForestFormState>(key: K, value: ForestFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key as keyof FieldErrors];
      return next;
    });
  };

  const resetAll = () => {
    setForm(initialValues ? { ...initialValues } : emptyForestForm());
    setErrors({});
    setStepIndex(0);
  };

  const handleClose = () => {
    if (saveMutation.isPending) return;
    onClose();
  };

  const goBack = () => {
    setErrors({});
    setStepIndex((i) => Math.max(0, i - 1));
  };

  const goToStep = (i: number) => {
    if (i <= stepIndex) {
      setErrors({});
      setStepIndex(i);
    }
  };

  const goNext = () => {
    const stepErrors = validateStep(stepKey, form);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    setStepIndex((i) => Math.min(STEP_KEYS.length - 1, i + 1));
  };

  const handleSave = () => {
    const { errors: allErrors, firstInvalidStep } = validateAll(form, STEP_KEYS);
    if (firstInvalidStep) {
      setErrors(allErrors);
      setStepIndex(STEP_KEYS.indexOf(firstInvalidStep));
      toast.error('Please fix the highlighted fields.');
      return;
    }
    saveMutation.mutate(buildForestValues(form));
  };

  // FormDialog's onSubmit fires on Enter; route it to Next or Save.
  const onDialogSubmit = () => {
    if (isLastStep) handleSave();
    else goNext();
  };

  const submitting = saveMutation.isPending;

  const footer = (
    <footer className="flex flex-col-reverse items-stretch gap-2 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        {stepIndex > 0 ? (
          <Button type="button" variant="outlined" onClick={goBack} disabled={submitting}>
            ← Previous
          </Button>
        ) : null}
        <Button type="button" variant="text" onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outlined" onClick={resetAll} disabled={submitting}>
          Reset
        </Button>
        {isLastStep ? (
          <Button type="button" variant="primary" loading={submitting} onClick={handleSave}>
            Save Forest
          </Button>
        ) : (
          <Button type="button" variant="primary" disabled={submitting} onClick={goNext}>
            Next →
          </Button>
        )}
      </div>
    </footer>
  );

  const commonStepProps = useMemo(() => ({ form, errors, update }), [form, errors]);

  return (
    <FormDialog
      open={open}
      title={isEdit ? 'Edit Forest' : 'Add Forest'}
      maxWidth="xl"
      onClose={handleClose}
      onSubmit={onDialogSubmit}
      submitting={submitting}
      footer={footer}
    >
      <div className="mb-5">
        <Stepper steps={STEP_KEYS} labels={STEP_LABELS} current={stepIndex} onStepClick={goToStep} />
      </div>

      {stepKey === 'basic' && (
        <Step1Basic
          {...commonStepProps}
          loadEmployeeOptions={loadEmployeeOptions}
          loadSponsorOptions={loadSponsorOptions}
          loadUserOptions={loadUserOptions}
        />
      )}
      {stepKey === 'grid' && <Step2Grid {...commonStepProps} />}
    </FormDialog>
  );
}
