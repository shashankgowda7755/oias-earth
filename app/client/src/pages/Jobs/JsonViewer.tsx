/**
 * Read-only pretty-printed JSON block used inside the job detail dialog.
 *
 * Renders a labelled <pre> with a "Copy" affordance. Falls back to a muted
 * "empty" line when the value is null/empty so each section is always present
 * and the dialog layout stays predictable.
 *
 * Accessibility: each block is a labelled region (the heading is associated via
 * aria-labelledby) and the copy button has an explicit aria-label.
 */
import { useId, useState } from 'react';
import { isEmptyJson, prettyJson } from './lib/format';

export interface JsonViewerProps {
  label: string;
  value: unknown;
}

export function JsonViewer({ label, value }: JsonViewerProps) {
  const headingId = useId();
  const [copied, setCopied] = useState(false);
  const empty = isEmptyJson(value);
  const text = prettyJson(value);

  const handleCopy = async () => {
    if (empty) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable (insecure context / denied permission).
      // Silently no-op — the JSON is already visible and selectable.
    }
  };

  return (
    <section aria-labelledby={headingId} className="space-y-1.5">
      <div className="flex items-center justify-between">
        <h3
          id={headingId}
          className="text-sm font-semibold text-textPrimary"
        >
          {label}
        </h3>
        {!empty ? (
          <button
            type="button"
            onClick={handleCopy}
            aria-label={`Copy ${label} JSON`}
            className="rounded-button px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        ) : null}
      </div>
      {empty ? (
        <p className="rounded-input border border-dashed border-border px-3 py-2 text-sm italic text-textSecondary">
          No data
        </p>
      ) : (
        <pre
          tabIndex={0}
          className="max-h-72 overflow-auto rounded-input border border-border bg-black/[0.03] p-3 text-xs leading-relaxed text-textPrimary"
        >
          <code>{text}</code>
        </pre>
      )}
    </section>
  );
}
