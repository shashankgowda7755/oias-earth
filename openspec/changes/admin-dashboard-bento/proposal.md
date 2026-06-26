## Why

The admin shell defaulted to a data-heavy section (a CRUD table) as its landing
view, so an admin who signed in had no at-a-glance read on the platform: how many
forests exist, how many trees are tracked, what share is geo-tagged, what the
rough survival rate is, or where the activity is on the map. Every common next
action (open a section, jump to the live map, build a report, inspect a forest)
required hunting through the secondary nav first. The shell needed a true
command-center HOME — one screen that summarizes the platform and routes the
operator to the next thing in one click.

## What Changes

- Add a **bento-grid HOME landing** (`app/client/src/pages/DashboardHome.tsx`)
  rendered as the default `Home` section of the admin shell. A single CSS grid
  (4 columns, auto rows) lays out tiles of varying span.
- **KPI tiles** computed live from `fetchForestsMap()`: Forests (count), Trees
  (summed `total_trees`), Geo-tagged (`tagged_trees / total_trees` %), Survival
  (`alive_trees ?? tagged_trees` over `total_trees` %). Each shows `—` while
  loading; the Trees tile uses the lime accent. Counts formatted `en-IN`.
- **Large live-map tile** (spans 2×3) embedding the interactive `HeartbeatMap`
  with the same forest pins, labelled "Live map".
- **Recent-forests list** (spans 3 rows): top 6 forests by `total_trees`; each
  row is a button that navigates to the public forest matrix at `/forest/:id`.
- **Quick-actions tile** (spans 2×2): four buttons that switch the active section
  in place via `onOpenTab` — Add forest → `Forests`, Reports, Sponsors,
  Integrity.
- **Reports shortcut tile** (spans 2 columns) with an "Open →" button that jumps
  to the `Reports` section.
- **Wire HOME as the default tab**: add `'Home'` to `SECTION_TABS`
  (`TabNav.tsx`), render `DashboardHome` when `active === 'Home'` and seed the
  initial state to `'Home'` (`Dashboard.tsx`), and give it a sidebar icon +
  entry (`Sidebar.tsx`). `DashboardHome` receives `setActive` as `onOpenTab`.
- **OIAS dark + lime theme**, responsive: the grid collapses to a single column
  (and tiles to span 1) below 760px via a scoped media query.

Status: already implemented and deployed. This change is the retroactive spec of
record.

## Capabilities

### New Capabilities
- `admin-shell`: the admin shell must present a summarizing bento HOME landing as
  its default view — live KPIs, an embedded live map, recent forests, and
  one-click routing to sections, the public map, and individual forests.

### Modified Capabilities
<!-- None — no existing spec's requirements change. -->

## Impact

- Client: `app/client/src/pages/DashboardHome.tsx` (new),
  `app/client/src/pages/Dashboard.tsx` (initial `active = 'Home'`, render
  `DashboardHome` with `onOpenTab={setActive}`),
  `app/client/src/components/TabNav.tsx` (`'Home'` first in `SECTION_TABS`),
  `app/client/src/components/Sidebar.tsx` (`Home` nav icon + entry).
- Data: read-only; the HOME view reuses the existing public `fetchForestsMap()`
  endpoint and the `HeartbeatMap` component. No new API, database, or dependency
  changes.
- Navigation: `Home` is the landing section; recent-forest rows route to the
  public `/forest/:id`; quick actions and the reports shortcut switch sections in
  place (URL stays `/dashboard`); the header link opens `/map`.
