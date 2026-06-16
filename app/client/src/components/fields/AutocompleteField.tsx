/**
 * AutocompleteField — async-search single-select combobox.
 *
 * Used by the forest wizard for Site Manager (employee), Sponsor, User, and
 * Species (master-plantspecies/search) pickers — anywhere the option set is too
 * large to render as a plain <select> and is fetched/filtered server-side.
 *
 * Contract:
 *   - value: the selected option's id (string) or '' when none.
 *   - onChange(id, option?): fires with the chosen id (and full option object).
 *   - loadOptions(query): async; returns AutocompleteOption[]. Debounced here.
 *     Pass a wrapper over `speciesSearch` / `listEntity(...)` from your module.
 *   - For a value that isn't in the current result page (e.g. an edit form
 *     prefilled with an id), pass `selectedOption` so the input shows its label
 *     without needing a fetch.
 *
 * Accessibility: WAI-ARIA combobox pattern — role="combobox" input wired to a
 * role="listbox" popup via aria-controls/aria-activedescendant; ArrowUp/Down,
 * Enter, Escape supported; label associated via htmlFor.
 */
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { controlBase, fieldWrapper, helperText } from './fieldStyles';
import { Spinner } from '../Spinner';

export interface AutocompleteOption {
  value: string;
  label: string;
  /** Optional secondary text shown muted under/next to the label. */
  description?: string;
}

export interface AutocompleteFieldProps {
  label: string;
  /** Selected option id, or '' when nothing is chosen. Controlled. */
  value: string;
  onChange: (value: string, option?: AutocompleteOption) => void;
  /** Async option loader; debounced internally. */
  loadOptions: (query: string) => Promise<AutocompleteOption[]>;
  /** Show the current selection's label without a fetch (edit prefill). */
  selectedOption?: AutocompleteOption | null;

  name?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
  placeholder?: string;
  /** Debounce window for loadOptions. Default 300ms. */
  debounceMs?: number;
  /** Min chars before searching. Default 0 (load on focus). */
  minChars?: number;
}

export function AutocompleteField({
  label,
  value,
  onChange,
  loadOptions,
  selectedOption = null,
  name,
  id,
  required,
  disabled,
  error,
  helperText: helper,
  className = '',
  placeholder = ' ',
  debounceMs = 300,
  minChars = 0,
}: AutocompleteFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const listId = `${fieldId}-listbox`;
  const describedBy = error || helper ? `${fieldId}-help` : undefined;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<AutocompleteOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  // Cache the chosen option's label so the closed input shows it.
  const [chosen, setChosen] = useState<AutocompleteOption | null>(selectedOption);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the displayed label in sync when the parent supplies/clears selection.
  useEffect(() => {
    if (selectedOption && selectedOption.value === value) {
      setChosen(selectedOption);
    } else if (!value) {
      setChosen(null);
    }
  }, [selectedOption, value]);

  // Debounced async load while the popup is open.
  useEffect(() => {
    if (!open) return;
    if (query.length < minChars) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const handle = window.setTimeout(() => {
      loadOptions(query)
        .then((opts) => {
          if (!cancelled) {
            setOptions(opts);
            setActiveIndex(opts.length ? 0 : -1);
          }
        })
        .catch(() => {
          if (!cancelled) setOptions([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, debounceMs);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
    // loadOptions is expected to be stable (useCallback) per call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query, minChars, debounceMs]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        closeAndRestore();
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, chosen]);

  function openPopup() {
    if (disabled) return;
    setOpen(true);
    setQuery('');
  }

  function closeAndRestore() {
    setOpen(false);
    setQuery('');
    setActiveIndex(-1);
  }

  function select(opt: AutocompleteOption) {
    setChosen(opt);
    onChange(opt.value, opt);
    closeAndRestore();
    inputRef.current?.blur();
  }

  function clear() {
    setChosen(null);
    onChange('');
    setQuery('');
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) openPopup();
      else setActiveIndex((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      if (open && activeIndex >= 0 && options[activeIndex]) {
        e.preventDefault();
        select(options[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        closeAndRestore();
      }
    }
  }

  // When open we edit `query`; when closed we show the chosen label.
  const inputValue = open ? query : chosen?.label ?? '';
  const activeId = activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined;
  const labelRaised = open || Boolean(chosen);

  return (
    <div ref={rootRef} className={`${fieldWrapper} ${className}`}>
      <input
        ref={inputRef}
        id={fieldId}
        name={name}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        value={inputValue}
        placeholder={placeholder}
        disabled={disabled}
        required={required && !chosen}
        onFocus={openPopup}
        onChange={(e) => {
          if (!open) setOpen(true);
          setQuery(e.target.value);
        }}
        onKeyDown={onKeyDown}
        className={`${controlBase(Boolean(error), disabled)} pr-16`}
      />
      <label
        htmlFor={fieldId}
        className={`pointer-events-none absolute left-2 z-10 bg-surface px-1 transition-all ${
          labelRaised ? '-top-2 text-label' : 'top-3 text-[15px]'
        } ${error ? 'text-danger' : labelRaised ? 'text-textSecondary' : 'text-textSecondary'}`}
      >
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>

      {/* Clear / chevron affordances */}
      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {chosen && !disabled ? (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear selection"
            className="rounded-full p-1 text-textSecondary hover:text-textPrimary"
          >
            <CloseIcon />
          </button>
        ) : null}
        <span className="pointer-events-none text-textSecondary">
          <ChevronDownIcon />
        </span>
      </div>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-input border border-border bg-surface py-1 shadow-dialog"
        >
          {loading ? (
            <li className="flex items-center justify-center gap-2 px-3 py-3 text-sm text-textSecondary">
              <Spinner size={16} /> Searching…
            </li>
          ) : options.length === 0 ? (
            <li className="px-3 py-3 text-sm text-textSecondary">
              {query.length < minChars
                ? `Type at least ${minChars} character${minChars === 1 ? '' : 's'}…`
                : 'No matches.'}
            </li>
          ) : (
            options.map((opt, i) => (
              <li
                key={opt.value}
                id={`${listId}-opt-${i}`}
                role="option"
                aria-selected={opt.value === value}
                onMouseDown={(e) => {
                  e.preventDefault(); // keep focus; pick before blur
                  select(opt);
                }}
                onMouseEnter={() => setActiveIndex(i)}
                className={`cursor-pointer px-3 py-2 text-sm ${
                  i === activeIndex ? 'bg-primary/10 text-textPrimary' : 'text-textPrimary'
                }`}
              >
                <span className="block">{opt.label}</span>
                {opt.description ? (
                  <span className="block text-label text-textSecondary">{opt.description}</span>
                ) : null}
              </li>
            ))
          )}
        </ul>
      ) : null}

      {error ? (
        <p id={`${fieldId}-help`} className={`${helperText} text-danger`}>
          {error}
        </p>
      ) : helper ? (
        <p id={`${fieldId}-help`} className={`${helperText} text-textSecondary`}>
          {helper}
        </p>
      ) : null}
    </div>
  );
}

function ChevronDownIcon(): ReactNode {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CloseIcon(): ReactNode {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
