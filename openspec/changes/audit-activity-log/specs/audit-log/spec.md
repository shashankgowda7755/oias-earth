## ADDED Requirements

### Requirement: Every login attempt and data mutation is recorded

The system SHALL append a record to an `audit_log` table for every login
attempt (success and failure) and every authenticated data mutation
(POST/PATCH/DELETE that is not a `/list` or `/search` read). Each record MUST
capture the actor (id, name, role where known), the derived action, the entity
and target id, the HTTP method, path, resulting status, and the client IP. The
audit insert MUST be best-effort: a logging failure MUST NOT throw into or
otherwise break the request being observed. The table MUST be append-only and
its migration idempotent so it re-applies safely on each cold start.

#### Scenario: A data mutation is logged on response finish

- **WHEN** an authenticated user issues a mutating request (e.g. `POST
  /api/v1/forest/upsert`) that is not a `/list` or `/search`
- **THEN** an `audit_log` row is written on response `finish` with the real
  status code, an action derived from the path (UUID segments stripped, e.g.
  `forest.upsert`), the resolved `targetId` (path UUID or body `id`), and the
  actor taken from `req.auth`

#### Scenario: Read requests are not logged

- **WHEN** the request is a `GET`, or a `POST` to a path ending in `/list` or
  `/search`
- **THEN** no `audit_log` row is written for that request

#### Scenario: A logging failure never breaks the request

- **WHEN** the `audit_log` insert fails (database unavailable, malformed body,
  etc.)
- **THEN** the error is swallowed and the original request completes normally

### Requirement: Login successes and failures are captured

The authentication path SHALL record `auth.login` (status 200) on a successful
login and `auth.login_failed` (status 401) on a failed one, with the client IP.
Login logging MUST occur in the auth router, which runs before the
authentication gate, so unauthenticated failures are still captured.

#### Scenario: Successful login is recorded

- **WHEN** a user authenticates with valid credentials
- **THEN** an `auth.login` record is written with the actor's profile id,
  username, role, status 200, and client IP

#### Scenario: Failed login is recorded without enumerating users

- **WHEN** a login fails because the user does not exist or the password is wrong
- **THEN** an `auth.login_failed` record is written (status 401) with a `meta`
  reason of `no_user` or `bad_password`, while the user still receives the same
  generic error

### Requirement: The activity log is queryable and segregated by category

The system SHALL expose an authenticated `POST /api/v1/audit/list` endpoint that
returns audit records newest-first with pagination and a full-text search over
action, actor, entity, target, and IP. It MUST accept an optional `category`
filter that segregates the trail into `login`, `forest`, `report`, `download`,
and `send` views. The endpoint MUST be auth-gated (mounted after `requireAuth`).

#### Scenario: Listing returns newest-first records

- **WHEN** an authenticated admin calls `POST /api/v1/audit/list`
- **THEN** audit records are returned ordered by `ts DESC`, paginated, with
  camelCased fields (`actorName`, `targetId`)

#### Scenario: Category filter narrows the trail

- **WHEN** the request includes `category: "login"` (or `forest` / `report` /
  `download` / `send`)
- **THEN** only records matching that category's SQL predicate are returned (e.g.
  `login` → `action ILIKE 'auth.%'`; `report` excludes send/download actions)

#### Scenario: Unauthenticated access is rejected

- **WHEN** the endpoint is called without a valid raw token
- **THEN** the request is rejected by `requireAuth` and no records are returned

### Requirement: Public report downloads are logged

The public report viewer SHALL be able to log a client-side PDF download via a
public `POST /public/forest/:id/report-download` endpoint. The endpoint MUST
validate that `:id` is a UUID, record `action report.download` against
`entity report` with the forest id as target, attribute the actor to a
supplied username (admins send theirs) or `anonymous` otherwise, and respond
204.

#### Scenario: Admin downloads a report

- **WHEN** an admin exports a forest report PDF and the client posts
  `report-download` with their username as `actor`
- **THEN** a `report.download` record is written with that username, the forest
  id as `targetId`, the year/quarter in `meta`, and a 204 response is returned

#### Scenario: Anonymous visitor downloads a report

- **WHEN** a public visitor exports the report without supplying an `actor`
- **THEN** the download is recorded with `actorName` `anonymous`

#### Scenario: Invalid forest id is a no-op

- **WHEN** `:id` is not a valid UUID
- **THEN** the endpoint returns 204 without writing an audit record

### Requirement: The Logs view surfaces the trail read-only

The admin client SHALL provide a Logs view that reads `POST /api/v1/audit/list`
and presents the trail newest-first and read-only, with category tabs (All,
Logins, Forest, Reports, Downloads, Sends) and a debounced search. This view
MUST remain distinct from the Jobs queue (async `forest_upsert_v1` tasks).

#### Scenario: Switching category tabs refilters the list

- **WHEN** a user selects a category tab (e.g. Logins or Downloads)
- **THEN** the view re-queries `/audit/list` with the matching `category` and
  shows only those records, still newest-first

#### Scenario: The view never mutates audit data

- **WHEN** a user interacts with the Logs view
- **THEN** the records are read-only — there is no create, edit, or delete
  affordance
