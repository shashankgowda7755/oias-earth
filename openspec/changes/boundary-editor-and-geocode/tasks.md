> Status: implemented and deployed (live). Checked items reflect completed
> work; recorded here as the spec of record.

## 1. Geo-measurement helpers

- [x] 1.1 Add `app/client/src/pages/Forests/geoMeasure.ts` with the `LL` `{lat,lng}` type
- [x] 1.2 `polygonAreaHa`: metric shoelace projected about the ring centroid (`cos(lat)` scaling), returns hectares; 0 for < 3 points
- [x] 1.3 `perimeterM`: haversine around the closed ring (R = 6371000); 0 for < 2 points
- [x] 1.4 `areaLabel`: human label — "—" for 0, "640 m²" under 0.1 ha, "1.84 ha" otherwise
- [x] 1.5 `parseBoundaryFile`: GeoJSON path (largest Polygon/MultiPolygon ring, `[lng,lat]`) and KML path (`<coordinates>` blocks, `lng,lat,alt`, drops duplicate closing point); returns `[]` on failure

## 2. Restor.eco-style boundary editor

- [x] 2.1 `TreeMap.tsx`: add `boundaryEdit`, `boundaryDraft`, and `onBoundaryEdit` props (ring emitted on every edit)
- [x] 2.2 Tap the map to append a corner (`GeoTagSection.onMapClick` pushes a point while in boundary mode)
- [x] 2.3 Render draggable vertex handles; `dragend` replaces that vertex and emits the full ring
- [x] 2.4 Render edge-midpoint insert dots; click splices a new vertex into that edge
- [x] 2.5 Double-tap (`dblclick`) a vertex to delete it, kept at >= 3 points
- [x] 2.6 Suppress map re-fit (`fitBounds`) while `boundaryEdit` is on so the view stays steady
- [x] 2.7 `GeoTagSection.tsx`: Draw/Edit + Undo/Clear/Save controls; live Area (`areaLabel(polygonAreaHa)`) + Perimeter (`perimeterM`) + point-count readout and the editing hint

## 3. Boundary import + persistence

- [x] 3.1 `GeoTagSection.onImportBoundary`: read the file, `parseBoundaryFile`, require >= 3 points, enter edit mode with the imported ring
- [x] 3.2 "Import KML / GeoJSON" file input accepts `.kml,.geojson,.json` and resets after pick
- [x] 3.3 Save via `setForestBoundary` -> `POST /forest/:id/boundary` -> `forests.forest_boundary` (jsonb); empty ring clears the boundary
- [x] 3.4 Confirm the saved ring drives the species-matrix clip (`matrixLayout.ts` ray-cast point-in-polygon)

## 4. Location picker geocoding

- [x] 4.1 `LocationPicker.tsx`: keyless OSM Nominatim place SEARCH (`/search`) that drops + recentres the pin
- [x] 4.2 Reverse-geocode (`/reverse`) on pin move / click / search, debounced 800 ms
- [x] 4.3 `partsOf`: parse Nominatim address into `{ address, city, state, country }` (city falls back through town/village/municipality/county/state_district)
- [x] 4.4 `onPlace` callback fills the editable Address and city/state/country; `Steps.tsx` wires it to `forest_address`/`forest_city`/`forest_state`/`forest_country`
- [x] 4.5 Skip reverse-geocode on the initial coordinate sync (`didMountRef`) so a saved address on Edit is not clobbered
- [x] 4.6 Lat/Long text inputs stay the source of truth — typing moves the pin and recentres

## 5. Build, deploy, verify

- [x] 5.1 `tsc --noEmit` (client) passes
- [x] 5.2 `npm run build` bundles the editor + geocoder
- [x] 5.3 Deploy to Vercel production (`vercel --prod --yes`)
- [x] 5.4 Verify live: draw/drag/insert/delete vertices, area + perimeter update, KML/GeoJSON import, search-to-pin, reverse-geocode auto-fill, boundary persists and the matrix clips to it
