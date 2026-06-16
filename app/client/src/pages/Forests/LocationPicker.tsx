/**
 * MapLocationPicker (spec component) — faithful, dependency-free version.
 *
 * The original used an embedded Google Map ("Search location" box + draggable
 * pin, "Click to update coordinates"). Integrating the Google Maps JS SDK is
 * optional for this rebuild; instead we render:
 *   - a labelled placeholder map surface that, when clicked, focuses the lat
 *     input ("Click to set coordinates"), and
 *   - explicit Latitude / Longitude number inputs (the source of truth).
 *
 * This keeps the flow faithful (coordinates are required and user-set) while
 * remaining offline + keyless. To wire a real map later, replace the
 * placeholder <button> body with the Maps SDK and call `onChange` from the
 * pin's drag/click handler — the lat/long inputs stay as a manual fallback.
 *
 * TODO(spec components.MapLocationPicker): swap the placeholder for the Google
 * Maps JS SDK ("Search location" autocomplete + draggable pin). Keyless + no
 * external script in this build by design.
 *
 * Accessibility: the map surface is a real <button> with an aria-label; the
 * coordinate inputs use the shared TextField (labelled, error-wired).
 */
import { useRef } from 'react';
import { TextField } from '@/components';

export interface LocationPickerProps {
  lat: string;
  long: string;
  onChange: (next: { lat: string; long: string }) => void;
  latError?: string;
  longError?: string;
  required?: boolean;
  disabled?: boolean;
}

export function LocationPicker({
  lat,
  long,
  onChange,
  latError,
  longError,
  required,
  disabled,
}: LocationPickerProps) {
  const latInputRef = useRef<HTMLDivElement>(null);

  const focusLat = () => {
    // Move focus into the latitude input so keyboard users can type coordinates.
    latInputRef.current?.querySelector('input')?.focus();
  };

  return (
    <fieldset className="rounded-card border border-border p-3" disabled={disabled}>
      <legend className="px-1 text-sm font-medium text-textSecondary">
        Pick Location on Map{required ? <span aria-hidden="true"> *</span> : null}
      </legend>

      {/* Placeholder map surface */}
      <button
        type="button"
        onClick={focusLat}
        disabled={disabled}
        aria-label="Set coordinates"
        className="relative flex h-40 w-full items-center justify-center overflow-hidden rounded-input border border-dashed border-border bg-[#e8eef2] text-center transition-colors hover:bg-[#dfe7ed] focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {/* faux map grid */}
        <span
          aria-hidden="true"
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0,0,0,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.06) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <span className="relative flex flex-col items-center gap-1 text-textSecondary">
          <PinIcon />
          <span className="text-sm">
            {lat && long ? `${lat}, ${long}` : 'Click to set coordinates'}
          </span>
        </span>
      </button>
      <p className="mt-1 text-label text-textSecondary">Click to update coordinates</p>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div ref={latInputRef}>
          <TextField
            label="Latitude"
            type="number"
            inputMode="numeric"
            value={lat}
            onChange={(v) => onChange({ lat: v, long })}
            required={required}
            disabled={disabled}
            {...(latError ? { error: latError } : {})}
            placeholder="e.g. 9.9347"
          />
        </div>
        <TextField
          label="Longitude"
          type="number"
          inputMode="numeric"
          value={long}
          onChange={(v) => onChange({ lat, long: v })}
          required={required}
          disabled={disabled}
          {...(longError ? { error: longError } : {})}
          placeholder="e.g. 78.0009"
        />
      </div>
    </fieldset>
  );
}

function PinIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
