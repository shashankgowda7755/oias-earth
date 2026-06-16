/** Indeterminate spinner. MUI-CircularProgress-like, primary green by default. */
export interface SpinnerProps {
  /** pixel size of the circle. Default 24. */
  size?: number;
  className?: string;
  /** Accessible label announced to screen readers. Default "Loading". */
  label?: string;
}

export function Spinner({ size = 24, className = '', label = 'Loading' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={`inline-block animate-spin rounded-full border-2 border-primary/25 border-t-primary ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
