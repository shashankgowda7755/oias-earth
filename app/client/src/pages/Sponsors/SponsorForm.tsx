/**
 * Sponsor create/edit form body (spec EntityFormDialog -> AddSponsor / EditSponsor).
 *
 * Pure presentation: receives the controlled values + errors and reports field
 * changes upward. The dialog chrome (Cancel / Reset / Save, submit wiring) is
 * owned by the shared <FormDialog>; this component only renders the fields.
 *
 * Fields (spec screens[2].dataCollected + dataModel[5]): Sponsor Name*, Sponsor
 * Logo URL, Sponsor Forest Logo URL, Sponsor Tree Logo URL, OG Image URL,
 * Established Year, Website URL, Industry, Headquarters, and an Active toggle.
 *
 * Layout: two-column grid on >= sm so the longer create form stays compact,
 * matching the MUI dialog density in the reference. Sponsor Name spans the full
 * width as the primary field.
 *
 * NOTE: the shared Field set has no boolean/switch control, so the Active
 * toggle is implemented inline here (accessible role="switch"). If more
 * sections need a toggle, this is a candidate to promote into the shared
 * `fields/` set — flagged in the module return for the integrator.
 */
import { TextField } from '../../components';
import type { SponsorFormErrors, SponsorFormValues } from './sponsorModel';

interface SponsorFormProps {
  values: SponsorFormValues;
  errors: SponsorFormErrors;
  /** field-level change; key is a SponsorFormValues key. */
  onChange: <K extends keyof SponsorFormValues>(
    key: K,
    value: SponsorFormValues[K],
  ) => void;
  disabled?: boolean;
}

export function SponsorForm({
  values,
  errors,
  onChange,
  disabled = false,
}: SponsorFormProps) {
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
      {/* Primary field spans both columns */}
      <div className="sm:col-span-2">
        <TextField
          label="Sponsor Name"
          value={values.sponsor_name}
          onChange={(v) => onChange('sponsor_name', v)}
          required
          disabled={disabled}
          error={errors.sponsor_name}
          autoComplete="off"
        />
      </div>

      <TextField
        label="Sponsor Logo URL"
        type="url"
        inputMode="url"
        value={values.sponsor_logo}
        onChange={(v) => onChange('sponsor_logo', v)}
        disabled={disabled}
        error={errors.sponsor_logo}
        autoComplete="off"
      />
      <TextField
        label="Sponsor Forest Logo URL"
        type="url"
        inputMode="url"
        value={values.sponsor_forest_logo}
        onChange={(v) => onChange('sponsor_forest_logo', v)}
        disabled={disabled}
        error={errors.sponsor_forest_logo}
        autoComplete="off"
      />
      <TextField
        label="Sponsor Tree Logo URL"
        type="url"
        inputMode="url"
        value={values.sponsor_tree_logo}
        onChange={(v) => onChange('sponsor_tree_logo', v)}
        disabled={disabled}
        error={errors.sponsor_tree_logo}
        autoComplete="off"
      />
      <TextField
        label="OG Image URL"
        type="url"
        inputMode="url"
        value={values.sponsor_og_image_url}
        onChange={(v) => onChange('sponsor_og_image_url', v)}
        disabled={disabled}
        error={errors.sponsor_og_image_url}
        autoComplete="off"
      />

      <TextField
        label="Established Year"
        type="text"
        inputMode="numeric"
        value={values.established_year}
        onChange={(v) => onChange('established_year', v)}
        disabled={disabled}
        error={errors.established_year}
        helperText="4-digit year, e.g. 2010"
        autoComplete="off"
      />
      <TextField
        label="Website URL"
        type="url"
        inputMode="url"
        value={values.website_url}
        onChange={(v) => onChange('website_url', v)}
        disabled={disabled}
        error={errors.website_url}
        autoComplete="off"
      />

      <TextField
        label="Industry"
        value={values.industry}
        onChange={(v) => onChange('industry', v)}
        disabled={disabled}
        autoComplete="off"
      />
      <TextField
        label="Headquarters"
        value={values.headquarters}
        onChange={(v) => onChange('headquarters', v)}
        disabled={disabled}
        autoComplete="off"
      />

      {/* Active toggle (no shared switch component — implemented inline) */}
      <div className="sm:col-span-2">
        <ActiveToggle
          checked={values.is_active}
          disabled={disabled}
          onChange={(v) => onChange('is_active', v)}
        />
      </div>
    </div>
  );
}

function ActiveToggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-3 select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label="Active"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? 'bg-primary' : 'bg-black/25'
        }`}
      >
        <span
          aria-hidden="true"
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
      <span className="text-sm text-textPrimary">
        Active
        <span className="ml-2 text-textSecondary">
          {checked ? 'Yes' : 'No'}
        </span>
      </span>
    </label>
  );
}
