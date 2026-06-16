# Geo-tagging & Species Data — live inspection (read-only)

## Geo-tagging model
Three levels of geo data, all live-confirmed against the PNB forest (`7e214f4f-…`, forestUniqueId PNBPNB36):

1. **Forest** (`forests` table)
   - `forest_geo_lat` / `forest_geo_long` — center point (PNB: 12.908667, 80.215750).
   - `forest_boundary` — a JSON **string** of the perimeter polygon: `[{"lat":12.908741,"lng":80.21537},{"lat":12.90846…,"lng":80.21700…}, …]`. Drawn as the forest outline on the map. (Stored JSON-as-string, not jsonb, in this row.)
   - `forest_geo_radius` / `forest_geo_shape` — alt geo (null for PNB; boundary polygon used instead).
   - grid params (`box_rows`, `box_column`, `tree_row`, `tree_column`) null for PNB (grid optional; this forest was imported, not wizard-built).

2. **ForestCluster** (`forest_clusters` table) — OPTIONAL map-clustering layer: `lat, lng, zoom, tree_count, tree(JSON)`, `forest_id`. Used to render aggregated pins at low zoom for big forests. **PNB has 0 clusters** → the map plots trees directly / via boundary. So clustering is a performance feature, not required.

3. **ForestTree** (`forest_trees` table) — EVERY tree individually geo-tagged:
   - `forest_tree_geo_lat` / `forest_tree_geo_long` (e.g. AK042 → 12.908630, 80.215980)
   - `tree_unique_id` (AK042, AL370 …), `forest_tree_name` (Arjun), `master_plant_species_id` (35), `planted_on` (2024-09-02)
   - `forest_tree_oxygen` (146.475 Kg), `forest_tree_carbonoffset` (81.375 Kg) — **computed per tree** (see below).
   - PNB: 10,800 trees, all geo-tagged. Sponsor "Trees" tab shows these (Lat/Long column). Map uses these points + boundary.

### How the impact numbers are derived
Per-tree oxygen ≈ `species.oxygen_per_day × tree_age_days`. Check: AK042 = 146.475 / 0.225 (Arjun oxygenPerDay) = **651 days**; carbon 81.375 / 0.125 = 651. Consistent. Forest dashboard KPIs (Oxygen 1,678.75 KT, Carbon 928.30 KT) = sum across all trees. So reporting is computed from species rates × age × count, not stored aggregates only (`forests.forest_oxygen`/`forest_carbonoffset` cache the totals).

### Maps stack
Google Maps JS API (keyed) for the sponsor dashboard + admin forest picker. "Open this area in Google Maps" deep-link. OSM tiles referenced as a fallback/secondary.

## Species data (`master_plantspecies` table)
- **96 species** total (full list in `species_catalog.json`). All `species_category = "Tree"`.
- Fields: `id, species_name` (botanical, e.g. *Terminalia Arjuna*), `common_name` (Arjun), `species_category`, `oxygen_per_day` (≈0.225 kg), `carbon_offset_per_day` (≈0.125 kg), `species_oxygen_level1..5` (growth-stage oxygen, mostly blank), `rate` (₹, e.g. 100 — sapling cost/sponsorship price), `is_timber_production`, `is_flowering_plant`, `is_fruit_bearing`, `is_nesting_habitat` (ecological flags, all true in seed), `is_active`.
- id 35 = *Terminalia Arjuna* / "Arjun" = the PNB forest's planted species. PNB has 8 of the 96 species (`total_species_planted = 8`).
- **Access**: the species catalog is reachable by SuperAdmin (REST `/api/v1/master-plantspecies/search` and GraphQL `allMasterPlantspecies`). The **sponsor (Admin) role gets 403** on the REST species search — it's admin/reference data, not exposed to sponsors. Sponsors only see species names via their trees.
- Usage: forest creation (admin) assigns species per box; per-tree `master_plant_species_id` drives the oxygen/carbon math and the Trees register.

## Rebuild implications
- Seed `master_plantspecies` with the 96-row catalog (`species_catalog.json`).
- `forest_trees` needs geo lat/long + species FK + computed oxygen/carbon (oxygen_per_day × age_days).
- Map view: render forest boundary polygon + tree points; optional cluster layer for big forests.
- Sponsor reporting KPIs computed from species rate × age × tree count.
- Role gating: species master is admin-only (403 for sponsor).
