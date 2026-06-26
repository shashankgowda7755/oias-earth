## Why

The row-action kebab (⋮ → View / Edit / Delete …) must be in the SAME place in
every admin table — the **leftmost, sticky column**, visible on both desktop and
mobile — so operators always know where to find it. The shared `DataTable`
already defaults to `actionsLeft` (sticky `left-0`), but the **Reports** table
was the holdout: it still declared a manual right-aligned `actions` column,
putting its kebab on the right while every other table had it on the left.

## What Changes

- **Reports** table: remove its manual right-side `actions` column; render row
  actions via `DataTable`'s `renderRowActions`, so the kebab lands in the shared
  **left sticky** actions column like Forests / Employees / Sponsors / Users /
  Jobs. View / Send / Edit / Delete behaviour unchanged.
- Confirmed site-wide: all `DataTable` tables use the default left+sticky actions
  column (no `actionsLeft={false}` overrides); read-only tables (Logs, Emails,
  Integrity, Planters) have no row actions. The kebab is leftmost + sticky +
  visible at mobile (390px verified: `position: sticky; left: 0`) and desktop.

Status: shipped this session. Retroactive spec of record (the global left-pin was
landed earlier in `598de08`; this finishes the one inconsistent table).

## Capabilities

### Modified Capabilities
- `admin-home`: row-action menus are leftmost and sticky in every admin table,
  consistently, on mobile and desktop.

## Impact

- **Client**: `pages/Reports/index.tsx` (drop manual actions column → use
  `DataTable` `renderRowActions`). No other table changed (already left).
