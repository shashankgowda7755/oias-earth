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
  }>(
    `SELECT f.id, f.forest_name, f.forest_unique_id,
            f.forest_geo_lat, f.forest_geo_long,
            f.forest_city, f.forest_state, f.forest_country,
            COUNT(t.id) FILTER (WHERE t.is_active = TRUE) AS total_trees,
            COUNT(t.id) FILTER (WHERE t.is_active = TRUE
                   AND t.forest_tree_geo_lat IS NOT NULL
                   AND t.forest_tree_geo_long IS NOT NULL) AS tagged_trees
       FROM forests f
       LEFT JOIN forest_trees t ON t.forest_id = f.id
      WHERE f.is_active = TRUE
        AND f.forest_geo_lat IS NOT NULL AND f.forest_geo_long IS NOT NULL
      GROUP BY f.id
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
  }>(
    `SELECT ft.id, ft.tree_unique_id,
            COALESCE(sp.common_name, sp.species_name) AS species,
            sp.species_name,
            f.id AS forest_id, f.forest_name, f.forest_unique_id,
            f.forest_city AS city, f.forest_state AS state,
            ft.planted_on,
            ft.forest_tree_geo_lat AS lat, ft.forest_tree_geo_long AS lng,
            st.status
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
  }>(
    `SELECT tl.id, tl.timeline_date, st.status, tl.status_id,
            tl.height, tl.diameter, tl.age, tl.latitude, tl.longitude,
            COALESCE(
              (SELECT json_agg(a.url ORDER BY a."order")
                 FROM forest_plant_timeline_assets a
                WHERE a.timeline_id = tl.id AND a.is_active = TRUE
                  AND a.url IS NOT NULL),
              '[]'::json
            ) AS photos
       FROM forest_plant_timelines tl
       LEFT JOIN tree_status_master st ON st.id = tl.status_id
      WHERE tl.plant_id = $1 AND tl.is_active = TRUE
      ORDER BY tl.timeline_date ASC NULLS LAST, tl.id ASC`,
    [treeId],
  );

  const visits = v.rows.map((r) => ({
    id: r.id,
    date: r.timeline_date,
    status: r.status,
    status_id: r.status_id,
    height: r.height != null ? Number(r.height) : null,
    diameter: r.diameter != null ? Number(r.diameter) : null,
    age: r.age != null ? Number(r.age) : null,
    lat: r.latitude ? Number(r.latitude) : null,
    lng: r.longitude ? Number(r.longitude) : null,
    photos: Array.isArray(r.photos) ? r.photos : [],
  }));

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
      },
      visits,
    },
  });
}

publicRouter.get('/public/forests-map', wrap(forestsMap));
publicRouter.get('/public/forest/:id/trees', wrap(forestTreesPublic));
publicRouter.get('/public/tree/:id', wrap(treeProof));
