/**
 * Async multi-select built on the shared single-select AutocompleteField.
 *
 * The client core ships AutocompleteField as a SINGLE-select async combobox
 * (CONTRACTS.md §4). The forest Sponsor* field is multi (spec: "Sponsor*
 * autocomplete", multiple). Rather than duplicate the combobox a11y here, this
 * wraps AutocompleteField: each pick appends to the selected list (then the
 * field clears for the next pick), and selected items render as removable chips
 * above it. Already-selected ids are filtered out of the option results.
 *
 * Controlled by `value: string[]`. `onChange(nextIds, labels)` returns the new
 * id list plus an id->label map so the page can show chips without refetching.
 */
import { useCallback } from 'react';
import { AutocompleteField, type AutocompleteOption } from '@/components';

export interface MultiAutocompleteFieldProps {
  label: string;
  value: string[];                              // selected ids
  labels: Record<string, string>;              // id -> display label (for chips)
  onChange: (ids: string[], labels: Record<string, string>) => void;
  loadOptions: (query: string) => Promise<AutocompleteOption[]>;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  placeholder?: string;
}

export function MultiAutocompleteField({
  label,
  value,
  labels,
  onChange,
  loadOptions,
  required,
  disabled,
  error,
  helperText,
  placeholder,
}: MultiAutocompleteFieldProps) {
  // Hide already-picked ids from the dropdown.
  const filteredLoad = useCallback(
    async (query: string): Promise<AutocompleteOption[]> => {
      const opts = await loadOptions(query);
      const selected = new Set(value);
      return opts.filter((o) => !selected.has(o.value));
    },
    [loadOptions, value],
  );

  const add = (id: string, option?: AutocompleteOption) => {
    if (!id || value.includes(id)) return;
    const nextLabels = { ...labels, [id]: option?.label ?? id };
    onChange([...value, id], nextLabels);
  };

  const remove = (id: string) => {
    const nextLabels = { ...labels };
    delete nextLabels[id];
    onChange(
      value.filter((x) => x !== id),
      nextLabels,
    );
  };

  return (
    <div>
      {value.length > 0 ? (
        <ul className="mb-2 flex flex-wrap gap-1.5" aria-label={`Selected ${label}`}>
          {value.map((id) => (
            <li key={id}>
              <span className="inline-flex items-center gap-1 rounded-pill border border-border bg-black/[0.04] py-1 pl-3 pr-1 text-sm text-textPrimary">
                {labels[id] ?? id}
                {!disabled ? (
                  <button
                    type="button"
                    onClick={() => remove(id)}
                    aria-label={`Remove ${labels[id] ?? id}`}
                    className="flex h-5 w-5 items-center justify-center rounded-full text-textSecondary hover:bg-white/10 hover:text-textPrimary"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <AutocompleteField
        label={label}
        // value always '' — the field is a pick-then-clear adder; selections
        // live in the chip list above.
        value=""
        onChange={add}
        loadOptions={filteredLoad}
        required={required && value.length === 0}
        disabled={disabled}
        error={error}
        helperText={helperText}
        placeholder={placeholder ?? 'Search to add…'}
      />
    </div>
  );
}
