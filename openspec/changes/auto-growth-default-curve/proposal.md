## Why

Slide 13 ("Expected Plant Growth") went blank ("No growth data") whenever a forest
had no manually-entered `target_height_range`. Operators expect the growth chart to
be **automatic**: pick the plantation date and the report quarter, and the slide
renders the milestone curve, the per-quarter interpolation, and a highlighted
"current" point — with nothing typed. The right panel also needed the polished
milestone-card design (current year highlighted, live "Current Height" pill)
instead of the plain card/table it had.

## What Changes

- **Default 3-year growth curve.** When a forest has no entered targets, the report
  falls back to a standard curve so the slide is never blank:
  - Year 0: 2–3 ft (at plantation)
  - End of Year 1: 7–8 ft
  - End of Year 2: 8–9 ft
  - End of Year 3: 10–14 ft
  Applied in both the client (`reportCompute.ts.buildGrowth`) and the server
  (`reportData.ts.growthMilestones`) so web and PDF/report-data agree.
- **Quarterly auto-division.** Each year's band divides equally across its 4
  quarters via linear month→height interpolation. The report period (fiscal year +
  quarter) sets the "as of" month, which picks the interpolated current height.
- **Auto from plantation date.** With the default in place, the slide renders from
  the plantation date alone; a manually-entered curve still overrides it.
- **Polished milestone cards.** Right panel shows Year 0 → End of Year 3 cards; the
  year the report has reached is highlighted (dark green) with a live "Current
  Height" pill showing the interpolated feet at the report quarter. Removed the
  separate "Existing Growth" row and fixed a double-"Feet" suffix.

## Capabilities

### Modified Capabilities
- `report-rendering`: the growth slide auto-renders from a default 3-year curve and
  the plantation date when no targets are entered, divides each year equally across
  four quarters, and highlights the reached year with a live current-height
  readout. A manually-entered curve overrides the default.

## Impact

- Client: `pages/report/reportCompute.ts` (`DEFAULT_GROWTH_TARGETS`, `buildGrowth`
  fallback, no longer returns null), `pages/report/slides/slides2.tsx` (`S13Growth`
  polished cards, current-year highlight + pill, subtitle, double-Feet fix).
- Server: `lib/reportData.ts` (`DEFAULT_GROWTH_TARGETS`, `growthMilestones`
  fallback) for PDF/report-data parity.
- No DB migration, no new endpoints. A forest with its own `target_height_range`
  is unaffected (manual data wins).
- Verification: `npm run typecheck` green in `app/client` and `app/server`.
- Out of scope (separate track): the growth-milestone `current` flag definition in
  the server's per-year list; per-species growth curves.
