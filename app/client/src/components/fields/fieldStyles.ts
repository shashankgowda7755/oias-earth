/**
 * Shared Tailwind class fragments that reproduce the MUI "outlined TextField
 * with floating label" look. Centralised so every Field variant stays visually
 * identical. The floating label is faked with an absolutely-positioned <label>
 * sitting on the field border (peer/placeholder-shown technique).
 */

/** Wrapper around a single field (label + control + helper text). */
export const fieldWrapper = 'relative w-full';

/** The notched outline + sizing common to text-like inputs. */
export function controlBase(hasError: boolean, disabled?: boolean): string {
  return [
    'peer w-full rounded-input border bg-surface px-3 py-3 text-[15px] text-textPrimary',
    'placeholder-transparent transition-colors outline-none',
    hasError
      ? 'border-danger focus:border-danger'
      : 'border-border focus:border-primary',
    disabled ? 'cursor-not-allowed bg-black/5 text-textSecondary' : '',
    // 2px focus border to match MUI's thickened outline
    hasError ? 'focus:ring-1 focus:ring-danger' : 'focus:ring-1 focus:ring-primary',
  ].join(' ');
}

/**
 * Floating label. Rests inside the field; rises to the border when the field
 * is focused or filled (placeholder hidden). Requires the control to carry a
 * placeholder=" " and the `peer` class (controlBase provides it).
 */
export function floatingLabel(hasError: boolean): string {
  return [
    'pointer-events-none absolute left-2 top-3 z-10 origin-left bg-surface px-1 text-[15px] text-textSecondary transition-all',
    // raised state: focused OR not showing placeholder (i.e. has value)
    'peer-focus:-top-2 peer-focus:text-label',
    'peer-[:not(:placeholder-shown)]:-top-2 peer-[:not(:placeholder-shown)]:text-label',
    hasError ? 'text-danger peer-focus:text-danger' : 'peer-focus:text-primary',
  ].join(' ');
}

/** Helper / error text under the control. */
export const helperText = 'mt-1 px-1 text-label leading-snug';
