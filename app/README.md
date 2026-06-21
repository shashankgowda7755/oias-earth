# OIAS Earth Admin (Rebuild)

A faithful, cleanly-restructured rebuild of the **"OIAS Earth" /
OIAS Earth** admin panel. The original was a MUI + GraphQL admin; this rebuild
reproduces its look and documented behaviour on a modern, self-contained stack
and standardises every admin read/write on a single REST layer.

Built from the spec (`spec/communitree_admin_spec.json`, `data_model_full.json`,
`rest_list_shapes.json`, `screens/*.png`) — **not** copy-pasted from the
original. Where a flow or structure looked like a UX/architecture problem, the
faithful version is implemented and the improvement is proposed in a code
comment / `NOTES.md` / the "Faithful vs Improved" section below.

---

## What was built

A single-page admin with a login screen and a tabbed dashboard. The dashboard
has six sections, each a server-paginated table with create/edit/delete where
the original allowed it:

| Section | What it does |
|---|---|
| **Users** | List users (avatar, name, username, role chip, email, mobile). Add/Edit (with role select + password) / soft-delete. |
| **Sponsors** | List sponsors (logo, name, industry, HQ, website, year, active). Add/Edit/soft-delete. |
| **Employees** | List employees (avatar, name, designation, contact, email, active). Add/Edit/soft-delete. |
| **Forests** | List forests (full column set incl. sponsors, geo, grids, totals). Add via a 6-step wizard; View; soft-delete. |
| **Reports** | List quarterly reports (year/quarter, joined forest, type/mode, dates, created/updated-by, active). Add/Edit/soft-delete + filter popover driven by `filter_limit`. |
| **Jobs** | Read-only async-job monitor (id, type, status badge, JSON description/payload/result). No writes. |

Cross-cutting: shared `DataTable` (server pagination + debounced search +
loading/empty/error states), shared `FormDialog` / `ConfirmDialog`, shared
outlined floating-label field components, a toast system, JWT auth with
localStorage session, WAI-ARIA tablist navigation, and a raw-SQL Postgres schema
+ seed.

---

## Stack

**Client** — Vite + React + TypeScript (strict) + TailwindCSS + react-router-dom
+ axios + @tanstack/react-query.
**Server** — Node + Express + TypeScript + `pg` (node-postgres), `bcryptjs`,
`jsonwebtoken`.
**DB** — PostgreSQL with raw SQL migrations (`db/migrations/*.sql`).

The original used **MUI**; the rebuild reproduces its look (elevations, outlined
inputs with floating labels, the dark-gray tab bar with a green active underline)
with Tailwind tokens defined in `client/tailwind.config.ts`. Brand: primary green
`#17970E`, nav `#4d4d4d`, app bg `#f5f5f5`, danger `#d32f2f`, font Noto Sans.

---

## How the rebuild maps to the original

| Original | Rebuild |
|---|---|
| GraphQL (PostGraphile) reads/writes with `Bearer <token>` | A REST layer (`POST /<entity>/list`, REST CRUD) with the **raw JWT** in `Authorization` (no `Bearer`). The shell speaks only REST; the auth-header divergence is documented in `client/src/lib/api.ts` and `CONTRACTS.md`. *(Original GraphQL vs REST write path = spec openQuestions[3].)* |
| Separate auth host (`dev-auth.oiasearth.com`) | `POST /api/v1/auth/login` on the same Express server, signing a JWT with the same secret the REST middleware verifies. Self-contained. |
| 52-table PostGraphile schema | `db/migrations/001_init.sql` recreates the admin-relevant tables (+ lookups) faithfully as a superset; out-of-scope domains (sapling/whatsapp/donor/gift/nudge — openQuestions[9]) are stubbed/marked. snake_case columns match the live REST shapes 1:1. |
| Mixed pagination (`employee/list` flat vs `{pagination}`) | `listEntity()` normalises both into one `Paginated<T>` (openQuestions[7]). |
| MUI DataGrid / Dialog / TextField | Tailwind `DataTable` / `FormDialog` / field components with the same affordances and a11y. |
| Forest create = multipart `forest/upsert` async job | Faithful 6-step wizard UI; writes go through the shell's JSON `createEntity('forest', …)`. Multipart/upload path proposed (see below). |

