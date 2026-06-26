> Status: implemented and deployed (live). Checked items reflect completed work;
> recorded here as the spec of record.

## 1. Storage

- [x] 1.1 Add `app/db/migrations/019_audit_log.sql` creating `audit_log` (`id` bigserial PK, `ts` timestamptz default `now()`, `actor_id`, `actor_name`, `role`, `action` NOT NULL, `entity`, `target_id`, `method`, `path`, `status`, `ip`, `meta` jsonb)
- [x] 1.2 Indexes: `audit_log_ts_idx (ts DESC)`, `audit_log_actor_idx (actor_name)`, `audit_log_entity_idx (entity)`
- [x] 1.3 Migration is idempotent (`CREATE TABLE/INDEX IF NOT EXISTS`) so it re-runs safely on each cold start

## 2. Recorder + IP helper

- [x] 2.1 Add `app/server/src/lib/audit.ts` exporting `recordAudit(e: AuditEntry)` — a parameterised `INSERT INTO audit_log`
- [x] 2.2 Make the insert fire-and-forget best-effort (`.catch(() => undefined)`) so a logging failure NEVER throws into the request path
- [x] 2.3 Add `clientIp(req)` resolving `x-forwarded-for` (first hop), then `req.ip`, then `req.socket.remoteAddress`

## 3. Mutation middleware

- [x] 3.1 Add `auditWrites(req, res, next)` that logs only mutations (POST/PATCH/DELETE) and skips `/list` / `/search` reads
- [x] 3.2 Record on `res.on('finish')` so the real `res.statusCode` is captured
- [x] 3.3 Derive `action` from the path (entity + non-UUID verb segments, e.g. `forest.upsert`, `forest.boundary`); strip UUID segments
- [x] 3.4 Resolve `targetId` as the UUID in the path, else the body `id`; populate actor from `req.auth` (profileId / username / role)
- [x] 3.5 Wrap the body in try/catch so a malformed request never breaks logging
- [x] 3.6 Mount in `app/server/src/index.ts` as `app.use('/api/v1', auditWrites)` AFTER `requireAuth`

## 4. Login events

- [x] 4.1 `routes/auth.ts`: record `auth.login` (status 200, actor/role) on successful login
- [x] 4.2 Record `auth.login_failed` (status 401) on missing user (`reason: no_user`) and bad password (`reason: bad_password`)
- [x] 4.3 Login logging lives in the auth router (runs before the auth gate) and captures `clientIp`

## 5. List endpoint

- [x] 5.1 `routes/lists.ts`: add `POST /audit/list` (auth-gated — listRouter mounts after `requireAuth`)
- [x] 5.2 Newest-first (`ORDER BY ts DESC`), paginated, full-text `ILIKE` search over action / actor_name / entity / target_id / ip
- [x] 5.3 Add `AUDIT_CATEGORY_SQL` optional `category` filter: `login` (`action ILIKE 'auth.%'`), `forest` (`entity = 'forest'`), `download` (`%download%`), `send` (`%send%`), `report` (`entity = 'report'` minus send/download)
- [x] 5.4 Return camelCased rows (`actorName`, `targetId`) + pagination envelope

## 6. Public download logger

- [x] 6.1 `routes/public.ts`: add public `POST /public/forest/:id/report-download`
- [x] 6.2 Validate `:id` is a UUID (else 204 no-op); log `action report.download`, `entity report`, `targetId = id`
- [x] 6.3 `actorName` = supplied `actor` (admins send their username) else `anonymous`; capture year/quarter in `meta`; respond 204
- [x] 6.4 Client `ReportForestQuarterly.tsx` POSTs `report-download` on PDF export

## 7. Client Logs view

- [x] 7.1 Add `app/client/src/pages/Logs.tsx` calling `POST /audit/list` (limit 200, newest first)
- [x] 7.2 Segregated category tabs: All / Logins / Forest / Reports / Downloads / Sends
- [x] 7.3 Read-only table (When / Actor / Action / Entity / Target / Status / IP), color-coded action + status, debounced search
- [x] 7.4 Keep distinct from the Jobs queue (async `forest_upsert_v1` tasks)

## 8. Build, deploy, verify

- [x] 8.1 `tsc --noEmit` (client) and `tsc -p tsconfig.json --noEmit` (server) pass
- [x] 8.2 `npm run build` succeeds
- [x] 8.3 Deploy to Vercel production (`vercel --prod --yes`); migration runs on cold start
- [x] 8.4 Verify live: a login and a mutation both appear in `/audit/list`; a public report download logs `report.download`
