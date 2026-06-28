## Why

A multi-agent audit of the live app surfaced three defects that silently corrupt
or hide real data in the quarterly report and the field-capture flow. None throws
an error, so each one degrades trust without a visible failure:

1. **Site Master Plan slide renders blank.** The grid column names are split
   across the codebase — the DB, the forest list and the create wizard use the
   **singular** names (`box_column`, `tree_row`, `tree_column`), while
   `FullForestPayload` and the client report compute read only the **plural**
   aliases (`box_columns`, `tree_rows`, `tree_columns`). The server report builder
   (`lib/reportData.ts`) already reads `singular ?? plural`, but the client preview
   path (`reportCompute.ts`) read plural-only, so the Site Master Plan grid showed
   `—` whenever the payload carried singular names.
2. **Tree heights are silently capped at 30 ft.** Both the client and server
   growth-milestone derivations clamped height to `Math.min(30, v)` to stop a typo
   from rendering an absurd value. That also throws away the real height of any
   tree taller than 30 ft and presents a wrong number with no warning — a silent
   data loss in a measurement product.
3. **Field height/diameter can be silently dropped.** The field PWA captured
   height (m) and diameter (cm) from free-text decimal inputs and sent them as
   raw strings. The server coerces with `Number()` and drops any non-numeric value
   to `NULL` with no error, so a typo like `2..4` or `abc` vanished and the
   measurement was lost without the planter ever knowing.

## What Changes

- **Name-tolerant grid read on the client.** `reportCompute.ts.siteMasterPlan`
  now reads `box_column ?? box_columns`, `tree_row ?? tree_rows`,
  `tree_column ?? tree_columns`, mirroring the server. `FullForestPayload` is
  widened with the optional singular aliases so both shapes type-check. The Site
  Master Plan slide no longer renders blank for forests carrying singular names.
- **No artificial height ceiling.** The 30 ft clamp is removed from all four
  growth-height helpers (client `growthMilestones`; server `growthMilestones` and
  `currentHeightLabel`). Heights are floored at 0 (a negative height is nonsense)
  and otherwise shown exactly as entered.
- **Numeric measurements validated at capture.** `VisitPayload.height` /
  `.diameter` become `number`. The field Save handler parses the inputs, blocks
  the save with a toast (`"Height must be a number"` / `"Diameter must be a
  number"`) when a non-empty value is not finite, and submits the parsed number.
  The offline queue replay coerces stored values back to finite numbers. Bad input
  is rejected up front instead of silently lost on the server.

## Capabilities

### New Capabilities
- `report-rendering`: the rendered report tolerates the singular/plural grid-name
  split so the Site Master Plan grid is never blank for a well-formed forest, and
  growth heights are shown as entered (floored at 0, no upper ceiling) rather than
  silently capped.

### Modified Capabilities
- `capture-integrity`: numeric field measurements (height, diameter) are validated
  at capture; an invalid value is rejected with operator feedback and never
  silently dropped to null on the server.

## Impact

- Client: `pages/report/reportCompute.ts` (name-tolerant grid read, drop 30 ft
  clamp), `pages/Forests/fullTypes.ts` (singular grid aliases on
  `FullForestPayload`), `field/fieldApi.ts` (numeric `VisitPayload` + finite
  guard on FormData append), `pages/Field.tsx` (parse + validate + early-abort on
  Save; offline replay coercion).
- Server: `lib/reportData.ts` (drop 30 ft clamp in `growthMilestones` and
  `currentHeightLabel`). The server's grid read already tolerated both names.
- No DB migration. No new endpoints. The server's existing `numOrNull` coercion is
  unchanged — the fix is to stop feeding it values that round to null.
- Out of scope (owned elsewhere): the growth-milestone `current` flag divergence
  (`t.year === 0` vs project-year) is being fixed on a separate track and is left
  untouched here. Per-species O₂/CO₂ rates (Phase 1 placeholders) are pending an
  operator reference and tracked separately.
- Verification: `npm run typecheck` green in both `app/client` and `app/server`.
