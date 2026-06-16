/**
 * Round logo avatar for the Sponsors table (spec AvatarCell:
 * "Round avatar or 2-letter initials in user/sponsor/employee tables").
 *
 * Shows the sponsor_logo image when present; on a missing/broken URL it falls
 * back to up-to-2-letter initials on a tinted disc. Decorative for sighted
 * users — the adjacent name cell carries the accessible label, so the image is
 * aria-hidden to avoid a redundant screen-reader announcement.
 */
import { useState } from 'react';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

export function SponsorAvatar({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl: string | null;
}) {
  const [broken, setBroken] = useState(false);
  const showImage = Boolean(logoUrl) && !broken;

  return (
    <div className="flex items-center" aria-hidden="true">
      {showImage ? (
        <img
          src={logoUrl as string}
          alt=""
          onError={() => setBroken(true)}
          className="h-9 w-9 rounded-full border border-border object-contain bg-white"
        />
      ) : (
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {initials(name)}
        </span>
      )}
    </div>
  );
}
