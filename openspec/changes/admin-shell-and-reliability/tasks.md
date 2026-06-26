# Tasks

## Dashboard bento home
- [x] `DashboardHome.tsx`: KPI tiles (forests/trees/geo-tagged/survival), live-map tile, recent forests (→ forest), quick actions, reports shortcut
- [x] Add `Home` tab + icon; default the dashboard to Home; render bento there

## Form focus fix
- [x] `FormDialog.tsx`: focus the panel only on `[open]`; keep escape/scroll-lock on `[open, submitting, onClose]`
- [x] Verified: continuous typing in Add Forest keeps focus (created a forest end-to-end)

## App error boundary
- [x] `ErrorBoundary.tsx` + wrap the router — render-crash shows a card + Reload + error detail, never a blank screen (complements the DOM guard)

## Honest job status
- [x] `jobs/list`: `pending` older than 15 min → `error` ("Job stalled with no result")
- [x] `002_seed.sql`: sample `report_generation_v1` job no longer seeded as `pending`
- [x] Verified live: Jobs read `12 completed · 1 error` (was `… · 1 pending`)
