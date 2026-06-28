## Why

Migration `027_bulk_import_180_sites.sql` (bulk seed of 52 sponsors + 107 active
forests from the 180-Sites Excel) created
`CREATE UNIQUE INDEX uq_sponsors_name ON sponsors (upper(trim(sponsor_name)))` to
back its sponsor `ON CONFLICT` upserts. Production's `sponsors` table already held
**case-insensitive duplicate names**, so the index could not be built and the
migration threw `duplicate key value violates unique constraint "uq_sponsors_name"`.

Migrations run on **every serverless cold start** (no applied-tracking table —
`api/index.js` re-applies all of `app/db/migrations/*.sql`), and a thrown
migration aborted boot, so **every API endpoint returned 500** — a full prod API
outage. The static shell loaded; `/health`, `/auth/login`, all `/public/*` →
`FUNCTION_INVOCATION_FAILED`.

A parallel change (commit `2926020`) made the migration runner catch per-migration
failures so one bad migration can't crash the API. This change removes the **root
cause** so the import actually completes instead of being skipped.

## What Changes

- **Drop** the `uq_sponsors_name` unique-index creation from 027. Nothing in the
  app relied on it (grep: zero references) — it existed only to back the sponsor
  `ON CONFLICT`.
- **Convert** the 52 sponsor inserts from
  `INSERT … ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING` to
  `INSERT … SELECT … WHERE NOT EXISTS (SELECT 1 FROM sponsors WHERE
  upper(trim(sponsor_name)) = upper(trim('<name>')))`. Same case-insensitive
  de-dupe, but needs no unique index and **never deletes or merges existing
  (duplicate) sponsor rows** — integrity preserved.
- `forests` (`uq_forests_internal_id`) and `forest_sponsors` (`uq_forest_sponsors`)
  index creations are unchanged; prod has no duplicates there and they back those
  tables' `ON CONFLICT` upserts.

**Convention note** (`project.md`: "Never edit a shipped migration"): 027 had never
successfully applied on prod — it crashed before completing — and the runner
re-runs every migration each cold start with no tracking table, so the only way to
stop the crash loop was to make 027 itself idempotent + duplicate-safe. The end
state is identical to a clean first run.

Status: shipped this session (commit `a724606`, fast-forwarded onto `main`
`58a96a5..a724606`, deployed to prod). Verified: an isolated PGlite repro proves
the old unique-index creation fails on duplicate names while the new
`WHERE NOT EXISTS` is idempotent + case-insensitive and leaves pre-existing
duplicates untouched; a fresh PGlite boot applies 027 clean (110 forests). Prod
post-deploy: all endpoints 200, no migration errors, DB unchanged (53 sponsors /
111 active forests / 116 links, 0 duplicates, 0 orphans). Retroactive spec of
record.

## Capabilities

### New Capabilities

- `seed-data-import`: bulk seed/import migrations import sponsors + forests
  idempotently and can never crash cold-start boot, even when the target database
  already contains duplicate sponsor names.

## Impact

- **DB**: `app/db/migrations/027_bulk_import_180_sites.sql` — drop the sponsor
  unique index; sponsor inserts → `WHERE NOT EXISTS`.
- **Runtime**: removes the cold-start 500 outage root cause. No data mutation on a
  populated DB (idempotent no-op).
- **Related**: cold-start migration-runner resilience (commit `2926020`, separate
  change) — defence in depth so a future bad migration degrades instead of crashing.
