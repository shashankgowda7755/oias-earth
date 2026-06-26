> Status: implemented and deployed in commit `3a4f135` (live). Checked items
> reflect completed work; recorded here as the spec of record.

## 1. Global DOM guard

- [x] 1.1 Add `app/client/src/lib/domGuard.ts` exporting `installDomGuard()` that wraps `Node.prototype.insertBefore`/`removeChild`
- [x] 1.2 `insertBefore`: when `referenceNode.parentNode !== this`, append (`insertBefore(node, null)`) instead of throwing
- [x] 1.3 `removeChild`: when `child.parentNode !== this`, no-op and return the child
- [x] 1.4 Make install idempotent via a `__ctDomGuard` flag (safe under StrictMode double-invoke)
- [x] 1.5 Emit a one-time `console.warn` breadcrumb on first recovery
- [x] 1.6 Call `installDomGuard()` in `app/client/src/main.tsx` before `createRoot`

## 2. Per-site defense-in-depth

- [x] 2.1 `Buttons.tsx`: wrap icon/spinner slot and children in stable `<span className="contents">`
- [x] 2.2 `AutocompleteField.tsx`: wrap the "Searching…" text in a `<span>`

## 3. Service-worker scoping

- [x] 3.1 `vite.config.ts` VitePWA workbox: add `navigateFallbackDenylist: [/^\/(?!field)/]`
- [x] 3.2 Add `skipWaiting: true` and `clientsClaim: true`
- [x] 3.3 Confirm `/field*` still serves the precached offline shell

## 4. Build, deploy, verify

- [x] 4.1 `tsc --noEmit` (client) and `tsc -p tsconfig.json --noEmit` (server) pass
- [x] 4.2 `npm run build` produces a bundle containing the guard + a regenerated `sw.js` with the denylist
- [x] 4.3 Deploy to Vercel production (`vercel --prod --yes`)
- [x] 4.4 Verify live: entry bundle contains the guard, `sw.js` contains denylist + `skipWaiting`, `/health` 200
- [x] 4.5 Document the one-time SW drop step for stuck users (close all tabs/reopen or unregister)
