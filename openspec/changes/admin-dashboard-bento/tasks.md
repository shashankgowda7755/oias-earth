> Status: implemented and deployed (live). Checked items reflect completed work;
> recorded here as the spec of record.

## 1. Bento HOME page

- [x] 1.1 Add `app/client/src/pages/DashboardHome.tsx` default-exporting `DashboardHome({ onOpenTab })`
- [x] 1.2 Fetch forests on mount via `fetchForestsMap()`; track `loading`; ignore late results after unmount
- [x] 1.3 Lay out a 4-column CSS grid (`bento-grid`, `gridAutoRows: minmax(84px, auto)`, `gap: 12`) with variable tile spans
- [x] 1.4 OIAS dark + lime tile styling (shared `T.tile` / `T.tileBg`); accent color `#b6ff3c`

## 2. KPI tiles

- [x] 2.1 Compute KPIs in a `useMemo`: forests count, summed `total_trees`, geo-tagged %, survival %
- [x] 2.2 Geo-tagged % = `tagged_trees / total_trees`; Survival % = `(alive_trees ?? tagged_trees) / total_trees`; guard divide-by-zero (0% when no trees)
- [x] 2.3 Render four `Kpi` tiles; show `—` while loading; Trees tile uses the lime accent
- [x] 2.4 Format counts with `toLocaleString('en-IN')`

## 3. Live map + recent forests

- [x] 3.1 Large tile (`gridColumn: span 2`, `gridRow: span 3`) embedding `<HeartbeatMap forests={forests} interactive />`, labelled "Live map"
- [x] 3.2 Recent-forests tile (`gridRow: span 3`): top 6 forests sorted by `total_trees` desc
- [x] 3.3 Each recent row is a button that `navigate(\`/forest/${f.id}\`)`; show loading / empty states
- [x] 3.4 Each row shows the forest name (truncated) and a tree-count pill

## 4. Quick actions + reports shortcut

- [x] 4.1 Quick-actions tile (`span 2 × span 2`): buttons calling `onOpenTab` for `Forests`, `Reports`, `Sponsors`, `Integrity`
- [x] 4.2 Reports shortcut tile (`gridColumn: span 2`) with an "Open →" button calling `onOpenTab('Reports')`
- [x] 4.3 Header "Open live map →" `Link` to `/map`

## 5. Wire HOME as the default section

- [x] 5.1 `TabNav.tsx`: add `'Home'` as the first entry of `SECTION_TABS`
- [x] 5.2 `Dashboard.tsx`: seed `useState<SectionTab>('Home')` and render `<DashboardHome onOpenTab={setActive} />` when `active === 'Home'`
- [x] 5.3 `Sidebar.tsx`: add a `Home` entry to `NAV_ICONS` (house glyph) so it appears first in the nav
- [x] 5.4 Confirm switching tabs from HOME swaps the section in place (URL stays `/dashboard`)

## 6. Responsive + verify

- [x] 6.1 Add a scoped `@media (max-width: 760px)` rule collapsing `.bento-grid` to one column and tiles to span 1
- [x] 6.2 `tsc --noEmit` (client) passes; `npm run build` produces a bundle containing the HOME page
- [x] 6.3 Deploy to Vercel production and verify HOME renders KPIs, map, recent forests, and routes correctly
