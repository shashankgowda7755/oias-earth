/**
 * Public (UNAUTHENTICATED) read-only routes — the public proof registry.
 *
 * Anyone can see WHERE the geo-tagged forests are and verify the tagged trees,
 * with no login. This is the consumer-facing "living proof" surface from the
 * venture blueprint: a public map of every live, geo-tagged forest.
 *
 * SECURITY: returns only public-safe fields (forest name/location/counts,
 * tree unique id + coordinates + species). NO owner PII, no internal ids that
 * grant access, no sponsor contacts. All SQL is parameterised. Mounted BEFORE
 * requireAuth in index.ts so it needs no token.
 */
import { Router, type Request, type Response } from 'express';
import { query } from '../db';
import { notFound } from '../errors';
import { treeCo2eKg, netCo2eKg, oxygenKg, CARBON_METHOD, BUFFER_PCT, UNCERTAINTY_PCT } from '../lib/carbon';
import { isAllowedPanoUrl } from '../lib/pano';

export const publicRouter = Router();

function wrap(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: (e?: unknown) => void) => {
    fn(req, res).catch(next);
  };
}

/**
 * GET /public/forests-map — every active forest that has a centre coordinate,
 * with its tree totals. Powers the public map's forest markers.
 */
async function forestsMap(_req: Request, res: Response): Promise<void> {
  const rows = await query<{
    id: string;
    forest_name: string | null;
    forest_unique_id: string | null;
    forest_geo_lat: string | null;
    forest_geo_long: string | null;
    forest_city: string | null;
    forest_state: string | null;
    forest_country: string | null;
    total_trees: string;
    tagged_trees: string;
    alive_trees: string;
    sponsor_name: string | null;
    sponsor_logo: string | null;
  }>(
    `SELECT f.id, f.forest_name, f.forest_unique_id,
            f.forest_geo_lat, f.forest_geo_long,
            f.forest_city, f.forest_state, f.forest_country,
            COUNT(t.id) FILTER (WHERE t.is_active = TRUE) AS total_trees,
            COUNT(t.id) FILTER (WHERE t.is_active = TRUE
                   AND t.forest_tree_geo_lat IS NOT NULL
                   AND t.forest_tree_geo_long IS NOT NULL) AS tagged_trees,
            COUNT(t.id) FILTER (WHERE t.is_active = TRUE
                   AND COALESCE(t.tree_status_id, 1) <> 4) AS alive_trees,
            sp.sponsor_name, sp.sponsor_logo
       FROM forests f
       LEFT JOIN forest_trees t ON t.forest_id = f.id
       LEFT JOIN LATERAL (
         SELECT s.sponsor_name, s.sponsor_logo
           FROM forest_sponsors fs
           JOIN sponsors s ON s.id = fs.sponsor_id AND s.is_active = TRUE
          WHERE fs.forest_id = f.id AND fs.is_active = TRUE
          ORDER BY fs.created_at
          LIMIT 1
       ) sp ON TRUE
      WHERE f.is_active = TRUE
        AND f.forest_geo_lat IS NOT NULL AND f.forest_geo_long IS NOT NULL
      GROUP BY f.id, sp.sponsor_name, sp.sponsor_logo
      ORDER BY f.forest_name`,
  );

  res.json({
    data: rows.rows.map((r) => ({
      id: r.id,
      name: r.forest_name,
      unique_id: r.forest_unique_id,
      lat: r.forest_geo_lat ? Number(r.forest_geo_lat) : null,
      lng: r.forest_geo_long ? Number(r.forest_geo_long) : null,
      city: r.forest_city,
      state: r.forest_state,
      country: r.forest_country,
      total_trees: Number(r.total_trees),
      tagged_trees: Number(r.tagged_trees),
      alive_trees: Number(r.alive_trees),
      survival_pct:
        Number(r.total_trees) > 0
          ? Math.round((Number(r.alive_trees) / Number(r.total_trees)) * 1000) / 10
          : null,
      sponsor_name: r.sponsor_name,
      sponsor_logo: r.sponsor_logo,
    })),
  });
}

/**
 * GET /public/forest/:id/trees — geo-tagged trees for one forest (drill-down
 * markers). Public-safe fields only.
 */
