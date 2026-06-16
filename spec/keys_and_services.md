# API Keys & Third-Party Services — Live Inspection

Inspected `admin.bethetreehugger.co` (DEV/STAGING deployment). Method: full read of the single JS bundle `assets/index-11593f02.js` (3.98 MB) + runtime network capture. This is the client-side surface only; backend secrets are NOT visible (correct).

## Client-side API keys (exposed in the bundle — this is normal for frontend keys)
| Key | Value | Service | Notes |
|---|---|---|---|
| Google Maps JS API key | `AIzaSyC460AqqU6PgMO4s5wJvE5GLge9evj4r6o` | Google Maps JavaScript + Places (forest location picker) | Loaded via `@react-google-maps/api` -> `https://maps.googleapis.com/maps/api/js?key=...&auth_referrer_policy=origin`. The `auth_referrer_policy=origin` indicates an HTTP-referrer restriction is configured (good). |

That is the ONLY API key shipped to the browser.

## Third-party services (NO secret key on the client)
- **maps.googleapis.com / maps.gstatic.com** — Google Maps (keyed, above).
- **tile.openstreetmap.org** — OSM map tiles (secondary/leaflet map; keyless).
- **api.qrserver.com** — QR-code image generation (keyless public API; tree/forest QR codes).
- **i.ibb.co** — ImgBB image hosting (some sponsor logos).
- **bethetreehugger-staging.objectstore.e2enetworks.net** — E2E Networks object storage; uploaded logos/images served from public-read URLs (path `/sponsors/...`, `/forests/...`). Upload endpoint `POST /api/v1/upload`.
- **fonts.googleapis.com / fonts.gstatic.com** — Noto Sans web font.
- **fastly.picsum.photos / images.unsplash.com** — placeholder images (dev only).

## NOT present (checked explicitly)
- No Firebase config, no Razorpay/Stripe publishable key, no Sentry DSN, no Google Analytics/GTM ID, no Mapbox, no Segment/Amplitude/Mixpanel. (Apparent `G-…` matches in the minified code were false positives.)
- No Supabase, no embedded JWT/anon key.
- No `x-api-key`/custom secret headers — the only auth header references are `authorization` (the user JWT) and `googleMapsApiKey` (the maps lib field, not a separate key).

## Auth / secrets posture
- Browser holds only the **JWT** in `localStorage.token` (+ role, profileId, userDetails). No other credentials client-side.
- REST auth header: raw token (no `Bearer`). GraphQL auth: `Bearer <token>`.
- Backend signing secret, DB creds, and object-store keys are server-side only — not exposed.

## Extra endpoints discovered in the bundle (beyond the admin lists)
- `POST /api/v1/upload` — generic file upload (used by logo/image fields).
- `/api/v1/tree`, `/api/v1/tree/gift_tree`, `/api/v1/tree/download/${id}` — tree + gift-tree + certificate download (consumer/gift flow).
- `https://dev.bethetreehugger.co/tree` — public consumer tree page.
- GraphQL: `dev-api.bethetreehugger.co/graphql` (PostGraphile, introspection ENABLED).

## Security recommendations (your own site)
1. **Lock the Google Maps key in GCP**: restrict to HTTP referrers (`admin.bethetreehugger.co` + prod domain) AND to only the APIs you use (Maps JS, Places, Geocoding). An unrestricted key can be reused by anyone for billable Google calls. Referrer policy looks set; verify API restriction too.
2. **GraphQL introspection + full PostGraphile CRUD is reachable by any authenticated user.** A SuperAdmin token can run every create/update/delete on all 52 tables via `/graphql`. Confirm Postgres row-level security / role grants so lower-privilege roles can't mutate freely, and consider disabling introspection in prod.
3. REST errors return the raw library message (`jwt malformed`) with HTTP 500 — minor info leak; map to a generic 401.
4. These are the DEV/STAGING hosts (`dev-api`, `dev-auth`, staging object store) — confirm the prod build doesn't reuse the same Maps key without its own restrictions.
