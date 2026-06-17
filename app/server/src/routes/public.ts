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
    tree_unique_id: string | null;
    lat: string | null;
    lng: string | null;
    species: string | null;
  }>(
    `SELECT ft.tree_unique_id,
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
      tree_unique_id: t.tree_unique_id,
      lat: t.lat ? Number(t.lat) : null,
      lng: t.lng ? Number(t.lng) : null,
      species: t.species,
    })),
  });
}

publicRouter.get('/public/forests-map', wrap(forestsMap));
publicRouter.get('/public/forest/:id/trees', wrap(forestTreesPublic));