async function forestTreesPublic(req: Request, res: Response): Promise<void> {
  const forestId = String(req.params.id);

  const exists = await query(
    `SELECT 1 FROM forests WHERE id = $1 AND is_active = TRUE`,
    [forestId],
  );
  if (exists.rowCount === 0) throw notFound('Forest not found');

  const rows = await query<{
    id: string;
    tree_unique_id: string | null;
    pet_name: string | null;
    lat: string | null;
    lng: string | null;
    species: string | null;
    height: string | null;
    dbh: string | null;
    wood_density: number | null;
    status_id: number | null;
    status: string | null;
    last_seen: string | null;
    age_days: number | null;
    planted_on: string | null;
    photo_url: string | null;
  }>(
    `SELECT ft.id,
            ft.tree_unique_id,
            ft.forest_tree_petname AS pet_name,
            ft.forest_tree_geo_lat AS lat,
            ft.forest_tree_geo_long AS lng,
            COALESCE(sp.common_name, sp.species_name) AS species,
            ft.forest_tree_height AS height,
            ft.forest_tree_dia AS dbh,
            sp.wood_density,
            COALESCE(ft.tree_status_id, 1) AS status_id,
            st.status,
            ft.forest_tree_age AS age_days,
            ft.planted_on,
            (SELECT MAX(tl.timeline_date) FROM forest_plant_timelines tl
              WHERE tl.plant_id = ft.id AND tl.is_active = TRUE) AS last_seen,
            (SELECT a.url
               FROM forest_plant_timeline_assets a
               JOIN forest_plant_timelines tl2 ON tl2.id = a.timeline_id
              WHERE tl2.plant_id = ft.id AND tl2.is_active = TRUE
                AND a.is_active = TRUE AND a.url IS NOT NULL
              ORDER BY tl2.timeline_date DESC NULLS LAST, a."order" ASC
              LIMIT 1) AS photo_url
       FROM forest_trees ft
       LEFT JOIN master_plantspecies sp ON sp.id = ft.master_plant_species_id
       LEFT JOIN tree_status_master st ON st.id = ft.tree_status_id
      WHERE ft.forest_id = $1 AND ft.is_active = TRUE AND ft.is_display = TRUE
        AND ft.forest_tree_geo_lat IS NOT NULL
        AND ft.forest_tree_geo_long IS NOT NULL
      LIMIT 12000`,
    [forestId],
  );

  res.json({
    data: rows.rows.map((t) => {
      const h = t.height != null ? Number(t.height) : null;
      const d = t.dbh != null ? Number(t.dbh) : null;
      const wd = t.wood_density != null ? Number(t.wood_density) : 0.6;
      const co2e =
        h != null && d != null && h > 0 && d > 0
          ? Math.round(treeCo2eKg(wd, d, h) * 10) / 10
          : null;
      return {
        id: t.id,
        tree_unique_id: t.tree_unique_id,
        pet_name: t.pet_name,
        lat: t.lat ? Number(t.lat) : null,
        lng: t.lng ? Number(t.lng) : null,
        species: t.species,
        height: h,
        dbh: d,
        status_id: t.status_id,
        status: t.status,
        survival: t.status_id === 4 ? 'dead' : 'alive',
        co2e_kg: co2e,
        oxygen_kg: co2e != null ? Math.round(oxygenKg(co2e) * 10) / 10 : null,
        age_days: t.age_days != null ? Number(t.age_days) : null,
        planted_on: t.planted_on,
        photo_url: t.photo_url,
        last_seen: t.last_seen,
      };
    }),
  });
}

