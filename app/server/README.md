# OIAS Earth Admin — Backend (server + db)

Express + TypeScript + `pg` API and PostgreSQL schema for the
"OIAS Earth" / OIAS Earth admin rebuild. Reproduces the observed REST
contract (snake_case list responses, RAW-token auth header) standardised on the
REST layer.

## Stack

- Node + Express + TypeScript (strict)
- **Dual DB backend** — raw SQL, no ORM:
  - **embedded PGlite** (`@electric-sql/pglite`) when `DATABASE_URL` is **unset**
    (zero-install local dev; persisted to `./.pglite-data`), OR
  - **`pg`** (node-postgres) when `DATABASE_URL` **is** set (real Postgres).
- PostgreSQL-compatible raw SQL migrations in `../db/migrations` (run on either backend)
- `multer` for multipart `upsert` file uploads (logos/images -> `./uploads`)
- `jsonwebtoken` + `bcryptjs` for auth

## Layout

```
app/
  shared/types.ts            shared entity + API types (camelCase domain, *Row snake_case REST)
  db/migrations/
    001_init.sql             all admin tables + lookups + join tables + indexes + triggers
    002_seed.sql             master_roles, admin user, demo sponsors/employees/forests/reports/jobs
  server/
    .env.example             DATABASE_URL, JWT_SECRET, PORT, CORS_ORIGIN
    package.json
    tsconfig.json
    scripts/migrate.js       raw-SQL migration runner (applies *.sql in order)
    scripts/hash.js          bcrypt hash generator (for re-seeding the admin password)
    src/
      config.ts              env loader (DATABASE_URL optional -> PGlite fallback)
      db.ts                  DUAL backend adapter (pg Pool OR embedded PGlite) — query()/getClient()
      errors.ts              HttpError + {error:true,message} helpers
      auth/middleware.ts     requireAuth — RAW token, no Bearer (legacy contract)
      routes/
        auth.ts              POST /api/v1/auth/login
        lists.ts             POST /<entity>/list + master-plantspecies/search
        crud.ts              POST /<entity>/upsert + /<entity>/delete (multipart+json) + user/forest specials
        helpers.ts           pagination parsing + count helper
      index.ts               app wiring + /uploads static + central error handler
    uploads/                 (gitignored) files saved by multipart upsert
    .pglite-data/            (gitignored) embedded PGlite data dir
```

## Run it — NO Postgres install required (embedded PGlite, default)

Prerequisites: **Node 18+ only.** No Postgres needed. Leave `DATABASE_URL`
unset and the server uses embedded PGlite (PG15 in-process), persisted to
`./.pglite-data`.

```bash
cd app/server
npm install            # pulls @electric-sql/pglite, multer, pg, etc.

npm run migrate        # applies 001_init.sql + 002_seed.sql to ./.pglite-data
                       # (auto-detects backend; idempotent — safe to re-run)

npm run dev            # ts-node-dev hot reload — runs `migrate` first (predev)
                       # -> [server] ... listening on :4000 (db backend: pglite)
```

`npm run dev` and `npm start` auto-run `migrate` first (`predev` / `prestart`
hooks), so a fresh checkout works with a single command after `npm install`.

Quick check:

```bash
curl localhost:4000/health        # {"ok":true,...,"db":"pglite"}
```

To reset the embedded DB, delete `./.pglite-data` and re-run `npm run migrate`.

### Run against a real Postgres instead (optional)

Set `DATABASE_URL` (in `.env` or the environment) and everything switches to the
`pg` path automatically — same migrations, same routes:

```bash
cp .env.example .env          # then UNCOMMENT + edit DATABASE_URL
createdb communitree
DATABASE_URL=postgres://postgres:postgres@localhost:5432/communitree npm run migrate
npm run dev                   # -> ... (db backend: postgres)
```

### Build / typecheck

```bash
npm run build && npm start    # production build (prestart runs migrate)
npm run typecheck             # tsc --noEmit (strict)
```

### Demo credentials (from `002_seed.sql`)

| username             | password         | role       |
|----------------------|------------------|------------|
| `communitree_admin`  | `communitree123` | SuperAdmin |
| `anvar_communitree_admin` | `communitree123` | Admin |

Re-generate the seed password hash with `node scripts/hash.js "<password>"`.

## Auth contract (reproduced from the original)

- `POST /api/v1/auth/login` `{username,password}` -> `{token, user}`.
- All other endpoints require the **RAW** JWT in the `Authorization` header —
  **no `Bearer ` prefix** (sending `Bearer <token>` yields `500 jwt malformed`,
  matching the legacy behaviour).
