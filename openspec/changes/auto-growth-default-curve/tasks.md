# Tasks — auto-growth-default-curve

> Status: implemented; typecheck green in client + server. Deploying to web.

## 1. Default curve + auto-render

- [x] 1.1 Client `reportCompute.ts`: add `DEFAULT_GROWTH_TARGETS` (Y0 2–3, Y1 7–8,
  Y2 8–9, Y3 10–14); `buildGrowth` uses it when no entered targets; no longer
  returns null so the slide is never blank
- [x] 1.2 Server `reportData.ts`: same default in `growthMilestones` for PDF/API parity
- [x] 1.3 Manual `target_height_range` still overrides the default

## 2. Quarterly division + current point

- [x] 2.1 Year bands interpolate equally across 4 quarters (linear month→height)
- [x] 2.2 Report fiscal year+quarter sets the "as of" month → interpolated current height

## 3. Polished card design (Slide 13)

- [x] 3.1 Right panel: Year 0 → End of Year 3 cards; reached year highlighted dark green
- [x] 3.2 Live "Current Height" pill on the highlighted card
- [x] 3.3 Removed separate "Existing Growth" row; fixed double-"Feet" suffix
- [x] 3.4 Added "Projected sequestration…" subtitle

## 4. Verify + ship

- [x] 4.1 `npm run typecheck` — client + server clean
- [ ] 4.2 Commit + deploy to prod (web)
- [ ] 4.3 Post-deploy spot-check Slide 13 on a forest with no manual growth data