/**
 * GET /public/tree/:id — the per-tree PROOF-OF-LIFE page data. Base tree info +
 * the full longitudinal visit timeline (forest_plant_timelines) with photos,
 * plus a computed survival verdict and growth delta. This is the moat: not a
 * day-zero snapshot, but a life record anyone can verify, no login.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function treeProof(req: Request, res: Response): Promise<void> {
  const treeId = String(req.params.id);
  // Reject malformed ids cleanly (else Postgres throws on the uuid cast -> 500).
  if (!UUID_RE.test(treeId)) throw notFound('Tree not found');

  const t = await query<{
    id: string;
    tree_unique_id: string | null;
    species: string | null;
    species_name: string | null;
    forest_id: string | null;
    forest_name: string | null;
    forest_unique_id: string | null;
    city: string | null;
    state: string | null;
    planted_on: string | null;
    lat: string | null;
    lng: string | null;
    forest_tree_height: string | null;
    forest_tree_dia: string | null;
    tree_status_id: number | null;
    status: string | null;
    wood_density: number | null;
    is_demo: boolean | null;
    gifted_to: string | null;
  }>(
    `SELECT ft.id, ft.tree_unique_id,
            COALESCE(sp.common_name, sp.species_name) AS species,
            sp.species_name,
            f.id AS forest_id, f.forest_name, f.forest_unique_id,
            f.forest_city AS city, f.forest_state AS state,
            ft.planted_on,
            ft.forest_tree_geo_lat AS lat, ft.forest_tree_geo_long AS lng,
            ft.forest_tree_height, ft.forest_tree_dia, ft.tree_status_id,
            ft.geo_is_modeled,
            st.status, sp.wood_density, f.is_demo,
            (SELECT name FROM gift_forest_plants g WHERE g.gift_tree_id = ft.id AND g.is_active = TRUE ORDER BY created_at DESC LIMIT 1) AS gifted_to
       FROM forest_trees ft
       LEFT JOIN forests f ON f.id = ft.forest_id
       LEFT JOIN master_plantspecies sp ON sp.id = ft.master_plant_species_id
       LEFT JOIN tree_status_master st ON st.id = ft.tree_status_id
      WHERE ft.id = $1 AND ft.is_active = TRUE
      LIMIT 1`,
    [treeId],
  );
  if (t.rowCount === 0) throw notFound('Tree not found');
  const tree = t.rows[0]!;

  const v = await query<{
    id: number;
    timeline_date: string | null;
    status: string | null;
    status_id: number | null;
    height: number | null;
    diameter: number | null;
    age: number | null;
    latitude: string | null;
    longitude: string | null;
    photos: string[] | null;
    geo_suspect: boolean | null;
    has_dup_photo: boolean | null;
  }>(
    `SELECT tl.id, tl.timeline_date, st.status, tl.status_id,
            tl.height, tl.diameter, tl.age, tl.latitude, tl.longitude,
            tl.geo_suspect,
            COALESCE(
              (SELECT json_agg(a.url ORDER BY a."order")
                 FROM forest_plant_timeline_assets a
                WHERE a.timeline_id = tl.id AND a.is_active = TRUE
                  AND a.url IS NOT NULL),
              '[]'::json
            ) AS photos,
            (SELECT bool_or(a.is_duplicate)
               FROM forest_plant_timeline_assets a
              WHERE a.timeline_id = tl.id AND a.is_active = TRUE) AS has_dup_photo
       FROM forest_plant_timelines tl
       LEFT JOIN tree_status_master st ON st.id = tl.status_id
      WHERE tl.plant_id = $1 AND tl.is_active = TRUE
      ORDER BY tl.timeline_date ASC NULLS LAST, tl.id ASC`,
    [treeId],
  );

  const wd = tree.wood_density != null ? Number(tree.wood_density) : 0.6;
  let prevStock = 0;
  const visits = v.rows.map((r) => {
    const height = r.height != null ? Number(r.height) : null;
    const diameter = r.diameter != null ? Number(r.diameter) : null;
    const dead = r.status_id === 4;
    // Dead trees freeze stock at the last living value (no further sequestration).
    const stockKg = dead
      ? prevStock
      : height != null && diameter != null
        ? treeCo2eKg(wd, diameter, height)
        : prevStock;
    const deltaKg = Math.round((stockKg - prevStock) * 1000) / 1000;
    prevStock = stockKg;
    return {
      id: r.id,
      date: r.timeline_date,
      status: r.status,
      status_id: r.status_id,
      height,
      diameter,
      age: r.age != null ? Number(r.age) : null,
      lat: r.latitude ? Number(r.latitude) : null,
      lng: r.longitude ? Number(r.longitude) : null,
      photos: Array.isArray(r.photos) ? r.photos : [],
      co2e_kg: Math.round(stockKg * 1000) / 1000,
      co2e_delta_kg: deltaKg,
      geo_suspect: Boolean(r.geo_suspect),
      photo_duplicate: Boolean(r.has_dup_photo),
    };
  });

  const latest = visits[visits.length - 1];
  const first = visits[0];
  const latestStatusId = latest?.status_id ?? null;
  // tree_status_master: 1 Healthy, 2 Drying, 3 Damaged, 4 Dead.
  const survival =
    latestStatusId === 4 ? 'dead' : visits.length > 0 ? 'alive' : 'unknown';
  const growthCm =
    first?.height != null && latest?.height != null
      ? Math.round((latest.height - first.height) * 100)
      : null;
  // No monitoring visits yet (imported / day-zero trees): fall back to the tree row
  // so the proof page matches the map/forest view instead of showing zeros. Honest —
  // a planted baseline, explicitly NOT a verified-over-time record (baseline_only flag).
  const hasVisits = visits.length > 0;
  const rowH = tree.forest_tree_height != null ? Number(tree.forest_tree_height) : null;
  const rowD = tree.forest_tree_dia != null ? Number(tree.forest_tree_dia) : null;
  const rowDead = tree.tree_status_id === 4;
  const baselineKg =
    !rowDead && rowH != null && rowD != null && rowH > 0 && rowD > 0 ? treeCo2eKg(wd, rowD, rowH) : 0;
  const stockKg = hasVisits ? (latest?.co2e_kg ?? 0) : baselineKg;
  const effHeight = hasVisits ? (latest?.height ?? null) : rowH;
  const effStatus = hasVisits ? (latest?.status ?? tree.status ?? null) : tree.status ?? null;
  const effSurvival = hasVisits ? survival : rowDead ? 'dead' : rowH != null ? 'alive' : 'unknown';

  res.json({
    data: {
      tree: {
        id: tree.id,
        tree_unique_id: tree.tree_unique_id,
        species: tree.species,
        species_name: tree.species_name,
        forest_id: tree.forest_id,
        forest_name: tree.forest_name,
        forest_unique_id: tree.forest_unique_id,
        city: tree.city,
        state: tree.state,
        planted_on: tree.planted_on,
        lat: tree.lat ? Number(tree.lat) : null,
        lng: tree.lng ? Number(tree.lng) : null,
        is_demo: Boolean(tree.is_demo),
        gifted_to: tree.gifted_to,
      },
      summary: {
        survival: effSurvival,
        visit_count: visits.length,
        baseline_only: !hasVisits,
        latest_status: effStatus,
        latest_height: effHeight,
        growth_cm: growthCm,
        last_seen: latest?.date ?? null,
        // Carbon: estimated, verification-ready removal — NOT an issued credit.
        co2e_kg: Math.round(stockKg * 1000) / 1000,
        co2e_net_kg: Math.round(netCo2eKg(stockKg) * 1000) / 1000,
        oxygen_kg: Math.round(oxygenKg(stockKg) * 1000) / 1000,
        carbon_method: CARBON_METHOD,
        carbon_label: 'estimated / verification-ready removal',
        // Integrity / trust signals.
        verification: {
          // Only a positive signal when photos actually exist AND none recycled —
          // a tree with zero photos must NOT show a green "verified unique" badge.
          photos_unique:
            visits.some((x) => x.photos.length > 0) && !visits.some((x) => x.photo_duplicate),
          gps_consistent: !visits.some((x) => x.geo_suspect),
          monitored: visits.length >= 2,
        },
      },
      visits,
    },
  });
}

/**
 * GET /public/carbon — platform-wide carbon summary: total verification-ready
 * removals across all geo-tagged, surviving trees (gross + net of buffer +
 * uncertainty), computed from the latest measured visit per tree via allometry.
 * These are ESTIMATES, not issued credits.
 */
