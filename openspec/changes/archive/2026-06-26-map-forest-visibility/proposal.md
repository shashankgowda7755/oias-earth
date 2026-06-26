## Why

Created forests appeared to be **missing from the map**. Investigation showed it
was **not** data loss — `/public/forests-map` returns every active forest that
has a centre coordinate, and all map surfaces render the full list. The real
causes were:

1. **Garbage coordinates.** Several test forests had bogus coordinates
   (`lat == lng` in the ocean off Africa; points in Zimbabwe and Pakistan).
   The map auto-fits its viewport to *all* pins, so these dragged the view
   across three continents and collapsed the real (South India) forests into a
   single dot — they looked "gone."
2. **Identical coordinates stack.** Forests at the same point (e.g. two blocks
   at one campus — "Bangalore University" and "CGI - Bangalore University" share
   `12.94418,77.50847`) rendered as a single marker, hiding all but one.
3. **No guard at create.** Nothing stopped a forest being saved with missing or
   nonsensical coordinates, so the data kept rotting.

The product rule is simple: *every forest that is created must be visible on the
map.* That rule was already satisfied for sane data, but nothing enforced sane
data or de-cluttered overlapping pins.

## What Changes

- **Create-time coordinate guard** (`routes/forest.ts`): a new forest must have
  latitude & longitude, and any write that sets them rejects garbage — blank,
  `0/0`, `lat == lng`, or out of range (`|lat|>90`, `|lng|>180`). This is what
  prevents invisible / mis-plotted forests going forward.
- **De-stack pins** (`HeartbeatMap`, `PublicMap`): forests sharing identical
  coordinates fan out on a golden-angle spiral (~40 m steps) so each is an
  individually visible and clickable pin instead of one stacked marker.
- **Data cleanup**: 7 junk test forests with bogus coordinates soft-deleted
  (reversible `is_active=FALSE`) in production.

Status: code implemented and pushed (commit `05026db`); data cleanup applied in
prod. This change is the retroactive spec of record.

## Capabilities

### New Capabilities
- `forest-map-visibility`: every active forest with a centre coordinate renders
  as an individually visible map pin (overlapping coordinates are spread, never
  hidden), and forests cannot be persisted with missing or invalid coordinates.

### Modified Capabilities
- `forest-geotagging`: gains a server-side coordinate validity guard on create
  and update (reject blank / `0/0` / `lat==lng` / out-of-range).

## Impact

- **Server**: `routes/forest.ts` — coordinate guard in the forest upsert handler
  (create requires coords; any coord write is range/sanity-checked).
- **Client**: `components/HeartbeatMap.tsx`, `pages/PublicMap.tsx` — golden-angle
  jitter for identical coordinates (marker position + fit-bounds only; popups
  show real data).
- **Data**: 7 forests soft-deleted in prod Neon (`t`, `55`×2, `99`, `11`,
  `test`, `cgi`) — reversible by flipping `is_active` back.
- No new dependencies, no migration.
