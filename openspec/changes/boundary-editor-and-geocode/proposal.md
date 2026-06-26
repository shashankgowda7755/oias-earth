## Why

The forest-geotagging capability already stored an optional polygon boundary,
but the only way to draw one was tap-to-add-corner: every corner had to be
placed perfectly on the first try, with **no way to move, insert, or delete a
vertex** once placed. Correcting a misplaced corner meant clearing the whole
ring and starting over, and there was no feedback on how big the polygon
actually was. For EUDR-grade site geometry — and for the **species matrix**,
which lays saplings out as a uniform grid clipped to the boundary
(`matrixLayout.ts`, ray-cast point-in-polygon) — an imprecise boundary
propagates straight into the plantation layout.

Separately, the forest **location** step required a human to know and type the
latitude/longitude, then *separately* type the address, city, state, and
country. Nothing tied the map pin to a real place name, so coordinates and the
written address could silently disagree.

## What Changes

- Upgrade the Geo-tagging tab's boundary tool into a **Restor.eco-style polygon
  editor** (`TreeMap.tsx` `boundaryEdit` mode, driven from `GeoTagSection.tsx`):
  - **Tap** the map to append a corner.
  - **Drag** a vertex handle to move it (emits the full updated ring on
    `dragend`).
  - **Click an edge midpoint dot** to insert a new vertex on that edge.
  - **Double-tap a vertex** to delete it (kept at >= 3 points).
  - Live **AREA (ha)** and **PERIMETER (m)** readout plus a point count, updated
    on every edit; the map does not re-fit while editing so the view stays
    steady.
- Add `geoMeasure.ts`: `polygonAreaHa` (metric shoelace about the ring
  centroid), `perimeterM` (haversine around the closed ring), `areaLabel`
  (human "1.84 ha" / "640 m²"), and `parseBoundaryFile` for **KML / GeoJSON
  import** (largest Polygon/MultiPolygon ring; GeoJSON `[lng,lat]`, KML
  `lng,lat,alt`). Import drops the ring straight into edit mode.
- The edited ring saves as a real lat/lng polygon via `setForestBoundary` ->
  `POST /forest/:id/boundary` -> `forests.forest_boundary` (jsonb); the species
  matrix then clips to it.
- Add the **`LocationPicker`** geocoder (`LocationPicker.tsx`): keyless OSM
  **Nominatim** place SEARCH that drops/recentres the pin, and a
  **reverse-geocode** that fills the editable Address field *and* city / state /
  country (via `onPlace`) whenever the pin is moved, clicked, or a search is
  picked. The initial coordinate sync is skipped (`didMountRef`) so a saved
  address on Edit is never clobbered.

Status: already implemented and deployed. This change is the retroactive spec of
record.

## Capabilities

### New Capabilities
<!-- None — this is a delta to an existing capability. -->

### Modified Capabilities
- `forest-geotagging`: the existing "Forest boundary" requirement is extended
  with full vertex editing (drag / insert / delete), a live area + perimeter
  readout, and KML/GeoJSON import; a new requirement adds map-driven
  geocoding (search-to-pin + reverse-geocode auto-fill of address and admin
  components).

## Impact

- Client: `app/client/src/pages/Forests/geoMeasure.ts` (new),
  `app/client/src/pages/Forests/TreeMap.tsx` (`boundaryEdit` mode: draggable
  vertices, edge-insert handles, double-tap delete),
  `app/client/src/pages/Forests/GeoTagSection.tsx` (editor controls + live
  readout + import wiring),
  `app/client/src/pages/Forests/LocationPicker.tsx` (search + reverse-geocode,
  `onPlace`), `app/client/src/pages/Forests/Steps.tsx` (consumes `onPlace` to
  fill address/city/state/country).
- Server/DB: no schema change — boundary still persists to
  `forests.forest_boundary` (jsonb) via the existing
  `POST /forest/:id/boundary` (`setForestBoundary` validates >= 3 points and
  lat/lng ranges).
- External: browser calls OSM Nominatim (`/search`, `/reverse`) directly,
  keyless, at admin volume; no API key, no server proxy.
- No new dependencies (Leaflet + `DOMParser` already present).