async function carbonSummary(_req: Request, res: Response): Promise<void> {
  // Latest visit per tree with measured dbh/height, joined to species wood density.
  const rows = await query<{
    height: number | null;
    diameter: number | null;
    status_id: number | null;
    wood_density: number | null;
  }>(
    `SELECT DISTINCT ON (tl.plant_id)
            tl.height, tl.diameter, ft.tree_status_id AS status_id, sp.wood_density
       FROM forest_plant_timelines tl
       JOIN forest_trees ft ON ft.id = tl.plant_id AND ft.is_active = TRUE
       LEFT JOIN master_plantspecies sp ON sp.id = ft.master_plant_species_id
      WHERE tl.is_active = TRUE
        AND tl.height IS NOT NULL AND tl.diameter IS NOT NULL
      ORDER BY tl.plant_id, tl.timeline_date DESC NULLS LAST, tl.id DESC`,
  );

  let grossKg = 0;
  let measured = 0;
  for (const r of rows.rows) {
    if (r.status_id === 4) continue; // dead: excluded from live stock
    const h = r.height != null ? Number(r.height) : null;
    const d = r.diameter != null ? Number(r.diameter) : null;
    const wd = r.wood_density != null ? Number(r.wood_density) : 0.6;
    if (h != null && d != null) {
      grossKg += treeCo2eKg(wd, d, h);
      measured += 1;
    }
  }

  // Estimated removals across ALL living, geo-tagged trees (latest known dimensions —
  // the tree row when there is no monitoring visit). This is the planted-to-date
  // estimate; kept SEPARATE from the verified/monitored figures above (integrity).
  const planted = await query<{
    height: number | null;
    diameter: number | null;
    wood_density: number | null;
    status_id: number | null;
  }>(
    `SELECT ft.forest_tree_height AS height, ft.forest_tree_dia AS diameter,
            sp.wood_density, ft.tree_status_id AS status_id
       FROM forest_trees ft
       LEFT JOIN master_plantspecies sp ON sp.id = ft.master_plant_species_id
      WHERE ft.is_active = TRUE AND ft.is_display = TRUE
        AND ft.forest_tree_geo_lat IS NOT NULL AND ft.forest_tree_geo_long IS NOT NULL`,
  );
  let plantedKg = 0;
  let plantedTrees = 0;
  for (const r of planted.rows) {
    if (r.status_id === 4) continue; // dead excluded
    const h = r.height != null ? Number(r.height) : null;
    const d = r.diameter != null ? Number(r.diameter) : null;
    const wd = r.wood_density != null ? Number(r.wood_density) : 0.6;
    if (h != null && d != null && h > 0 && d > 0) {
      plantedKg += treeCo2eKg(wd, d, h);
      plantedTrees += 1;
    }
  }

  const a = await query<{
    root_hash: string;
    ledger_rows: number | null;
    ots_status: string | null;
    anchored_at: string | null;
  }>(
    `SELECT root_hash, ledger_rows, ots_status, anchored_at
       FROM carbon_anchors ORDER BY anchored_at DESC LIMIT 1`,
  );
  const anchor = a.rows[0]
    ? {
        root_hash: a.rows[0].root_hash,
        ledger_rows: a.rows[0].ledger_rows,
        status: a.rows[0].ots_status,
        anchored_at: a.rows[0].anchored_at,
      }
    : null;

  res.json({
    data: {
      measured_trees: measured,
      gross_tco2e: Math.round((grossKg / 1000) * 1000) / 1000,
      net_tco2e: Math.round((netCo2eKg(grossKg) / 1000) * 1000) / 1000,
      oxygen_kg: Math.round(oxygenKg(grossKg)),
      planted_trees: plantedTrees,
      estimated_planted_tco2e: Math.round((plantedKg / 1000) * 1000) / 1000,
      estimated_planted_oxygen_kg: Math.round(oxygenKg(plantedKg)),
      buffer_pct: BUFFER_PCT,
      uncertainty_pct: UNCERTAINTY_PCT,
      method: CARBON_METHOD,
      label: 'estimated / verification-ready removals — not issued credits',
      anchor,
    },
  });
}

/**
 * GET /public/sponsors — active sponsors (name + logo + site) for the public
 * "backed by" marquee. Public-safe fields only.
 */
async function sponsorsPublic(_req: Request, res: Response): Promise<void> {
  const rows = await query<{
    sponsor_name: string | null;
    sponsor_logo: string | null;
    website_url: string | null;
  }>(
    `SELECT sponsor_name, sponsor_logo, website_url
       FROM sponsors
      WHERE is_active = TRUE
      ORDER BY sponsor_name`,
  );
  res.json({
    data: rows.rows.map((s) => ({
      name: s.sponsor_name,
      logo: s.sponsor_logo,
      website: s.website_url,
    })),
  });
}

/** 6-decimal WGS84 (EUDR-grade precision). */
function r6(v: string | number | null): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 1e6) / 1e6 : null;
}

/**
 * GET /public/forests.geojson — RFC 7946 FeatureCollection (WGS84, lon/lat,
 * 6-decimal). Open, standards-based export so any GIS / registry / EUDR tool
 * can ingest our forests. Addresses the "fragmented standards" landscape gap.
 */
