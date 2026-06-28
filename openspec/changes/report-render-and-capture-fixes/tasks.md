# Tasks — report-render-and-capture-fixes

> Status: all three fixes landed; `npm run typecheck` green in `app/client` and
> `app/server`. Not yet committed/deployed at time of writing.

## 1. Site Master Plan grid name tolerance

- [x] 1.1 `reportCompute.ts.siteMasterPlan`: read `box_column ?? box_columns`,
  `tree_row ?? tree_rows`, `tree_column ?? tree_columns` (mirror the server)
- [x] 1.2 `fullTypes.ts`: widen `FullForestPayload` with optional singular aliases
  `box_column?`, `tree_row?`, `tree_column?` (keep the plural fields)
- [x] 1.3 Typecheck the client — singular reads compile against the widened type

## 2. Remove the 30 ft height ceiling

- [x] 2.1 Client `reportCompute.ts.growthMilestones`: `ft = Math.max(0, v)` (drop
  `Math.min(30, …)`); update the misleading comment
- [x] 2.2 Server `reportData.ts.growthMilestones`: same change + comment
- [x] 2.3 Server `reportData.ts.currentHeightLabel`: same change
- [x] 2.4 Left the `current: t.year === 0` line untouched (owned by a separate track)

## 3. Validate field height/diameter at capture

- [x] 3.1 `fieldApi.ts`: `VisitPayload.height`/`.diameter` → `number`; FormData
  append guards `Number.isFinite` before sending
- [x] 3.2 `Field.tsx` Save: parse inputs, `flash(...)` + early-return on non-finite
  non-empty value, submit parsed numbers
- [x] 3.3 `Field.tsx` offline-queue replay: coerce stored strings with `Number()`,
  pass only finite values into the numeric `VisitPayload`

## 4. Verify

- [x] 4.1 `npm run typecheck` — client clean (exit 0)
- [x] 4.2 `npm run typecheck` — server clean
- [ ] 4.3 Deploy to prod and spot-check a report's Site Master Plan + a field visit
  with a tall tree (post-deploy, manual)
