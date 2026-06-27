/**
 * Species create/edit form body. Pure presentation: controlled values + errors
 * in, field changes out. Dialog chrome (Cancel / Reset / Save) is owned by the
 * shared <FormDialog>.
 *
 * Fields: Botanical name*, Common name, Category, Description, O2/day, CO2/day,
 * Rate, Wood density, four trait toggles, and an Active toggle.
 */
import { TextField } from '../../components';
import type { SpeciesFormErrors, SpeciesFormValues } from './speciesModel';

interface SpeciesFormProps {
  values: SpeciesFormValues;
  errors: SpeciesFormErrors;
  onChange: <K extends keyof SpeciesFormValues>(
    key: K,
    value: SpeciesFormValues[K],
  ) => void;
  disabled?: boolean;
}

export function SpeciesForm({
  values,
  errors,
  onChange,
  disabled = false,
}: SpeciesFormProps) {
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
      <TextField
        label="Botanical Name"
        value={values.species_name}
        onChange={(v) => onChange('species_name', v)}
        required
        disabled={disabled}
        error={errors.species_name}
        placeholder="e.g. Azadirachta indica"
        autoComplete="off"
      />
      <TextField
        label="Common Name"
        value={values.common_name}
        onChange={(v) => onChange('common_name', v)}
        disabled={disabled}
        placeholder="e.g. Neem"
        autoComplete="off"
      />

      <TextField
        label="Category"
        value={values.species_category}
        onChange={(v) => onChange('species_category', v)}
        disabled={disabled}
        placeholder="e.g. Tree"
        autoComplete="off"
      />
      <TextField
        label="Wood Density"
        type="text"
        inputMode="numeric"
        value={values.wood_density}
        onChange={(v) => onChange('wood_density', v)}
        disabled={disabled}
        error={errors.wood_density}
        helperText="Optional, e.g. 0.68"
        autoComplete="off"
      />

      <TextField
        label="O₂ per day"
        type="text"
        inputMode="numeric"
        value={values.oxygen_per_day}
        onChange={(v) => onChange('oxygen_per_day', v)}
        disabled={disabled}
        error={errors.oxygen_per_day}
        autoComplete="off"
      />
      <TextField
        label="CO₂ offset per day"
        type="text"
        inputMode="numeric"
        value={values.carbon_offset_per_day}
        onChange={(v) => onChange('carbon_offset_per_day', v)}
        disabled={disabled}
        error={errors.carbon_offset_per_day}
        autoComplete="off"
      />

      <TextField
        label="Rate"
        type="text"
        inputMode="numeric"
        value={values.rate}
        onChange={(v) => onChange('rate', v)}
        disabled={disabled}
        error={errors.rate}
        autoComplete="off"
      />

      <div className="sm:col-span-2">
        <TextField
          label="Description"
          value={values.species_desc}
          onChange={(v) => onChange('species_desc', v)}
          disabled={disabled}
          autoComplete="off"
        />
      </div>

      {/* Functional traits (drive report slide 18 icons) */}
      <div className="sm:col-span-2">
        <p className="mb-2 text-sm font-medium text-textPrimary">
          Functional traits
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Toggle
            label="Timber"
            checked={values.is_timber_production}
            disabled={disabled}
            onChange={(v) => onChange('is_timber_production', v)}
          />
          <Toggle
            label="Pollination"
            checked={values.is_flowering_plant}
            disabled={disabled}
            onChange={(v) => onChange('is_flowering_plant', v)}
          />
          <Toggle
            label="Nesting"
            checked={values.is_nesting_habitat}
            disabled={disabled}
            onChange={(v) => onChange('is_nesting_habitat', v)}
          />
          <Toggle
            label="Fruit"
            checked={values.is_fruit_bearing}
            disabled={disabled}
            onChange={(v) => onChange('is_fruit_bearing', v)}
          />
        </div>
      </div>

      <div className="sm:col-span-2">
        <Toggle
          label="Active"
          checked={values.is_active}
          disabled={disabled}
          onChange={(v) => onChange('is_active', v)}
          showState
        />
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  disabled,
  onChange,
  showState = false,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
  showState?: boolean;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-3 select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
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
        {label}
        {showState ? (
          <span className="ml-2 text-textSecondary">{checked ? 'Yes' : 'No'}</span>
        ) : null}
      </span>
    </label>
  );
}