async function forestsGeoJSON(_req: Request, res: Response): Promise<void> {
  const rows = await query<Record<string, unknown>>(
    `SELECT f.id, f.forest_name, f.forest_unique_id, f.forest_geo_lat, f.forest_geo_long,
            f.forest_city, f.forest_state, f.forest_country, f.forest_boundary,
            COUNT(t.id) FILTER (WHERE t.is_active = TRUE) AS total_trees,
            COUNT(t.id) FILTER (WHERE t.is_active = TRUE AND t.forest_tree_geo_lat IS NOT NULL) AS tagged_trees
       FROM forests f
       LEFT JOIN forest_trees t ON t.forest_id = f.id
      WHERE f.is_active = TRUE AND f.forest_geo_lat IS NOT NULL AND f.forest_geo_long IS NOT NULL
      GROUP BY f.id ORDER BY f.forest_name`,
  );
  const fc = {
    type: 'FeatureCollection',
    features: rows.rows
      .map((r) => {
        const lng = r6(r.forest_geo_long as string);
        const lat = r6(r.forest_geo_lat as string);
        if (lng == null || lat == null) return null;
        // Polygon when a boundary is set (EUDR), else a centre Point.
        let geometry: { type: string; coordinates: unknown } = { type: 'Point', coordinates: [lng, lat] };
        let bd = r.forest_boundary as unknown;
        if (typeof bd === 'string') { try { bd = JSON.parse(bd); } catch { bd = null; } }
        if (Array.isArray(bd) && bd.length >= 3) {
          const ring = bd
            .map((p: Record<string, unknown>) => [r6(p.lng as number), r6(p.lat as number)])
            .filter((c) => c[0] != null && c[1] != null) as number[][];
          if (ring.length >= 3) {
            if (ring[0]![0] !== ring[ring.length - 1]![0] || ring[0]![1] !== ring[ring.length - 1]![1]) {
              ring.push([ring[0]![0]!, ring[0]![1]!]);
            }
            geometry = { type: 'Polygon', coordinates: [ring] };
          }
        }
        return {
          type: 'Feature',
          geometry,
          properties: {
            id: r.id,
            name: r.forest_name,
            unique_id: r.forest_unique_id,
            city: r.forest_city,
            state: r.forest_state,
            country: r.forest_country,
            total_trees: Number(r.total_trees),
            tagged_trees: Number(r.tagged_trees),
          },
        };
      })
      .filter(Boolean),
  };
  res.type('application/geo+json').json(fc);
}

/** GET /public/forest/:id/trees.geojson — geo-tagged trees of one forest. */
async function forestTreesGeoJSON(req: Request, res: Response): Promise<void> {
  const forestId = String(req.params.id);
  const rows = await query<Record<string, unknown>>(
    `SELECT ft.tree_unique_id, ft.forest_tree_geo_lat AS lat, ft.forest_tree_geo_long AS lng,
            COALESCE(sp.common_name, sp.species_name) AS species, ft.planted_on
       FROM forest_trees ft
       LEFT JOIN master_plantspecies sp ON sp.id = ft.master_plant_species_id
      WHERE ft.forest_id = $1 AND ft.is_active = TRUE AND ft.is_display = TRUE
        AND ft.forest_tree_geo_lat IS NOT NULL AND ft.forest_tree_geo_long IS NOT NULL
      LIMIT 10000`,
    [forestId],
  );
  const fc = {
    type: 'FeatureCollection',
    features: rows.rows
      .map((r) => {
        const lng = r6(r.lng as string);
        const lat = r6(r.lat as string);
        if (lng == null || lat == null) return null;
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lng, lat] },
          properties: { tree_unique_id: r.tree_unique_id, species: r.species, planted_on: r.planted_on },
        };
      })
      .filter(Boolean),
  };
  res.type('application/geo+json').json(fc);
}

/**
 * GET /public/sponsor/:id — sponsor microsite data: brand + their forests +
 * aggregate impact (trees, survival %, verification-ready tCO2e). "Here is YOUR
 * forest" for a CSR client.
 */
