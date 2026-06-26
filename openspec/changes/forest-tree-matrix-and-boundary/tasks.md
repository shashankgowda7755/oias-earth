# Tasks

## Shipped
- [x] Satellite basemap (Esri World Imagery) + labels + Street/Satellite toggle on geo maps
- [x] `matrixLayout.ts`: grid-in-polygon (ray-cast clip), rect fallback, species block-allocation, layout styles
- [x] Species matrix on `/forest/:id` (canvas circleMarkers, real per-forest sapling total, species legend, zoom-gated reveal)
- [x] Unify `/map` selected-forest view to the same matrix (remove tree markercluster + spiderfy + per-tree pins; species legend)
- [x] Real-dimensioned layout (1 ft sapling, 2 ft matrix, ~100/matrix, ~10 ft pathway) + Aisle/Pathway-grid/Ringed toggle
- [x] `geoMeasure.ts`: `polygonAreaHa` (metric shoelace), `perimeterM` (haversine), `parseBoundaryFile` (KML + GeoJSON)
- [x] `TreeMap.tsx` boundary editing: draggable vertices, edge-insert handles, double-tap delete, closed green outline
- [x] `GeoTagSection.tsx`: live area + perimeter + point count readout; Import KML/GeoJSON button; Undo/Clear/Save
- [x] Verified live across forests (Bangalore 700, PNB 10,878, Trichy 220); boundary editor verified (drag/insert/delete + area/perimeter)

## Pending (designed + approved, not yet built)
- [ ] "Approximate" dashed-hexagon placeholder boundary + badge for forests with no surveyed coords; swaps to solid on real coords
