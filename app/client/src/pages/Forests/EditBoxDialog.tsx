/**
 * EditBoxDialog (spec components.EditBoxDialog) — sub-modal opened by clicking a
 * Box card in the Grid Config step.
 *
 * Header: 'Row R • Column C' + Capacity / Planted / Remaining counters
 *   (capacity = tree_row * tree_column, e.g. 25 for a 5x5 box).
 * Fields: Prefix (text), Start Digits (number, default 1), Start (number,
 *   auto-calculated = previous box end + 1; editable). Once a Prefix is entered,
 *   species rows appear ('Enter prefix to add species details.') — each row is a
 *   species AutocompleteField (POST /master-plantspecies/search) + a count.
 * Footer: Cancel / Done.
 *
 * The dialog edits a LOCAL draft and commits to the wizard via onDone only when
 * the user confirms (Cancel discards). It does not write to the server — the
 * forest_upsert_v1 async job materializes ForestBox + ForestTree rows from the
 * prefix/start/species data the wizard submits.
 */
import { useEffect, useRef, useState } from 'react';
import { AutocompleteField, Button, TextField } from '@/components';
import { loadSpeciesOptions } from './api';
import { boxCapacity, boxPlanted, type BoxConfig, type BoxSpeciesRow } from './types';

export interface EditBoxDialogProps {
  open: boolean;
  /** The box being edited (already initialised with auto-calc `start`). */
  box: BoxConfig | null;
  treeRow: number;       // for capacity = treeRow * treeColumn
  treeColumn: number;
  onCancel: () => void;
  onDone: (box: BoxConfig) => void;
}

function Counter({ label, value, tone }: { label: string; value: number; tone?: 'ok' | 'over' }) {
  const valueClass =
    tone === 'over' ? 'text-danger' : tone === 'ok' ? 'text-primary' : 'text-textPrimary';
  return (
    <div className="flex flex-col items-center rounded-card bg-appbg px-3 py-2">
      <span className={`text-lg font-semibold tabular-nums ${valueClass}`}>{value}</span>
      <span className="text-label text-textSecondary">{label}</span>
    </div>
  );
}

export function EditBoxDialog({
  open,
  box,
  treeRow,
  treeColumn,
  onCancel,
  onDone,
}: EditBoxDialogProps) {
  const [draft, setDraft] = useState<BoxConfig | null>(box);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Re-seed the local draft whenever a (different) box is opened.
  useEffect(() => {
    setDraft(box);
  }, [box]);

  // Escape closes (cancel).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open || !draft) return null;

  const capacity = boxCapacity(treeRow, treeColumn);
  const planted = boxPlanted(draft);
  const remaining = capacity - planted;
  const overCapacity = remaining < 0;

  const setField = <K extends keyof BoxConfig>(key: K, value: BoxConfig[K]) => {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const updateSpecies = (index: number, patch: Partial<BoxSpeciesRow>) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const species = prev.species.map((s, i) => (i === index ? { ...s, ...patch } : s));
      return { ...prev, species };
    });
  };

  const addSpeciesRow = () => {
    setDraft((prev) =>
      prev
        ? { ...prev, species: [...prev.species, { species_id: '', species_label: '', count: '' }] }
        : prev,
    );
  };

  const removeSpeciesRow = (index: number) => {
    setDraft((prev) =>
      prev ? { ...prev, species: prev.species.filter((_, i) => i !== index) } : prev,
    );
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Edit box Row ${draft.row}, Column ${draft.col}`}
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        className="relative z-10 flex max-h-[88vh] w-full max-w-lg flex-col rounded-card bg-surface shadow-dialog"
      >
        {/* Header */}
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-textPrimary">
            Row {draft.row} • Column {draft.col}
          </h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Counter label="Capacity" value={capacity} />
            <Counter label="Planted" value={planted} tone={overCapacity ? 'over' : 'ok'} />
            <Counter label="Remaining" value={remaining} tone={overCapacity ? 'over' : undefined} />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Read-only prefix display */}
          <div className="mb-4 rounded-card border border-border bg-appbg px-3 py-2">
            <p className="text-label text-textSecondary">Tree ID prefix</p>
            <p className="font-mono text-sm font-semibold text-textPrimary">
              {draft.prefix || '—'}<span className="text-textSecondary">001, {draft.prefix || '—'}002…</span>
            </p>
          </div>

          {/* GPS coordinates (Layer 2) */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            <TextField
              label="GPS Latitude"
              type="number"
              inputMode="numeric"
              placeholder="12.9716"
              value={draft.box_lat ?? ''}
              onChange={(v) => setField('box_lat', v)}
            />
            <TextField
              label="GPS Longitude"
              type="number"
              inputMode="numeric"
              placeholder="77.5946"
              value={draft.box_lng ?? ''}
              onChange={(v) => setField('box_lng', v)}
            />
          </div>

          {/* Species section — always shown */}
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-textPrimary">Species Override</h3>
              {overCapacity ? (
                <span className="text-label text-danger">
                  Exceeds capacity by {Math.abs(remaining)}.
                </span>
              ) : null}
            </div>
            <p className="mb-3 text-xs text-textSecondary">
              Auto-filled from global species mix. Edit to override for this box.
            </p>

            {draft.species.length === 0 ? (
              <p className="text-label text-textSecondary">No species yet.</p>
            ) : (
              <ul className="space-y-3">
                {draft.species.map((row, i) => (
                  <li key={i} className="flex items-end gap-2">
                    <div className="flex-1">
                      <AutocompleteField
                        label="Species"
                        value={row.species_id}
                        onChange={(id, opt) =>
                          updateSpecies(i, { species_id: id, species_label: opt?.label ?? '' })
                        }
                        loadOptions={loadSpeciesOptions}
                        selectedOption={
                          row.species_id
                            ? { value: row.species_id, label: row.species_label || row.species_id }
                            : null
                        }
                        placeholder="Search species…"
                      />
                    </div>
                    <div className="w-24">
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
                      onClick={() => removeSpeciesRow(i)}
                      aria-label={`Remove species row ${i + 1}`}
                      className="mb-1.5 flex h-9 w-9 flex-none items-center justify-center rounded-button text-textSecondary hover:bg-danger/5 hover:text-danger"
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

            <Button variant="outlined" onClick={addSpeciesRow} className="mt-3 text-sm">
              + Add species
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="text" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => onDone({ ...draft, overridden: true })}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