async function sponsorMicrosite(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);
  if (!UUID_RE.test(id)) throw notFound('Sponsor not found');
  const s = await query<{
    sponsor_name: string | null;
    sponsor_logo: string | null;
    website_url: string | null;
    industry: string | null;
    headquarters: string | null;
  }>(
    `SELECT sponsor_name, sponsor_logo, website_url, industry, headquarters
       FROM sponsors WHERE id = $1 AND is_active = TRUE LIMIT 1`,
    [id],
  );
  if (s.rowCount === 0) throw notFound('Sponsor not found');

  const forests = await query<Record<string, unknown>>(
    `SELECT f.id, f.forest_name, f.forest_unique_id, f.forest_city, f.forest_state,
            f.forest_geo_lat, f.forest_geo_long,
            COUNT(t.id) FILTER (WHERE t.is_active = TRUE) AS total_trees,
            COUNT(t.id) FILTER (WHERE t.is_active = TRUE AND t.forest_tree_geo_lat IS NOT NULL) AS tagged_trees,
            COUNT(t.id) FILTER (WHERE t.is_active = TRUE AND COALESCE(t.tree_status_id,1) <> 4) AS alive_trees
       FROM forests f
       JOIN forest_sponsors fs ON fs.forest_id = f.id AND fs.sponsor_id = $1 AND fs.is_active = TRUE
       LEFT JOIN forest_trees t ON t.forest_id = f.id
      WHERE f.is_active = TRUE
      GROUP BY f.id ORDER BY f.forest_name`,
    [id],
  );

  // Verification-ready tCO2e across this sponsor's forests (latest measured visit per tree).
  const co2 = await query<{ wood_density: number | null; height: number | null; diameter: number | null; status_id: number | null }>(
    `SELECT DISTINCT ON (tl.plant_id) sp.wood_density, tl.height, tl.diameter, ft.tree_status_id AS status_id
       FROM forest_plant_timelines tl
       JOIN forest_trees ft ON ft.id = tl.plant_id AND ft.is_active = TRUE
       JOIN forest_sponsors fs ON fs.forest_id = ft.forest_id AND fs.sponsor_id = $1 AND fs.is_active = TRUE
       LEFT JOIN master_plantspecies sp ON sp.id = ft.master_plant_species_id
      WHERE tl.is_active = TRUE
        AND tl.height IS NOT NULL AND tl.diameter IS NOT NULL
      ORDER BY tl.plant_id, tl.timeline_date DESC NULLS LAST, tl.id DESC`,
    [id],
  );
  let grossKg = 0;
  for (const r of co2.rows) {
    if (r.status_id === 4) continue;
    const h = r.height != null ? Number(r.height) : null;
    const d = r.diameter != null ? Number(r.diameter) : null;
    const wd = r.wood_density != null ? Number(r.wood_density) : 0.6;
    if (h != null && d != null) grossKg += treeCo2eKg(wd, d, h);
  }

  const f = forests.rows.map((r) => {
    const total = Number(r.total_trees);
    const alive = Number(r.alive_trees);
    return {
      id: r.id,
      name: r.forest_name,
      unique_id: r.forest_unique_id,
      city: r.forest_city,
      state: r.forest_state,
      lat: r.forest_geo_lat ? Number(r.forest_geo_lat) : null,
      lng: r.forest_geo_long ? Number(r.forest_geo_long) : null,
      total_trees: total,
      tagged_trees: Number(r.tagged_trees),
      alive_trees: alive,
      survival_pct: total > 0 ? Math.round((alive / total) * 1000) / 10 : null,
    };
  });
  const totals = f.reduce(
    (a, x) => ({ trees: a.trees + x.total_trees, alive: a.alive + x.alive_trees, tagged: a.tagged + x.tagged_trees }),
    { trees: 0, alive: 0, tagged: 0 },
  );
  res.json({
    data: {
      sponsor: {
        name: s.rows[0]!.sponsor_name,
        logo: s.rows[0]!.sponsor_logo,
        website: s.rows[0]!.website_url,
        industry: s.rows[0]!.industry,
        headquarters: s.rows[0]!.headquarters,
      },
      forests: f,
      totals: {
        forests: f.length,
        trees: totals.trees,
        alive: totals.alive,
        tagged: totals.tagged,
        survival_pct: totals.trees > 0 ? Math.round((totals.alive / totals.trees) * 1000) / 10 : null,
        gross_tco2e: Math.round((grossKg / 1000) * 1000) / 1000,
        net_tco2e: Math.round((netCo2eKg(grossKg) / 1000) * 1000) / 1000,
        oxygen_kg: Math.round(oxygenKg(grossKg)),
      },
    },
  });
}

/** GET /public/sponsor/:id/report.csv — ESG-ready per-forest CSV for a sponsor. */
async function sponsorReportCsv(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);
  if (!UUID_RE.test(id)) throw notFound('Sponsor not found');
  const rows = await query<Record<string, unknown>>(
    `SELECT f.forest_name, f.forest_unique_id, f.forest_city, f.forest_state,
            COUNT(t.id) FILTER (WHERE t.is_active = TRUE) AS total_trees,
            COUNT(t.id) FILTER (WHERE t.is_active = TRUE AND t.forest_tree_geo_lat IS NOT NULL) AS tagged_trees,
            COUNT(t.id) FILTER (WHERE t.is_active = TRUE AND COALESCE(t.tree_status_id,1) <> 4) AS alive_trees
       FROM forests f
       JOIN forest_sponsors fs ON fs.forest_id = f.id AND fs.sponsor_id = $1 AND fs.is_active = TRUE
       LEFT JOIN forest_trees t ON t.forest_id = f.id
      WHERE f.is_active = TRUE GROUP BY f.id ORDER BY f.forest_name`,
    [id],
  );
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = 'forest,unique_id,city,state,trees,tagged,alive,survival_pct';
  const lines = rows.rows.map((r) => {
    const total = Number(r.total_trees);
    const alive = Number(r.alive_trees);
    const surv = total > 0 ? Math.round((alive / total) * 1000) / 10 : 0;
    return [r.forest_name, r.forest_unique_id, r.forest_city, r.forest_state, total, Number(r.tagged_trees), alive, surv]
      .map(esc).join(',');
  });
  res.type('text/csv').send([head, ...lines].join('\n') + '\n');
}

/** Polygon area in hectares (equirectangular shoelace — fine at forest scale). */
function areaHa(pts: { lat: number; lng: number }[]): number {
  if (pts.length < 3) return 0;
  const R = 6378137;
  const rad = (x: number) => (x * Math.PI) / 180;
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    const q = pts[(i + 1) % pts.length]!;
    const xi = R * rad(p.lng) * Math.cos(rad(p.lat));
    const yi = R * rad(p.lat);
    const xj = R * rad(q.lng) * Math.cos(rad(q.lat));
    const yj = R * rad(q.lat);
    a += xi * yj - xj * yi;
  }
  return Math.round((Math.abs(a / 2) / 10000) * 100) / 100;
}

/**
 * GET /public/leaderboard — sponsors ranked by trees, with survival % — the
 * public "survival index" (trust benchmark of the sector).
 */
