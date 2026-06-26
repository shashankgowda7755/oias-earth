## Context

The admin is a Vite + React 19 SPA (no SSR). Users run multiple browser
extensions. Extensions like Grammarly inject/wrap/relocate text nodes inside the
DOM React owns. React keeps references to specific DOM nodes between renders; on
the next commit it calls `parent.insertBefore(node, reference)` or
`parent.removeChild(child)`. If the extension has since moved the reference out
of `parent`, the native call throws and the top-level `ErrorBoundary` catches it,
blanking the screen. The most common trigger is a Save button toggling its
spinner, so the bug presented as "crashes on every save."

Google Translate is already neutralized (`<html translate="no">` +
`<meta name="google" content="notranslate">`), so the residual offender is a
non-translate extension. Per-component text-wrapping is fragile — one unwrapped
text node anywhere reopens the crash.

Separately, the field PWA's Workbox service worker was registered at
`scope: '/'` with `navigateFallback: '/index.html'`, so it served the precached
shell for the whole admin app. After a deploy, admin users kept running the old
cached bundle until the SW updated — which is why an already-deployed fix did
not reach them.

## Goals / Non-Goals

**Goals:**
- Eliminate the extension-induced `insertBefore`/`removeChild` crash class
  across the entire admin app with a single, low-cost mechanism.
- Guarantee admin users receive the latest build immediately after each deploy.
- Preserve the field PWA's offline capture behavior.

**Non-Goals:**
- Detecting, blocking, or warning about specific extensions.
- Removing the `ErrorBoundary` (it stays as a backstop for genuine render
  errors).
- Refactoring every JSX site that places text adjacent to a conditional element
  (covered structurally by the global guard; only the two highest-traffic sites
  are hardened for defense-in-depth).

## Decisions

- **Global `Node.prototype` guard over per-component fixes.** Patch
  `insertBefore`/`removeChild` once in `domGuard.ts`, installed in `main.tsx`
  before `createRoot`. Rationale: site-by-site `<span>` wrapping can never be
  proven exhaustive; a DOM-API-level guard covers every current and future
  component. Alternative considered: only wrap text nodes — rejected as
  unverifiable and regression-prone.
- **Recover, don't no-op-everything.** For `insertBefore` with a foreign
  reference node, append (`insertBefore(node, null)`) so the node still enters
  the correct parent and React re-orders it next commit; for `removeChild` of an
  already-detached child, no-op. Rationale: keeps the visible result correct
  rather than dropping nodes. Based on the established facebook/react#11538 fix.
- **Idempotent install** via a `__ctDomGuard` flag so StrictMode's double-invoke
  (dev) does not double-wrap.
- **Scope the SW with `navigateFallbackDenylist: [/^\/(?!field)/]`** instead of
  re-registering the SW under a sub-path. Rationale: minimal Workbox config
  change; admin navigations bypass the cached shell and hit the network, while
  `/field*` keeps the offline fallback. Add `skipWaiting`/`clientsClaim` so a new
  SW activates without the "one reload behind" window.
- **Keep the per-site fixes** in `Buttons.tsx` (both slots in
  `<span className="contents">`) and `AutocompleteField.tsx` ("Searching…" in a
  `<span>`) as belt-and-suspenders for the two hottest paths.

## Risks / Trade-offs

- Monkey-patching `Node.prototype` globally → could mask a genuine React bug.
  Mitigation: a one-time `console.warn` breadcrumb on first recovery; behavior is
  a graceful fallback, not silent data loss.
- `display: contents` on the Button wrapper spans → flex `gap` between icon and
  label could shift slightly. Mitigation: accepted as cosmetic; verified visually.
- Admin loses offline-shell caching → admin requires network (acceptable for an
  internal CRUD tool; field PWA unaffected).
- Users on the pre-change SW still need a one-time tab close/reopen (or SW
  unregister) to drop the old worker. Mitigation: documented operational step;
  self-heals thereafter via `clientsClaim`.

## Migration Plan

1. Ship the client changes; Vercel rebuilds client + server.
2. Verify the live entry bundle contains the guard and `sw.js` contains the
   denylist + `skipWaiting`.
3. Instruct any stuck user to close all tabs/reopen once (or unregister the SW).
4. Rollback: revert the commit and redeploy; the guard and SW config are
   self-contained and have no data/API surface.

## Open Questions

- None. Change is implemented and live (commit `3a4f135`).
