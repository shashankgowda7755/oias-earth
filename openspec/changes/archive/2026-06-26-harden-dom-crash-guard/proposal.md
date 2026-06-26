## Why

A DOM-mutating browser extension (Grammarly-class; Google Translate is already
disabled via `translate="no"` + `notranslate`) relocates the text nodes React
owns. A routine React commit — most visibly **every Save** — then calls
`insertBefore`/`removeChild` against a node the extension has detached, which
throws `Failed to execute 'insertBefore' on 'Node': ... not a child of this node`
and the top-level `ErrorBoundary` swallows the whole screen. The crash was
reproducible across the admin app, blocking core CRUD work.

Compounding it: the field PWA's service worker was registered at `scope: '/'`,
so it served a **stale precached app shell (old JS chunks)** to the entire admin
site after every deploy — meaning even a deployed fix did not reach users.

## What Changes

- Add a **global DOM guard**: patch `Node.prototype.insertBefore` and
  `Node.prototype.removeChild` once, before React mounts, to recover gracefully
  (append / no-op) instead of throwing when the reference/target node is no
  longer a child of the expected parent. App-wide, not site-by-site.
- Defense-in-depth at known vulnerable JSX sites (a conditionally-rendered
  element node glued to a bare text sibling): `Buttons.tsx` wraps both slots in
  stable `<span className="contents">`; `AutocompleteField.tsx` wraps the
  "Searching…" text in a `<span>`.
- **Scope the field PWA service worker** so admin routes always fetch fresh JS:
  `navigateFallbackDenylist: [/^\/(?!field)/]` plus `skipWaiting` /
  `clientsClaim`. Only `/field*` keeps the offline app shell.

Status: already implemented and deployed (commit `3a4f135`). This change is the
retroactive spec of record.

## Capabilities

### New Capabilities
- `dom-crash-resilience`: the client must survive third-party DOM mutation
  without a full-screen crash, and must guarantee delivery of the latest admin
  build after each deploy (no stale service-worker shell).

### Modified Capabilities
<!-- None — no existing spec's requirements change. -->

## Impact

- Client: `app/client/src/lib/domGuard.ts` (new), `app/client/src/main.tsx`
  (install before `createRoot`), `app/client/src/components/Buttons.tsx`,
  `app/client/src/components/fields/AutocompleteField.tsx`,
  `app/client/vite.config.ts` (VitePWA workbox config).
- Runtime behavior: `Node.prototype` insert/remove are globally wrapped (one
  `parentNode` identity check per call — negligible). Admin routes bypass the SW
  navigation fallback; field PWA offline behavior unchanged.
- Operational: after a deploy, a user on the old SW must close all tabs / reopen
  (or unregister the SW) once to drop the stale worker.
- No API, database, or dependency changes.