async function leaderboard(_req: Request, res: Response): Promise<void> {
  const rows = await query<Record<string, unknown>>(
    `SELECT s.id, s.sponsor_name, s.sponsor_logo,
            COUNT(DISTINCT f.id) AS forests,
            COUNT(DISTINCT t.id) FILTER (WHERE t.is_active = TRUE) AS trees,
            COUNT(DISTINCT t.id) FILTER (WHERE t.is_active = TRUE AND COALESCE(t.tree_status_id,1) <> 4) AS alive
       FROM sponsors s
       JOIN forest_sponsors fs ON fs.sponsor_id = s.id AND fs.is_active = TRUE
       JOIN forests f ON f.id = fs.forest_id AND f.is_active = TRUE
       LEFT JOIN forest_trees t ON t.forest_id = f.id
      WHERE s.is_active = TRUE
      GROUP BY s.id
      ORDER BY trees DESC, s.sponsor_name`,
  );
  res.json({
    data: rows.rows.map((r) => {
      const trees = Number(r.trees);
      const alive = Number(r.alive);
      return {
        id: r.id,
        name: r.sponsor_name,
        logo: r.sponsor_logo,
        forests: Number(r.forests),
        trees,
        alive,
        survival_pct: trees > 0 ? Math.round((alive / trees) * 1000) / 10 : null,
      };
    }),
  });
}

/** GET /public/forest/:id/boundary — boundary polygon + area (ha) for map render. */
async function forestBoundaryPublic(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);
  // Malformed (non-uuid) id → empty boundary, never a 500 from the uuid cast.
  if (!UUID_RE.test(id)) { res.json({ data: { boundary: [], area_ha: null } }); return; }
  const r = await query<{ forest_boundary: unknown }>(
    `SELECT forest_boundary FROM forests WHERE id = $1 AND is_active = TRUE LIMIT 1`,
    [id],
  );
  let bd = r.rows[0]?.forest_boundary as unknown;
  if (typeof bd === 'string') { try { bd = JSON.parse(bd); } catch { bd = null; } }
  const pts = Array.isArray(bd)
    ? (bd as Array<Record<string, unknown>>)
        .map((p) => ({ lat: Number(p.lat), lng: Number(p.lng) }))
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
    : [];
  res.json({ data: { boundary: pts, area_ha: pts.length >= 3 ? areaHa(pts) : null } });
}

/**
 * GET /public/forest/:id/panoramas — the "Walk the forest" 360 tour links for a
 * forest. Experiential, not proof. Returns only allowlisted external embed URLs
 * (the UI labels them "an experience, not a verified measurement"). Demo/sample
 * tours are labelled as such by the admin who adds them, not hidden.
 */
async function forestPanoramasPublic(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);
  if (!UUID_RE.test(id)) throw notFound('Forest not found');
  const exists = await query(
    `SELECT 1 FROM forests WHERE id = $1 AND is_active = TRUE`,
    [id],
  );
  if (exists.rowCount === 0) throw notFound('Forest not found');
  const rows = await query<{ id: number; label: string | null; provider: string | null; embed_url: string; captured_on: string | null }>(
    `SELECT id, label, provider, embed_url, captured_on
       FROM forest_panoramas
      WHERE forest_id = $1 AND is_active = TRUE
      ORDER BY captured_on DESC NULLS LAST, id`,
    [id],
  );
  res.json({
    data: rows.rows
      .filter((r) => isAllowedPanoUrl(r.embed_url)) // defense-in-depth at read
      .map((r) => ({ id: r.id, label: r.label, provider: r.provider, embed_url: r.embed_url, captured_on: r.captured_on })),
  });
}

/**
 * GET /public/forest/:id/scenes — the full interactive 360 tour in one payload:
 * scenes (equirect image + default view), each with its tree hotspots (JOINed to
 * tree_unique_id/species/status for the marker) and navigation links. Field-
 * whitelisted (no internal ids/PII). Scenes with an invalid/disallowed image_url
 * are skipped (defense-in-depth via isAllowedPanoUrl).
 */
