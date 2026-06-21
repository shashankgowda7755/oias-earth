# Geo-tagging / location-proof / dMRV — landscape mapped to our platform

Source: the global geo-tagging/dMRV landscape brief. This maps its requirements + systemic gaps to what OIAS Earth has, and what to build.

## Status against the doc's 5 systemic gaps
| # | Systemic gap (doc) | Our status | Action |
|---|---|---|---|
| 1 | Spoofable device GPS + recycled/edited photos, no validation | **Partial → improving** | SHIPPED: photo SHA-256 hash + duplicate flag; GPS-distance-from-forest "suspect" flag. Roadmap: device-integrity attestation, image-to-GPS, sealed in-app EXIF |
| 2 | Fragmented standards, no GeoJSON / interoperable IDs | **Closed (core)** | SHIPPED: RFC 7946 GeoJSON export (WGS84, lon/lat, 6-decimal) for forests + per-forest trees. Roadmap: GS1/EPCIS for supply chain, JSON-FG temporal |
| 3 | No survival/permanence monitoring | **✅ have it** | Visit log + alive/dead/replaced; carbon ledger freezes dead stock. Differentiator most platforms lack |
| 4 | Smallholder UX / offline burden | **✅ have it** | Offline-first field PWA (planter role, IndexedDB queue, camera capture) |
| 5 | Opaque MRV methodology / black-box ratings | **✅ have it** | Public `/carbon` methodology page; per-tree allometric ledger; "verification-ready, not a credit" labeling |

## Methods table (doc) vs what we use
- **Smartphone GPS** ✅ (field PWA + geo-tag). Now flagged for plausibility.
- **EXIF/photo + timestamp** ✅ (visit photos). Now SHA-256 hashed for reuse detection.
- **Satellite remote sensing** ⏳ basemap only (Esri tiles); NOT yet used for verification (NDVI change-detection) — roadmap.
- **Drone/LiDAR** ❌ not us (out of scope short-term).
- **QR/unique IDs** ✅ `tree_unique_id`; QR plaque is in the OIAS vision (not built).
- **Blockchain anchoring** ⏳ roadmap (Arweave/Polygon in OIAS vision; not built).
- **FOAM/radio proof-of-location** ❌ out of scope (infra-heavy).
- **Cell/WiFi/IP** ❌ not used.

## Standards the doc names — our alignment
- **RFC 7946 GeoJSON / WGS84 / 6-decimal** → SHIPPED export endpoints.
- **EUDR geolocation (6-decimal points; polygons >4ha)** → points ✅; **polygon capture per site = gap** (we store a forest centre + per-tree points, not a boundary polygon). Roadmap.
- **Verra VM0047 / AR-ACM0003 allometry** → carbon engine aligned (Chave, 0.47, 3.667, buffer). 
- **GS1/EPCIS** (supply-chain) → not applicable yet (we're not a commodity supply chain).

## SHIPPED this turn
1. **GeoJSON export** — `GET /api/v1/public/forests.geojson` (FeatureCollection of forests) + `GET /api/v1/public/forest/:id/trees.geojson` (trees). Standards-compliant, no login, EUDR-grade 6-decimal precision. Interoperability + transparency.
2. **Capture-integrity layer** (migration 008):
   - Every uploaded visit photo is **SHA-256 hashed**; an identical image already in the system flags `is_duplicate` (recycled-photo fraud).
   - Every visit's GPS is checked against its **forest centre**; >5 km flags `geo_suspect` + stores `geo_distance_m` (spoof / mis-capture).
   - Append-only flags — nothing deleted, audit trail intact.

## Roadmap (mapped to doc gaps, ranked)
1. **Surface integrity flags** in admin + public (e.g., "photo verified unique", hide/flag suspect captures from public proof + carbon totals).
2. **Satellite NDVI cross-check** — temporal-consistency: confirm reported planting/growth against EO change-detection; flag ghost plantations (doc's top fraud mode). Heaviest verification win.
3. **EUDR polygon capture** — let a forest store a boundary polygon (GeoJSON), not just a centre; export as polygon for >4ha.
4. **Blockchain anchoring** — monthly Merkle root of the ledger to Polygon/Arweave (OIAS vision) → immutable audit (doc: Veritree/Cardano pattern).
5. **Device/photo provenance** — in-app-camera-only with sealed EXIF + device attestation; optional image-to-GPS verification for high-value claims.
6. **Multi-registry / interoperable asset IDs** — stable feature IDs across exports (toward the doc's "interoperable asset graph").

## Honest position
We already match best-in-class on **survival monitoring, offline smallholder UX, and transparent methodology** — the three gaps most platforms fail. With GeoJSON + the integrity layer now in, the remaining differentiators are **satellite cross-check** and **on-chain anchoring**, both already on the OIAS roadmap.
