# Project — Be The Tree Hugger / COMMUNITREE (communitree-rebuild)

## Mission
A tree-planting **living-proof + dMRV** platform. Competitors sell a *birth
certificate* (geotag + cert at planting). We maintain a **life record**:
longitudinal, independently verifiable proof a tree is still alive — every visit
dated, measured, and tamper-evident. Carbon is a credibility layer, never the
lead product.

## Non-negotiable principles (enforce in every change)
- **Integrity is the brand.** Never present fabricated or simulated data as a
  verified record. Demo/seed data MUST be flagged (`forests.is_demo`) and shown
  with a "demonstration / simulated" banner. Publish dead trees openly.
- **Clean-room.** Do NOT fork the licensed incumbent. Look for inspiration, build
  original. Do not reuse the incumbent's Google Maps key or assets.
- **Carbon honesty.** Numbers are "estimated / verification-ready removal", never
  "credit" until a registry verifies. Always net of buffer + uncertainty.
- **Vocabulary.** Say "permanent verified record / living proof / tamper-proof
  timeline". Avoid "NFT"/"crypto" in consumer/CSR copy. No tradable tokens.
- **Security.** All SQL parameterised. Escape any value interpolated into HTML
  (map popups). Public endpoints expose no PII. Raw-token auth (no `Bearer`).

## Tech stack
- **Frontend**: React + Vite + TypeScript, Tailwind (admin) + scoped `.earth`
  design system (public surfaces). Leaflet + markercluster maps (keyless Esri
  satellite tiles). Routes lazy-loaded (code-split per page).
- **Backend**: Express + TypeScript (`app/server`). REST under `/api/v1`.
  Auth: `Authorization: <rawToken>` (NO `Bearer ` — Bearer → 500).
- **DB**: Neon Postgres (pooled `-pooler` host only resolves publicly).
  Idempotent SQL migrations in `app/db/migrations/`, run on cold start by
  `api/index.js`.
- **Deploy**: Vercel serverless (`vercel.json` rewrites all routes → `api/index.js`).
  `cd communitree-rebuild && vercel --prod --yes`. Live: communitree-rebuild.vercel.app.

## Carbon method (v1-chave2014)
`AGB = 0.0673·(WD·DBH²·H)^0.976` (Chave 2014) → `+0.24·AGB` roots → `×0.47`
carbon fraction → `×3.667` CO₂e (kg STOCK). Sequestration = stock delta between
visits. Net = gross × (1−0.18 buffer) × (1−0.10 uncertainty). Per-species wood
density from Global Wood Density DB / ICRAF. DBH is breast-height (1.3 m); below
that there is no DBH and carbon is 0.

## Roles
master_roles: 1 Admin, 3 SuperAdmin, 4 Planter. SuperAdmin = all forests; Admin
+ Planter scoped via `user_role_forest_accesses`. Planters use the offline field
PWA at `/field`.

## Public routes (no auth)
`/` landing · `/map` heartbeat map · `/tree/:id` proof-of-life · `/carbon`
methodology · `/sponsor/:id` CSR microsite · `/portal/:id` sponsor portal ·
`/audit/pnb` data-integrity audit · `/field` capture PWA. Admin: `/login` → `/dashboard`.

## Conventions
- Migrations are append-only + idempotent (`ADD COLUMN IF NOT EXISTS`, `UPDATE`s
  keyed to absorb catalog spelling variants). Never edit a shipped migration.
- Seed/import scripts in `app/server/scripts/` are removable by id prefix
  (`FLAGSHIP-%`, `DEMO-%`, `PNB-%`) and labelled with provenance.
- After modifying code, run `graphify update .` to refresh the knowledge graph.