async function forestScenesPublic(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);
  if (!UUID_RE.test(id)) throw notFound('Forest not found');
  const exists = await query(`SELECT 1 FROM forests WHERE id = $1 AND is_active = TRUE`, [id]);
  if (exists.rowCount === 0) throw notFound('Forest not found');

  const scenes = await query<{
    id: number; label: string | null; image_url: string;
    lat: number | null; lng: number | null;
    default_yaw: number; default_pitch: number; display_order: number; is_demo: boolean;
  }>(
    `SELECT id, label, image_url, lat, lng, default_yaw, default_pitch, display_order, is_demo
       FROM forest_scenes
      WHERE forest_id = $1 AND is_active = TRUE
      ORDER BY display_order, id`,
    [id],
  );
  const sceneIds = scenes.rows.map((s) => s.id);
  if (sceneIds.length === 0) {
    res.json({ data: { scenes: [] } });
    return;
  }

  const hotspots = await query<{
    scene_id: number; tree_id: string; yaw: number; pitch: number;
    tree_unique_id: string | null; species: string | null; status_id: number | null; status: string | null;
  }>(
    `SELECT h.scene_id, h.tree_id, h.yaw, h.pitch,
            ft.tree_unique_id, COALESCE(sp.common_name, sp.species_name) AS species,
            COALESCE(ft.tree_status_id, 1) AS status_id, st.status
       FROM scene_hotspots h
       JOIN forest_trees ft ON ft.id = h.tree_id AND ft.is_active = TRUE
       LEFT JOIN master_plantspecies sp ON sp.id = ft.master_plant_species_id
       LEFT JOIN tree_status_master st ON st.id = ft.tree_status_id
      WHERE h.scene_id = ANY($1::int[]) AND h.is_active = TRUE`,
    [sceneIds],
  );
  const links = await query<{ from_scene_id: number; to_scene_id: number; yaw: number; pitch: number; label: string | null }>(
    `SELECT from_scene_id, to_scene_id, yaw, pitch, label
       FROM scene_links
      WHERE from_scene_id = ANY($1::int[]) AND is_active = TRUE`,
    [sceneIds],
  );

  const hsByScene = new Map<number, unknown[]>();
  for (const h of hotspots.rows) {
    if (!hsByScene.has(h.scene_id)) hsByScene.set(h.scene_id, []);
    hsByScene.get(h.scene_id)!.push({
      tree_id: h.tree_id, tree_unique_id: h.tree_unique_id, species: h.species,
      status_id: h.status_id, status: h.status,
      survival: h.status_id === 4 ? 'dead' : 'alive', yaw: h.yaw, pitch: h.pitch,
    });
  }
  const lnByScene = new Map<number, unknown[]>();
  for (const l of links.rows) {
    if (!lnByScene.has(l.from_scene_id)) lnByScene.set(l.from_scene_id, []);
    lnByScene.get(l.from_scene_id)!.push({ to_scene_id: l.to_scene_id, yaw: l.yaw, pitch: l.pitch, label: l.label });
  }

  res.json({
    data: {
      scenes: scenes.rows
        .filter((s) => isAllowedPanoUrl(s.image_url))
        .map((s) => ({
          id: s.id, label: s.label, image_url: s.image_url,
          lat: s.lat, lng: s.lng, default_yaw: s.default_yaw, default_pitch: s.default_pitch,
          is_demo: s.is_demo,
          hotspots: hsByScene.get(s.id) ?? [],
          links: lnByScene.get(s.id) ?? [],
        })),
    },
  });
}

async function serveSceneImage(req: Request, res: Response): Promise<void> {
  const id = parseInt(String(req.params.file).replace(/\.(jpe?g|png|webp)$/i, ''), 10);
  if (!Number.isInteger(id) || id <= 0) throw notFound('image not found');
  const r = await query<{ mime: string; bytes: Buffer }>(
    `SELECT mime, bytes FROM scene_images WHERE id = $1`,
    [id],
  );
  if (r.rowCount === 0) throw notFound('image not found');
  res.setHeader('Content-Type', r.rows[0]!.mime || 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.send(r.rows[0]!.bytes);
}

publicRouter.get('/public/sponsors', wrap(sponsorsPublic));
publicRouter.get('/public/leaderboard', wrap(leaderboard));
publicRouter.get('/public/forest/:id/boundary', wrap(forestBoundaryPublic));
publicRouter.get('/public/sponsor/:id', wrap(sponsorMicrosite));
publicRouter.get('/public/sponsor/:id/report.csv', wrap(sponsorReportCsv));
publicRouter.get('/public/forests.geojson', wrap(forestsGeoJSON));
publicRouter.get('/public/forest/:id/trees.geojson', wrap(forestTreesGeoJSON));
publicRouter.get('/public/forests-map', wrap(forestsMap));
publicRouter.get('/public/forest/:id/trees', wrap(forestTreesPublic));
publicRouter.get('/public/forest/:id/panoramas', wrap(forestPanoramasPublic));
publicRouter.get('/public/forest/:id/scenes', wrap(forestScenesPublic));
/**
 * GET /public/lookup?q= — resolve a tree (by UUID or tree_unique_id) or a
 * forest (by unique id / name) for the public Verify search. Returns the type
 * + id to route to, or null.
 */
async function lookup(req: Request, res: Response): Promise<void> {
  const q = String(req.query.q ?? '').trim();
  if (!q) {
    res.json({ data: null });
    return;
  }
  if (UUID_RE.test(q)) {
    const t = await query<{ id: string }>(
      `SELECT id FROM forest_trees WHERE id = $1 AND is_active = TRUE LIMIT 1`,
      [q],
    );
    if (t.rowCount) {
      res.json({ data: { type: 'tree', id: t.rows[0]!.id } });
      return;
    }
  }
  const tu = await query<{ id: string }>(
    `SELECT id FROM forest_trees WHERE tree_unique_id ILIKE $1 AND is_active = TRUE LIMIT 1`,
    [q],
  );
  if (tu.rowCount) {
    res.json({ data: { type: 'tree', id: tu.rows[0]!.id } });
    return;
  }
  const f = await query<{ id: string; forest_name: string | null }>(
    `SELECT id, forest_name FROM forests
      WHERE (forest_unique_id ILIKE $1 OR forest_name ILIKE $2) AND is_active = TRUE
      ORDER BY forest_name LIMIT 1`,
    [q, `%${q}%`],
  );
  if (f.rowCount) {
    res.json({ data: { type: 'forest', id: f.rows[0]!.id, name: f.rows[0]!.forest_name } });
    return;
  }
  res.json({ data: null });
}

publicRouter.get('/public/scene-image/:file', wrap(serveSceneImage));
publicRouter.get('/public/tree/:id', wrap(treeProof));
publicRouter.get('/public/carbon', wrap(carbonSummary));
publicRouter.get('/public/lookup', wrap(lookup));
