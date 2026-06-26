> Status: implemented and deployed (live). Checked items reflect completed
> work; recorded here as the spec of record.

## 1. Matrix layout engine

- [x] 1.1 Add `app/client/src/pages/Forests/matrixLayout.ts` with `pointInPolygon` (ray-cast point-in-polygon)
- [x] 1.2 `buildPlantingLayout(poly, opts)`: lay ~`total` saplings as 10×10 matrices with real relative spacing (1 ft sapling / 2 ft matrix-gap / 10 ft pathway), uniformly scale to fit the polygon bbox (`fitFraction 0.92`), and clip to the polygon; return `{ points, blocks, count }`
- [x] 1.3 Support three `LayoutStyle`s — `aisle` / `grid` / `ring` — via per-axis gap functions (pathway vs matrix gap, `superBlock` of 5 for `grid`)
- [x] 1.4 `gridInPolygon(poly, target)`: bbox lattice kept to polygon interior, row-major north→south (area-fraction sizing)
- [x] 1.5 `gridRect(center, target, spacingM)`: spacing-based fallback lattice centred on a point (grows with count)
- [x] 1.6 `allocateSpecies(total, species)`: block-allocate a species colour+name per point in proportion to each species' sapling count
- [x] 1.7 `SPECIES_PALETTE` (8 fixed colours) + `subsample` helper

## 2. ForestPage (/forest/:id) matrix mini-map

- [x] 2.1 Build the mini-map from the boundary polygon, or a synthetic ~100 m square around `forest.lat/lng` when none is drawn
- [x] 2.2 Size the matrix from `report.computed.total_saplings` → `forest.total_trees` → `PLANT_TOTAL` (10000), capped at 12,000 points
- [x] 2.3 Render saplings on an `L.canvas` renderer (radius 2.4, species fill); add the layer to a `LayerGroup`
- [x] 2.4 Layout toggle (Aisle rows / Pathway grid / Ringed) rebuilds ONLY the sapling layer via `buildRef`, preserving the current zoom, with an opacity fade-in
- [x] 2.5 Zoom-gated reveal at `REVEAL_ZOOM = 17`: outline-only below, saplings fade in at/above; "Zoom in to reveal the saplings" hint shown only when a real boundary exists
- [x] 2.6 Species legend (bottom-right) showing the sapling total + per-species count, escaping interpolated names
- [x] 2.7 Fit view: real boundary uses `fitBounds(polygon)`; synthetic area fits the matrix bounds so it fills the map

## 3. PublicMap (/map) per-forest drill-down

- [x] 3.1 `selectForest(f)`: clear the tree/matrix/boundary layers and load boundary + report + trees in parallel
- [x] 3.2 Replace the markercluster spiderfy with the same matrix engine (`buildPlantingLayout`, `layout: 'aisle'`, capped 12,000), coloured via `allocateSpecies`, drawn on `L.canvas` (radius scaled by point count)
- [x] 3.3 Draw the boundary polygon when ≥3 points exist; otherwise lay the matrix in a synthetic ~100 m square around the centre
- [x] 3.4 Fit the view to the matrix bounds; set per-forest legend shares + area (ha)

## 4. Satellite basemap + forest pin

- [x] 4.1 Swap both maps to Esri World Imagery tiles + CARTO `dark_only_labels` overlay (keyless, attributed)
- [x] 4.2 Forest marker = ring-badge holder pin in `earth.css .forest-logo-pin`: white circle + sponsor logo (or lime fill) + pointer stem anchored to the coord
- [x] 4.3 Tint the pin ring by survival % via `survivalClass`: alive (≥90%) lime, warn (75–90%) amber, risk (<75%) orange
- [x] 4.4 `forestIcon` falls back to a lime `nologo` badge and removes a broken logo `<img>` on error

## 5. Build, deploy, verify

- [x] 5.1 `tsc --noEmit` (client) passes with the new module + map changes
- [x] 5.2 `npm run build` bundles the matrix engine into the `/forest/:id` and `/map` route chunks
- [x] 5.3 Deploy to Vercel production
- [x] 5.4 Verify live: per-forest drill-down on `/map` and `/forest/:id` renders the species matrix (no spiderfy), satellite tiles load, the layout toggle + zoom-gated reveal work, and a no-boundary forest still renders in its synthetic square