---

## Run instructions

Prereqs: Node 18+ (tested on 24), a running PostgreSQL.

### 1. Database — create + migrate + seed

```bash
# create the database (default name: communitree)
createdb communitree
# or: psql -c "CREATE DATABASE communitree;"

cd app/server
cp .env.example .env          # adjust DATABASE_URL / JWT_SECRET if needed
npm install
npm run migrate               # applies db/migrations/*.sql in order
                              # (001_init schema, then 002_seed demo data — idempotent)
```

`DATABASE_URL` defaults to
`postgres://postgres:postgres@localhost:5432/communitree`. Override in
`server/.env`.

### 2. Server (API on :4000)

```bash
cd app/server
npm run dev                   # ts-node-dev, http://localhost:4000
# or: npm run build && npm start
```

### 3. Client (Vite dev server on :5173)

```bash
cd app/client
npm install
npm run dev                   # http://localhost:5173
```

The Vite dev server proxies `/api/v1` (and `/graphql`) to the Express origin
(`SERVER_ORIGIN`, default `http://localhost:4000`).

### 4. Default login (from `db/migrations/002_seed.sql`)

| Username | Password | Role |
|---|---|---|
| `communitree_admin` | `communitree123` | SuperAdmin |
| `anvar_communitree_admin` | `communitree123` | Admin |

> These are **local-dev defaults only** (bcrypt hash committed in the seed).
> Change them and `JWT_SECRET` for anything beyond local development.

### Verify

```bash
# client
cd app/client && npm run typecheck && npm run build
# server
cd app/server && npm run typecheck && npm run build
```

Both typecheck (`tsc --noEmit`) and build cleanly — see `STATUS.md`.

---

## Faithful vs Improved

The rebuild implements the faithful behaviour; these are the documented
improvement proposals the module authors raised (kept as proposals, not silently
applied). Full detail lives in each section's `NOTES.md` and in code comments.

### Shared-component gaps resolved during integration
- **`EntityName` widened** to include the singular CRUD segments (`'sponsor'`,
  `'report'`). The backend list routes are plural but its generic-CRUD whitelist
  keys writes off the singular segment; the union now carries both so module
  code needs no `as EntityName` cast. (`client/src/types/entities.ts`,
  `CONTRACTS.md`.)
- **Users edit/delete key corrected in the contract** to the **profile id**
  (`UserRow.id`), matching the rebuild backend (`PATCH/DELETE /users/:id` take
  the profile id and update the linked `user_roles` row internally). The old
  `CONTRACTS.md`/type comment said to use `user_role_id`; corrected. The Users
  module already keyed on `row.id`, so no behaviour change.
- **Species typeahead field-casing fixed server-side.** `master-plantspecies/search`
  now aliases columns to the camelCase keys the client's `SpeciesOption` reads
  (`speciesName`/`commonName`/`speciesCategory`), mirroring the `users/list`
  aliasing convention — so wizard species labels render correctly.

### Proposed improvements (not yet applied — would change shared API)
- **Shared boolean field.** Sponsors/Employees/Forests/Reports each need an
  `is_active` toggle, but `@/components/fields` ships only text/password/
  textarea/select. Each module shipped a local `role="switch"` control.
  *Proposal:* promote a shared `SwitchField`/`CheckboxField`.
- **Shared date field.** Reports added a local `DateField` (the shared
  `TextField` type union has no `'date'`). *Proposal:* add `'date'` to
  `TextFieldProps['type']` or ship a shared `DateField`.
