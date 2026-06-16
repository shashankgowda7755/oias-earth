# Build / Integration Status

_Last updated by the smoke-test agent (2026-06-16) — live PGlite run added._

## Smoke test — LIVE on embedded PGlite (no external Postgres) ✅

Full end-to-end HTTP smoke test passed against embedded PGlite
(`@electric-sql/pglite`, `DATABASE_URL` unset). Detailed PASS/FAIL table +
command output: **`app/SMOKE_RESULTS.md`**. Summary:

| Phase | Result |
|---|---|
| `npm install` (server + client) | **PASS** |
| Migrate fresh + idempotent re-run (PGlite) | **PASS** |
| Server boot (`db backend: pglite`) + `/health` | **PASS** |
| Login (`communitree_admin/communitree123`, raw token) + auth 403/500/200 | **PASS** |
| All 7 lists (users/roles/sponsors/employee/forest/reports/jobs) — shapes confirmed | **PASS** |
| Sponsor INSERT → UPDATE → DELETE lifecycle | **PASS** |
| Multipart upload (`sponsor_logo` → `/uploads`, served back 200) | **PASS** |
| Forest wizard upsert (2 boxes → 8 trees + `forest_upsert_v1` job `completed`) → delete | **PASS** |
| Client `tsc -b` + `vite build` (189 modules) | **PASS** |
| Server `tsc --noEmit` | **PASS** |

**No source fixes were required** — the reconciled code ran clean on first boot.
Run path: `cd app/server && npm install && npm run dev` (predev auto-migrates
PGlite). No Postgres install needed.

## Verification (whole monorepo, prior static pass)

| Check | Command | Result |
|---|---|---|
| Client typecheck | `cd app/client && npx tsc --noEmit` | **PASS** (exit 0) |
| Client build | `cd app/client && npm run build` (`tsc -b && vite build`) | **PASS** — 189 modules, dist emitted (JS 367.25 kB / gzip 112.87 kB, CSS 27.35 kB) |
| Server typecheck | `cd app/server && npx tsc --noEmit` | **PASS** (exit 0) |
| Server build | `cd app/server && npm run build` (`tsc -p tsconfig.json`) | **PASS** (exit 0) |

## Section completion

| Section | Status | Notes / known gaps |
|---|---|---|
| **Users** | ✅ Complete | List + Add/Edit/soft-delete. Edit/delete key on profile `id` (matches backend; contract corrected). No per-column filter (none in spec — openQuestions[5]). |
| **Sponsors** | ✅ Complete | List + Add/Edit/soft-delete. Local `role="switch"` for `is_active`. Write segment `sponsor` (now a valid `EntityName`; cast removed). |
| **Employees** | ✅ Complete | List + Add/Edit/soft-delete. Local `ToggleField` for Active. `FilterButton` rendered **disabled** (filter set undefined — openQuestions[5]). No photo upload (URL field only). |
| **Forests** | ✅ Complete (list + create wizard) | List + 6-step Add wizard + View + soft-delete. **No Edit row action yet** (faithful edit = prefilled wizard, deferred pending openQuestions[2]). Steps 1–2 confirmed from screenshot; steps 3–6 inferred (tagged TODO openQuestions[2]). Map is a keyless placeholder; images collected as URLs (no multipart upload — openQuestions[3]). |
| **Reports** | ✅ Complete | List + Add/Edit/soft-delete + filter popover (options read from `filter_limit`). Local `DateField`. Writes via dedicated `reportApi` helpers on the singular `/report` segment. ~13 columns → horizontal scroll (faithful). `report_data` is a validated free-form JSON textarea (schema undocumented — openQuestions[6]). |
| **Jobs** | ✅ Complete | Read-only monitor (no Add/Edit/Delete). Status badge + JSON viewers + manual Refresh. Auto-refresh proposed behind a TODO (openQuestions[6]). |

## Integration changes applied

- `client/src/types/entities.ts` — widened `EntityName` to include singular CRUD
  segments `'sponsor'` and `'report'`; rewrote the `UserRow.user_role_id` comment
  to document that edit/delete key on the profile `id`.
- `client/src/pages/Sponsors/useSponsors.ts` — removed the `'sponsor' as EntityName`
  cast (now a valid literal).
- `client/CONTRACTS.md` — updated the `EntityName` block, the `user_role_id`
  comment, and the §6 Users line to match the backend (profile id for edit/delete).
- `server/src/routes/lists.ts` — `master-plantspecies/search` now aliases columns
  to the camelCase keys the client `SpeciesOption` reads (species labels render).

All six `pages/<Section>/index.tsx` default-export a no-prop component; `Dashboard.tsx`
imports and renders all six via `TabNav`; the router (`App.tsx`) and protected
route are wired. No `SectionStub` import remains in any section; no `as EntityName`
casts remain in `pages/` or `lib/`.

## Known non-blocking items / TODOs (top)

1. **Forests Edit action** — not implemented; wizard is structured to accept
   `initialValues` + edit mode once steps 3–6 are confirmed (openQuestions[2]).
2. **Forest write path** — shell posts JSON; live system is multipart
   `forest/upsert` async job. Needs a multipart helper + `FileField`, or a
   server-side enqueue, for byte-identical behaviour (openQuestions[3]).
3. **Shared field gaps** — promote a `SwitchField`/`CheckboxField` and a
   `DateField` (each currently re-implemented locally in 2–4 modules).
4. **Soft-delete confirm copy** — dialogs say "cannot be undone" but the backend
   soft-deletes; reword once openQuestions[4] is resolved.
5. **Role-based tab/column gating** — `useAuth().role` is available but gating is
   left as a TODO, not invented (openQuestions[8]).
6. **`pages/SectionStub.tsx`** — now dead code (no importers); safe to delete,
   left in place as a reference scaffold.
7. **Runtime smoke test** — recommended next: start Postgres + `npm run migrate`
   + both dev servers, log in as `communitree_admin / communitree123`, and walk
   each tab to confirm list/CRUD against the live API.