- Missing header -> `403 {error:true,message:"Missing Authorisation Token!"}`.
- Bad/expired token -> `500 {error:true,message:"jwt malformed"}` (or the
  relevant jsonwebtoken message). This 500-on-bad-token is a faithful legacy
  quirk; see `NOTES.md` for the proposed 401 fix.

Client stores `token`, `role`, `profileId`, and `user` in localStorage (as the
original did) and sends `token` raw on every REST call.

## Endpoints

### Public

| Method | Path                  | Body                  | Response          |
|--------|-----------------------|-----------------------|-------------------|
| POST   | `/api/v1/auth/login`  | `{username,password}` | `{token, user}`   |
| GET    | `/health`             | —                     | `{ok:true,...}`   |

### Lists / search (auth) — `POST`, body `{page?,limit?,search?}`

| Path                                  | Response shape                                  |
|---------------------------------------|-------------------------------------------------|
| `/api/v1/users/list`                  | `{data,pagination}` rows JOIN role (mixed camel/snake exactly as observed) |
| `/api/v1/roles/list`                  | `{data,pagination}` rows `{id,name}`            |
| `/api/v1/sponsors/list`               | `{data,pagination}`                             |
| `/api/v1/employee/list`               | `{data,total,page,limit}` (flat — legacy quirk) |
| `/api/v1/forest/list`                 | `{data,pagination}` rows incl. nested `sponsors[]` + `created_by`/`updated_by` `{id,first_name}` |
| `/api/v1/reports/list`                | `{data,pagination,filter_limit}` rows incl. nested `Forest`/`CreatedBy`/`UpdatedBy` |
| `/api/v1/jobs/list`                   | `{data,pagination}`                             |
| `/api/v1/master-plantspecies/search`  | `{data,pagination}` species catalog            |

Pagination is real `LIMIT/OFFSET`; `search` is a server-side `ILIKE` on the
entity's name column (`forest_name`, `sponsor_name`, `name`, `species_name`/
`common_name`, joined `forest_name` for reports, `job_id`/`job_type`/`status`
for jobs).

### Writes — UPSERT / DELETE (auth) — CONFIRMED contracts

Both accept **`multipart/form-data`** (text fields + optional file fields) **and**
`application/json`. Aligned to `spec/write_contracts.md` (live-verified 2026-06-16).

| Method | Path                       | Body                                  | Response                              |
|--------|----------------------------|---------------------------------------|---------------------------------------|
| POST   | `/api/v1/<entity>/upsert`  | columns; **no `id` => INSERT, `id` => UPDATE** | `{data:<full record>}`        |
| POST   | `/api/v1/<entity>/delete`  | `{id, <entity>_id}` (both keys)       | `{message:"<Entity> deleted successfully"}` |

- `<entity>` segments: `sponsor`(`sponsors`), `employee`(`employees`),
  `report`(`reports`), `forest`(`forests`), `users`(`user`). Unknown -> `400`.
- **Delete is a HARD delete** (live UI: "cannot be undone"; detaches join rows
  for forests/sponsors/employees/reports).
- File fields (e.g. `sponsor_logo`, `sponsor_forest_logo`, `profile_image`) are
  saved to `./uploads` and the stored column holds the served URL
  (`/uploads/<file>`). `jsonb` columns (report_data, skip, forest jsonb blocks)
  are JSON-stringified before binding.

Users (`/users/upsert`, `/users/delete`) span `user_profiles` + `user_roles`:
upsert creates/updates the profile then upserts the active role row; delete
removes role rows then the profile. Upsert body (camelCase):
`{id?,firstName,lastName,username,email,mobile,password?,roleId,...}`.

Forest (`/forest/upsert`) accepts the 2-step wizard payload — Basic Info + Grid
Config columns plus `sponsorIds[]`, `employeeIds[]`, and `boxes[]` (each box:
`{rowPosition,columnPosition,prefix,start,startDigits,species[]}`). It fans out
into `forests` + `forest_boxes` + `forest_trees` (capacity = `treeRow*treeColumn`
per box; `tree_unique_id` = `prefix`+running number from `start`) +
`forest_clusters` + `forest_sponsors`/`forests_employees`, and inserts a `jobs`
row (`job_type:'forest_upsert_v1'`, `status:'completed'`) to mirror the live
async job. Runs **synchronously** here (prod runs it async — see code comment).

All success responses return `{data:{...}}` (upsert) or `{message}` (delete);
errors return `{error:true,message}`.

## Notes & deviations

See `NOTES.md` for documented deviations and proposed improvements (REST-vs-
GraphQL writes, the employee/list pagination inconsistency, the 500-on-bad-token
quirk, transactional user creation, and out-of-scope domains).

Open questions from the spec are flagged inline as `TODO(openQuestions)`
comments in `shared/types.ts`, `routes/lists.ts`, and `routes/crud.ts`.
