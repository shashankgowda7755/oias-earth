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
import { treeCo2eKg, netCo2eKg, CARBON_METHOD, BUFFER_PCT, UNCERTAINTY_PCT } from '../lib/carbon';

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
    lat: string | null;
    lng: string | null;
    species: string | null;
  }>(
    `SELECT ft.id,
            ft.tree_unique_id,
            ft.forest_tree_geo_lat AS lat,
            ft.forest_tree_geo_long AS lng,
            COALESCE(sp.common_name, sp.species_name) AS species
       FROM forest_trees ft
       LEFT JOIN master_plantspecies sp ON sp.id = ft.master_plant_species_id
      WHERE ft.forest_id = $1 AND ft.is_active = TRUE AND ft.is_display = TRUE
        AND ft.forest_tree_geo_lat IS NOT NULL
        AND ft.forest_tree_geo_long IS NOT NULL
      LIMIT 5000`,
    [forestId],
  );

  res.json({
    data: rows.rows.map((t) => ({
      id: t.id,
      tree_unique_id: t.tree_unique_id,
      lat: t.lat ? Number(t.lat) : null,
      lng: t.lng ? Number(t.lng) : null,
      species: t.species,
    })),
  });
}

/**
 * GET /public/tree/:id — the per-tree PROOF-OF-LIFE page data. Base tree info +
 * the full longitudinal visit timeline (forest_plant_timelines) with photos,
 * plus a computed survival verdict and growth delta. This is the moat: not a
 * day-zero snapshot, but a life record anyone can verify, no login.
 */
async function treeProof(req: Request, res: Response): Promise<void> {
  const treeId = String(req.params.id);

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
    status: string | null;
    wood_density: number | null;
  }>(
    `SELECT ft.id, ft.tree_unique_id,
            COALESCE(sp.common_name, sp.species_name) AS species,
            sp.species_name,
            f.id AS forest_id, f.forest_name, f.forest_unique_id,
            f.forest_city AS city, f.forest_state AS state,
            ft.planted_on,
            ft.forest_tree_geo_lat AS lat, ft.forest_tree_geo_long AS lng,
            st.status, sp.wood_density
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
  const stockKg = latest?.co2e_kg ?? 0;

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
      },
      summary: {
        survival,
        visit_count: visits.length,
        latest_status: latest?.status ?? tree.status ?? null,
        latest_height: latest?.height ?? null,
        growth_cm: growthCm,
        last_seen: latest?.date ?? null,
        // Carbon: estimated, verification-ready removal — NOT an issued credit.
        co2e_kg: Math.round(stockKg * 1000) / 1000,
        co2e_net_kg: Math.round(netCo2eKg(stockKg) * 1000) / 1000,
        carbon_method: CARBON_METHOD,
        carbon_label: 'estimated / verification-ready removal',
        // Integrity / trust signals.
        verification: {
          photos_unique: !visits.some((x) => x.photo_duplicate),
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
            tl.height, tl.diameter, tl.status_id, sp.wood_density
       FROM forest_plant_timelines tl
       JOIN forest_trees ft ON ft.id = tl.plant_id AND ft.is_active = TRUE
       LEFT JOIN master_plantspecies sp ON sp.id = ft.master_plant_species_id
      WHERE tl.is_active = TRUE
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
  res.json({
    data: {
      measured_trees: measured,
      gross_tco2e: Math.round((grossKg / 1000) * 1000) / 1000,
      net_tco2e: Math.round((netCo2eKg(grossKg) / 1000) * 1000) / 1000,
      buffer_pct: BUFFER_PCT,
      uncertainty_pct: UNCERTAINTY_PCT,
      method: CARBON_METHOD,
      label: 'estimated / verification-ready removals — not issued credits',
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
            f.forest_city, f.forest_state, f.forest_country,
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
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lng, lat] },
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

publicRouter.get('/public/sponsors', wrap(sponsorsPublic));
publicRouter.get('/public/forests.geojson', wrap(forestsGeoJSON));
publicRouter.get('/public/forest/:id/trees.geojson', wrap(forestTreesGeoJSON));
publicRouter.get('/public/forests-map', wrap(forestsMap));
publicRouter.get('/public/forest/:id/trees', wrap(forestTreesPublic));
publicRouter.get('/public/tree/:id', wrap(treeProof));
publicRouter.get('/public/carbon', wrap(carbonSummary));
