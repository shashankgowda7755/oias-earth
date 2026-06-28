## ADDED Requirements

### Requirement: Bulk seed import is idempotent and duplicate-safe

A seed/import migration that inserts sponsors SHALL NOT depend on building a
UNIQUE index over a column that may already contain duplicate values in the target
database. Sponsor inserts MUST be guarded by `WHERE NOT EXISTS` on the normalised
name (`upper(trim(sponsor_name))`), so re-running the migration is a no-op and
pre-existing sponsor rows (including duplicates) are never deleted or merged.

#### Scenario: Target DB already has duplicate sponsor names

- **WHEN** the bulk-import migration runs against a database whose `sponsors` table
  already contains case-insensitive duplicate names
- **THEN** the migration completes without error (it does not `CREATE UNIQUE INDEX`
  over the duplicated column), the pre-existing duplicate rows are left untouched,
  and any sponsor not already present (case-insensitive) is inserted exactly once

#### Scenario: Migration re-runs on every cold start

- **WHEN** the serverless function cold-starts and re-applies all migrations
- **THEN** the bulk-import migration is an idempotent no-op on an already-populated
  database (no duplicate rows created, no error) and the API boots normally

### Requirement: Seed migrations never crash cold-start boot

A bulk seed/import migration SHALL NOT throw on a populated production database.
Because migrations re-run on every serverless cold start, it MUST avoid operations
— such as building a UNIQUE index over existing duplicate data — that fail when
prior data is present, so the import adds only the missing rows rather than
aborting boot.

#### Scenario: Import on a populated production DB

- **WHEN** the import migration runs on production where sponsors and forests
  already exist
- **THEN** the function boots, every API endpoint serves HTTP 200, and the import
  inserts only the rows that are missing (no duplicates, no FK orphans)