- **`onBlur` on fields.** Field components surface only the next string value,
  so modules approximate "touched" via first-change + submit. *Proposal:* add
  optional `onBlur?: () => void` to `BaseFieldProps`.
- **Destructive text-button variant / `tone` prop.** Row delete actions override
  the shared `Button variant="text"` with danger classes. *Proposal:* a
  `variant="danger-text"` (or `tone`) would be cleaner.
- **Read-only dialog mode.** Jobs' detail dialog reuses `FormDialog`'s `footer`
  prop to render a single Close button. *Proposal:* a `readOnly`/`hideSubmit`
  prop if more read-only detail dialogs appear.
- **Tokenised info/warning colors.** Job status badges use stock Tailwind
  `blue-*`/`amber-*` for running/pending. *Proposal:* add `info`/`warning`
  tokens to the theme.
- **Forest write path.** The live forest create is multipart `forest/upsert`
  run as an async `forest_upsert_v1` job that also builds boxes/trees. The shell
  posts JSON via `createEntity('forest', …)`. *Proposal:* add a multipart
  `forestUpsert(formData)` helper + `FileField`, or have the server `POST
  /forest` enqueue the same job. (openQuestions[3].)
- **Forest wizard length.** Six steps (3–6 inferred) is heavy; once fields are
  confirmed, consider collapsing Environment+Statistics and a "Save as draft",
  since the plantation pipeline recomputes most stats anyway. (openQuestions[2].)
- **Map picker.** `LocationPicker` is a keyless placeholder + lat/long inputs;
  drop in the Google Maps SDK behind a `VITE_*` key for a real pin.
- **Delete copy.** Confirm dialogs say "cannot be undone," but the backend
  soft-deletes (`is_active=false`). Switch to "deactivate/archive" once
  openQuestions[4] is resolved; consider an inline Active toggle for reversible
  flows.
- **Reports column density.** ~13 columns overflow on small screens (faithful,
  horizontal scroll). *Proposal:* a column-visibility / density toggle.

### Outstanding open questions (carried as TODOs, not invented)

From `spec/communitree_admin_spec.json openQuestions[]`:

0. Exact list request body — search/filter/sort field names (only `{page,limit}`
   confirmed; `search`/`filters` inferred).
1. Login success body shape (token confirmed; `user` object fields inferred).
2. Forest wizard steps 3–6 exact fields + required/optional.
3. Whether writes go via GraphQL / REST / both (shell speaks REST only).
4. Delete UX + soft vs hard delete (`is_active` ⇒ soft; backend soft-deletes).
5. Filter popover contents per table (`reports.filter_limit` read defensively).
6. Reports `report_data` JSON schema; Job-queue purpose / status enum.
7. Pagination inconsistency (employee flat vs `{pagination}`) — **handled**.
8. Whether non-SuperAdmin roles change visible tabs/columns (role available via
   `useAuth().role`; gating left as a TODO, not invented).
9. Sapling / whatsapp / donor / gift / nudge domains — **out of scope**.

---

## Project layout

```
app/
  client/                 Vite + React + TS frontend
    src/
      components/         shared UI (DataTable, FormDialog, fields, …) + barrel
      lib/api.ts          axios instance + listEntity/createEntity/… helpers
      types/entities.ts   row + EntityName types (match live REST shapes)
      auth/               AuthContext + ProtectedRoute
      pages/              Login, Dashboard, and one folder per section
    CONTRACTS.md          authoritative shared-API contract for section modules
  server/                 Express + TS API
    src/routes/           auth.ts, lists.ts (POST /<entity>/list), crud.ts
    scripts/migrate.js    raw-SQL migration runner
  db/migrations/          001_init.sql (schema), 002_seed.sql (demo data)
  shared/types.ts         types shared by client/server auth contract
```

See `client/CONTRACTS.md` for the shared component/API signatures and
`server/NOTES.md` for backend decisions.
