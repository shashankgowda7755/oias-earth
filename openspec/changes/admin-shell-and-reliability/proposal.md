## Why

Three admin gaps surfaced this session:
1. The admin had no landing/overview — it opened straight into a data table.
2. Typing in Add/Edit dialogs lost focus after **every keystroke** (re-click
   needed per character), because `FormDialog`'s focus effect depended on the
   inline `onClose` (a new identity every render), so each keystroke re-ran the
   effect and called `panelRef.focus()`, yanking focus from the field.
3. A job sat at **"pending" forever** in the Jobs list — a seeded sample
   `report_generation_v1` job that no worker ever runs (serverless has no
   background processor), so it never completes or errors.

## What Changes

- **Dashboard bento home**: a new default "Home" section — KPI tiles
  (forests / trees / geo-tagged % / survival %, from `fetchForestsMap`), a large
  live-map tile, a recent-forests list (click → that forest), quick actions, and
  a reports shortcut. Section tabs remain the drill-in.
- **Form focus fix**: split `FormDialog`'s effect so the panel is focused ONLY on
  the open edge (`[open]`), not on every `onClose`/`submitting` change — so
  typing no longer loses focus. Fixes every FormDialog form.
- **Honest job status**: `jobs/list` maps any `pending` job older than 15 minutes
  to **`error`** ("Job stalled with no result") instead of a forever-spinner; the
  seed no longer ships a stuck pending job. Inline-`completed` upsert jobs are
  unaffected.

Status: shipped this session (commits incl. `12aafcd`, `c0f75b7`, dashboard
bento). Retroactive spec of record.

## Capabilities

### New Capabilities
- `admin-home`: the admin opens on a bento overview (KPIs + live map + recent
  forests + quick actions) before drilling into a section.

### Modified Capabilities
- `auth-and-roles`: admin form dialogs must keep input focus across keystrokes.
- (jobs) honest terminal state — a job that cannot complete is shown as `error`,
  never an indefinite `pending`.

## Impact

- **Client**: `pages/DashboardHome.tsx` (new), `pages/Dashboard.tsx` +
  `components/Sidebar.tsx` + `components/TabNav.tsx` (Home tab/default),
  `components/FormDialog.tsx` (focus-effect split), `components/ErrorBoundary.tsx`
  (app-level crash card — complements `harden-dom-crash-guard`).
- **Server**: `routes/lists.ts` (`jobs/list` stale-pending → error mapping),
  `app/db/migrations/002_seed.sql` (sample job no longer `pending`).
