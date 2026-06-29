# Backend NOTES — faithful reproductions + proposed improvements

Per the rebuild brief (Phase 5): we implement the faithful version of each
documented behaviour, and where a flow/structure looked like a UX or
architecture problem we also note the improvement here.

## 1. RAW token (no `Bearer`) + 500 on bad token

**Faithful:** REST endpoints read the RAW JWT from `Authorization` (no `Bearer `
split). Missing header -> `403 "Missing Authorisation Token!"`. Malformed/expired
token -> `500` with the jsonwebtoken message verbatim (`jwt malformed`, etc).
This matches `spec.authObserved` and the brief's AUTH CONTRACT.

**Improvement:** A malformed/expired token is a client auth failure and should
be `401 Unauthorized`, not `500`. The original GraphQL surface used
`Bearer <token>`; standardising both surfaces on `Authorization: Bearer <jwt>`
and mapping all `jsonwebtoken` errors to `401` would be cleaner and
spec-compliant. Reproduced as-is in `src/auth/middleware.ts`; the fix is a
one-line status change there.

## 2. employee/list pagination shape

**Faithful:** `employee/list` returns `{data,total,page,limit}` (flat) while
every other list returns `{data,pagination:{total,page,limit}}`. We reproduce
both (see `routes/lists.ts`, and `FlatListResponse` vs `ListResponse` in
`shared/types.ts`).

**Improvement:** Normalise every list on the nested `{pagination}` shape in a v2
to remove the two-code-path inconsistency the spec flagged
(`openQuestions[7]`).

## 3. Writes: REST upsert/delete (CONFIRMED via live test)

**Confirmed (`spec/write_contracts.md`, 2026-06-16):** writes are REST, not
GraphQL (`openQuestions[3]` resolved). Implemented exactly:
`POST /api/v1/<entity>/upsert` (multipart **or** json; no `id` => INSERT, `id`
=> UPDATE; returns `{data:record}`) and `POST /api/v1/<entity>/delete`
(`{id,<entity>_id}` => HARD delete; returns `{message:"<Entity> deleted
successfully"}`). The earlier `POST/PATCH/DELETE /:entity[/:id]` REST-CRUD shape
has been **replaced** by these confirmed routes in `routes/crud.ts`.

## 4. Delete is a HARD delete (CONFIRMED)

**Confirmed:** the live confirm dialog warns "cannot be undone" + "detaches from
all associated forests and trees", and the delete is a true row delete despite an
`is_active` column existing (`openQuestions[4]` resolved). We `DELETE FROM`
the row and first detach join rows (forest_sponsors / forests_employees /
forests_reports / forest_boxes / forest_trees / forest_clusters) so FKs don't
block it. Lists still filter `WHERE is_active = TRUE` so a future soft-delete
toggle remains possible.

## 5. User creation is two statements, not a transaction

**Faithful behaviour, known gap:** Creating a user inserts a `user_profiles` row
then a `user_roles` row (`routes/crud.ts` `POST /users`). If the second insert
fails, the profile is orphaned.

**Improvement:** Wrap both inserts in a single `pool` client transaction
(`BEGIN`/`COMMIT`/`ROLLBACK`). Left as a follow-up to keep this foundation layer
small; flagged inline.

## 6. Forest creation = 2-step wizard fan-out (CONFIRMED + IMPLEMENTED)

**Confirmed (`spec` corrected: 2 steps "Basic Info" + "Grid Config", EditBoxDialog):**
`POST /forest/upsert` now accepts the full wizard payload and materialises it in
one transaction: `forests` row + `forest_boxes` + `forest_trees`
(capacity = `treeRow*treeColumn` per box; `tree_unique_id` = box `prefix` +
running number from `start`) + a representative `forest_clusters` row + join
rows (`forest_sponsors`, `forests_employees`), then inserts a `jobs` row
(`job_type:'forest_upsert_v1'`, `status:'completed'`) so the Jobs tab mirrors the
live async behaviour. On UPDATE (id present) the boxes/trees/joins are rebuilt
from the new payload.

**Deviation (noted in code):** the live system runs `forest_upsert_v1` as an
**async** job; we run it **synchronously** inside the request and write the job
row as already `completed`, so local dev sees the forest + trees immediately. A
production port would enqueue the job and let a worker do the fan-out.

## 10. Dual DB backend — embedded PGlite vs node-postgres

**Runnability:** `src/db.ts` resolves ONE backend behind a single
`query()`/`getClient()` API. When `DATABASE_URL` is set it uses `pg` (real
Postgres). When unset it uses embedded **PGlite** (`@electric-sql/pglite`, PG15
in-process) persisted to `./.pglite-data`, so the whole stack runs with **no
Postgres install**. `scripts/migrate.js` mirrors the same detection (PGlite uses
`db.exec()` for multi-statement files; pg uses `pool.query()`). The migrations
were verified PGlite-compatible: `gen_random_uuid()` is PG15 core (the
`CREATE EXTENSION pgcrypto` is wrapped in a tolerant `DO` block), and `jsonb`,
`json_build_object`, `array_agg`, plpgsql triggers, and `BEGIN/COMMIT` all run on
PGlite. **PGlite is single-connection**, so `getClient()` returns the shared
instance and transactions run serially — fine for local dev; the pooled `pg`
path is used in production.

## 7. filter_limit contents

**Best-effort:** `reports/list` returns a `filter_limit` block whose exact shape
the spec did not capture (`openQuestions[5]`). We return distinct
`years/quarters/modes/types` as a faithful best-effort to back a filter popover.

## 8. Auth folded into Postgres

**Documented deviation:** The original split auth onto a separate
`dev-auth.communitree.co.in` host whose user/credentials table we could not
introspect. For a self-contained local rebuild we store `username` +
`password_hash` on `user_profiles` and sign/verify JWTs with one shared
`JWT_SECRET`. `password_hash` is never returned by any endpoint.

## 9. Out-of-scope domains included for schema completeness

The sapling e-commerce, donor/gift-plant, and WhatsApp/nudge tables exist in the
introspected DB but are **not surfaced by any of the 6 admin sections**
(`openQuestions[9]`). They are created at the end of `001_init.sql` (marked
OUT-OF-SCOPE) so the schema is a faithful superset, but no API routes touch them.
Internal/test/scaffolding entities (`ForestTreesOur*`, `ForestClustersCopy`,
`Testtree`, `Testuser`, `ForestPrefix`, `SponserPrefix`, `TreeIdCount`) are
intentionally omitted as they are views/scratch tables, not real domain tables.
