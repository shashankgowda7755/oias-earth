## Why

The admin app had no record of **who did what, when**. Logins (success and
failure), forest/report mutations, CRUD upsert/delete, and report downloads all
happened silently — there was no way to investigate a bad change, a suspicious
login, or confirm a sponsor actually pulled a report. The existing **Jobs**
queue tracks async `forest_upsert_v1` tasks (work the system is doing), not a
human-readable trail of operator actions (who triggered them). Those are
different concerns and conflating them helped no one.

We need a tamper-evident, append-only activity trail that captures every login
attempt and every data mutation, segregated by category, read-only in the UI —
without ever letting a logging failure break the request it is observing.

## What Changes

- Add an **`audit_log` table** (migration `019_audit_log.sql`): append-only,
  `ts DESC` / `actor_name` / `entity` indexed, idempotent on cold start.
- Add **`recordAudit()` + `clientIp()`** (`app/server/src/lib/audit.ts`):
  fire-and-forget best-effort insert (`.catch(() => undefined)`) so a logging
  failure NEVER propagates into the request path.
- Add **`auditWrites` middleware**, mounted after `requireAuth` at
  `app.use('/api/v1', auditWrites)`, that logs every authed **mutation**
  (POST/PATCH/DELETE that is not a `/list` or `/search` read), recording on
  response `finish` so the real status code is captured. Action is derived from
  the path (`forest.upsert`, `forest.boundary`, `report.report-data`, entity
  upsert/delete, etc.) with UUID segments stripped; `targetId` is the UUID in
  the path or the body `id`.
- Capture **login events** in the auth router (which runs before the auth gate):
  `auth.login` on success, `auth.login_failed` (with `reason`) on missing user
  or bad password.
- Add **`POST /api/v1/audit/list`** (`app/server/src/routes/lists.ts`): auth-gated
  (mounted after `requireAuth`), newest-first, full-text search over
  action/actor/entity/target/ip, with an optional `category` filter driven by
  `AUDIT_CATEGORY_SQL` (`login | forest | report | download | send`).
- Add a **public** `POST /public/forest/:id/report-download` endpoint
  (`app/server/src/routes/public.ts`) so the public report viewer can log a
  client-side PDF download (`action report.download`, `actor` = supplied
  username or `anonymous`); returns 204, validates the id is a UUID.
- Add the client **Logs view** (`app/client/src/pages/Logs.tsx`): segregated
  category tabs (All / Logins / Forest / Reports / Downloads / Sends),
  newest-first, read-only, color-coded action + status, debounced search.

Status: already implemented and deployed. This change is the retroactive spec of
record.

## Capabilities

### New Capabilities
- `audit-log`: the system must record every login attempt and every data
  mutation to an append-only trail, segregated by category and surfaced
  read-only in the admin UI, without a logging failure ever breaking the
  observed request.

### Modified Capabilities
<!-- None — no existing spec's requirements change. -->

## Impact

- Database: new `app/db/migrations/019_audit_log.sql` (`audit_log` table + 3
  indexes). Append-only; no existing table altered.
- Server: `app/server/src/lib/audit.ts` (new — `recordAudit`, `clientIp`,
  `auditWrites`), `app/server/src/index.ts` (mount `auditWrites` after
  `requireAuth`), `app/server/src/routes/auth.ts` (login / login_failed events),
  `app/server/src/routes/lists.ts` (`AUDIT_CATEGORY_SQL` + `/audit/list`),
  `app/server/src/routes/public.ts` (public `report-download` logger).
- Client: `app/client/src/pages/Logs.tsx` (new read-only view),
  `app/client/src/pages/report/ReportForestQuarterly.tsx` (POSTs
  `report-download` on PDF export).
- Runtime: one best-effort INSERT per mutation / login / download, fired on
  response `finish`, errors swallowed — negligible and never request-blocking.
- Distinct from the Jobs queue (async `forest_upsert_v1` tasks); no overlap.
- No dependency changes.
