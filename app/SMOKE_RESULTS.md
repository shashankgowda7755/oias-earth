# Smoke Test Results — Embedded PGlite (no external Postgres)

_Run by the smoke-test agent on 2026-06-16. Node v24.13.0, npm 11.6.2._
_Backend: embedded PGlite (`@electric-sql/pglite`), `DATABASE_URL` unset._

## PASS/FAIL summary

| Check | Result | Evidence |
|---|---|---|
| Server `npm install` | **PASS** | 197 pkgs audited, 0 vulns |
| Client `npm install` | **PASS** | 165 pkgs (2 high-sev advisories — transitive, non-blocking; see note) |
| Migrate (fresh PGlite) | **PASS** | `001_init.sql` + `002_seed.sql` applied to `./.pglite-data` |
| Migrate (re-run, idempotent) | **PASS** | second run applies cleanly, no errors |
| Server boot (PGlite) | **PASS** | `listening on :4000 (db backend: pglite)` |
| `GET /health` | **PASS** | `{"ok":true,"service":"communitree-admin-server","db":"pglite"}` |
| Login `communitree_admin/communitree123` | **PASS** | token len 348, `user.role=SuperAdmin`, `roleId=3` |
| Auth: no header → 403 | **PASS** | `Missing Authorisation Token!` |
| Auth: `Bearer <tok>` → 500 | **PASS** | legacy quirk reproduced (jwt malformed) |
| Auth: raw token → 200 | **PASS** | confirmed contract (no `Bearer ` prefix) |
| `users/list` | **PASS** | `{data,pagination}`, rows mixed camel/snake (`firstName`,`role`,`roleId`,`user_role_id`) |
| `roles/list` | **PASS** | `{data,pagination}`, rows `{id,name}` |
| `sponsors/list` | **PASS** | `{data,pagination}`, snake_case + `createdAt/updatedAt` |
| `employee/list` | **PASS** | **flat** `{data,total,page,limit}` (confirmed legacy shape) |
| `forest/list` | **PASS** | `{data,pagination}`; `forest_oxygen` serialises as string `"2069100.00"`; nested `created_by {id,first_name}`; nested `sponsors[]` |
| `reports/list` | **PASS** | `{data,pagination,filter_limit}`; `filter_limit` keys `years,quarters,modes,types` |
| `jobs/list` | **PASS** | `{data,pagination}` |
| Sponsor upsert INSERT (no id) | **PASS** | `{data:{id...}}`, name + established_year persisted |
| Sponsor upsert UPDATE (with id) | **PASS** | id unchanged, name changed, est_year preserved |
| Sponsor delete `{id,sponsor_id}` | **PASS** | `{message:"Sponsor deleted successfully"}`; gone (search → 0) |
| Sponsor upsert MULTIPART + file | **PASS** | `sponsor_logo` saved → `/uploads/...`, served back HTTP 200 (25 bytes) |
| Forest upsert (2-box wizard JSON) | **PASS** | `{data}`, `total_trees:8` (2 boxes × 2×2 cap), `sponsors[]:1` |
| Forest `forest_upsert_v1` job created | **PASS** | `status:completed`, desc `{total_number_of_boxes:2,total_number_of_trees:8}` |
| Forest trees generated | **PASS** | 8 trees (capacity = tree_row*tree_column, 2 boxes) — confirmed via `total_trees` + job desc |
| Forest delete `{id,forest_id}` | **PASS** | `{message:"Forest deleted successfully"}`; gone (search → 0) |
| Client `tsc -b` | **PASS** | exit 0 |
| Client `vite build` | **PASS** | 189 modules; JS 367.25 kB / gzip 112.87 kB, CSS 27.35 kB |
| Server `tsc --noEmit` | **PASS** | exit 0 |
| Server runtime errors during tests | **PASS** | no `[error]` lines in server log |

**Overall: ALL PASS. App runs end-to-end on embedded PGlite with NO external Postgres.**

## Exact commands run

```bash
# Server
cd /Users/mukesh/Claude/communitree-rebuild/app/server
npm install
rm -rf .pglite-data uploads          # clean-state migration test
npm run migrate                       # fresh PGlite
npm run migrate                       # idempotency re-run
PORT=4000 npm run dev                 # background; predev re-runs migrate

# Client
cd /Users/mukesh/Claude/communitree-rebuild/app/client
npm install
npx tsc -b
npx vite build

# HTTP smoke (auth = raw token, no Bearer)
curl -s http://localhost:4000/health
curl -sX POST .../api/v1/auth/login -d '{"username":"communitree_admin","password":"communitree123"}'
# 7 lists, sponsor INSERT/UPDATE/DELETE, multipart upload, forest wizard upsert+job+delete
```

## Key output snippets

- **Health**: `{"ok":true,"service":"communitree-admin-server","db":"pglite"}`
- **Login user**: `{"profileId":"d21cabf2-...","username":"communitree_admin","role":"SuperAdmin","roleId":3}`
- **employee/list top-keys**: `data,total,page,limit` (flat — distinct from the `{data,pagination}` of every other list)
- **forest_oxygen**: `string "2069100.00"` (NUMERIC → string, matches live REST)
- **forest job desc**: `{"forest_id":"a783e68c-...","total_number_of_boxes":2,"total_number_of_trees":8}` status `completed`
- **multipart logo URL**: `http://localhost:4000/uploads/sponsor_logo-<ts>-ct_logo.png` → GET 200

## Fixes applied during smoke test

None. The reconciled code ran clean on the first boot — migrate, server, all lists, all CRUD lifecycles, multipart upload, and the forest wizard fan-out all passed without source edits. No build or run breakers were found.

## Notes / non-blocking

- Client `npm install` reports 2 high-severity advisories (transitive dev-dep chain, not exercised at runtime); not fixed here to avoid `--force` breaking-change bumps outside this agent's scope. Flag for a future `npm audit fix` pass.
- `multer@1.x` emits a deprecation warning (server agent's documented choice for the stable API); harmless, flag for a future 2.x bump.
- The earlier inline-parser "NON-JSON" print on `forest/list` was a test-harness stdin-chunking artifact, not an endpoint failure — re-verified: forest/list returns valid JSON with the full confirmed shape.
- `.pglite-data/` and `uploads/` are regenerated by `npm run migrate` / first multipart upload; safe to delete between runs.
```
```
