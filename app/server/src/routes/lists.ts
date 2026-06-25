/**
 * List + search endpoints. All are POST and take {page, limit, search?} in the
 * body. Response shapes reproduce rest_list_shapes.json EXACTLY:
 *
 *   POST /api/v1/users/list                -> {data, pagination}      (rows JOIN role)
 *   POST /api/v1/roles/list                -> {data, pagination}      (rows {id,name})
 *   POST /api/v1/sponsors/list             -> {data, pagination}
 *   POST /api/v1/employee/list             -> {data, total, page, limit}  (flat!)
 *   POST /api/v1/forest/list               -> {data, pagination}      (sponsors[] + created_by/updated_by nested)
 *   POST /api/v1/reports/list              -> {data, pagination, filter_limit}  (Forest/CreatedBy/UpdatedBy nested)
 *   POST /api/v1/jobs/list                 -> {data, pagination}
 *   POST /api/v1/master-plantspecies/search-> {data, pagination}      (species catalog)
 *
 * Search is a server-side ILIKE on the entity's primary name column (spec marks
 * exact search field as an open question; name-column ILIKE is the faithful
 * best-effort). Pagination is real LIMIT/OFFSET.
 */
import { Router, type Request, type Response, type NextFunction } from 'express';
import { query } from '../db';
import { parsePageParams, countTotal } from './helpers';

export const listRouter = Router();

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

/** Wrap an async handler so thrown errors hit the central error middleware. */
const wrap =
  (fn: Handler): Handler =>
  async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (err) {
      next(err);
    }
  };

/* ----------------------------- audit/list ---------------------------- */
// Most-recent-first activity log: logins + every data mutation. Optional
// `category` segregates the views: login | forest | report | download | send.
const AUDIT_CATEGORY_SQL: Record<string, string> = {
  login: `action ILIKE 'auth.%'`,
  forest: `entity = 'forest'`,
  download: `action ILIKE '%download%'`,
  send: `action ILIKE '%send%'`,
  report: `entity = 'report' AND action NOT ILIKE '%send%' AND action NOT ILIKE '%download%'`,
};
listRouter.post(
  '/audit/list',
  wrap(async (req, res) => {
    const { limit, offset, page, search } = parsePageParams(req.body);
    const like = `%${search}%`;
    const category = typeof req.body?.category === 'string' ? req.body.category : '';
    const catClause = AUDIT_CATEGORY_SQL[category] ? ` AND (${AUDIT_CATEGORY_SQL[category]})` : '';
    const where = `FROM audit_log
      WHERE ($1 = '' OR action ILIKE $2 OR actor_name ILIKE $2 OR entity ILIKE $2 OR target_id ILIKE $2 OR ip ILIKE $2)${catClause}`;
    const params = [search, like];
    const total = await countTotal(where, params);
    const rows = await query(
      `SELECT id, ts, actor_name AS "actorName", role, action, entity,
              target_id AS "targetId", method, path, status, ip
       ${where} ORDER BY ts DESC LIMIT $3 OFFSET $4`,
      [...params, limit, offset],
    );
    res.json({ data: rows.rows, pagination: { total, page, limit } });
  }),
);

/* ----------------------------- users/list ---------------------------- */
// Joins user_profiles + user_roles + master_roles. Returns the observed mixed
// camel/snake shape. user_id (legacy int) is surfaced as `id` to match sample.
listRouter.post(
  '/users/list',
  wrap(async (req, res) => {
    const { limit, offset, page, search } = parsePageParams(req.body);
    const like = `%${search}%`;
    const where = `
      FROM user_profiles up
      JOIN user_roles ur ON ur.profile_id = up.id AND ur.is_active = TRUE
      JOIN master_roles mr ON mr.id = ur.role_id
      WHERE up.is_active = TRUE
        AND ($1 = '' OR up.first_name ILIKE $2 OR up.last_name ILIKE $2 OR up.username ILIKE $2)`;
    const params = [search, like];

    const total = await countTotal(where, params);
    const rows = await query(
      `SELECT
         COALESCE(up.user_id, 0)        AS "id",
         up.first_name                  AS "firstName",
         up.last_name                   AS "lastName",
         up.image_url                   AS "imageUrl",
         up.username                    AS "username",
         mr.name                        AS "role",
         mr.id                          AS "roleId",
         ur.id                          AS "user_role_id",
         up.email_id                    AS "email",
         up.mobile_no::text             AS "mobile"
       ${where}
       ORDER BY up.created_at DESC
       LIMIT $3 OFFSET $4`,
      [...params, limit, offset]
    );

    res.json({ data: rows.rows, pagination: { total, page, limit } });
  })
);

/* ----------------------------- roles/list ---------------------------- */
listRouter.post(
  '/roles/list',
  wrap(async (req, res) => {
    const { limit, offset, page, search } = parsePageParams(req.body);
    const like = `%${search}%`;
    const where = `FROM master_roles WHERE is_active = TRUE AND ($1 = '' OR name ILIKE $2)`;
    const params = [search, like];

    const total = await countTotal(where, params);
    const rows = await query(
      `SELECT id, name ${where} ORDER BY id ASC LIMIT $3 OFFSET $4`,
      [...params, limit, offset]
    );

    res.json({ data: rows.rows, pagination: { total, page, limit } });
  })
);

/* ---------------------------- sponsors/list -------------------------- */
listRouter.post(
  '/sponsors/list',
  wrap(async (req, res) => {
    const { limit, offset, page, search } = parsePageParams(req.body);
    const like = `%${search}%`;
    const where = `FROM sponsors WHERE is_active = TRUE AND ($1 = '' OR sponsor_name ILIKE $2)`;
    const params = [search, like];

    const total = await countTotal(where, params);
    const rows = await query(
      `SELECT
         id, sponsor_name, sponsor_email, sponsor_logo, is_active, sponsor_forest_logo,
         sponsor_tree_logo, sponsor_og_image_url, established_year, website_url,
         industry, headquarters, created_by, updated_by,
         created_at AS "createdAt", updated_at AS "updatedAt"
       ${where}
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [...params, limit, offset]
    );

    res.json({ data: rows.rows, pagination: { total, page, limit } });
  })
);

/* ---------------------------- employee/list -------------------------- */
// NOTE: flat pagination shape {data,total,page,limit} (legacy quirk; see types).
listRouter.post(
  '/employee/list',
  wrap(async (req, res) => {
    const { limit, offset, page, search } = parsePageParams(req.body);
    const like = `%${search}%`;
    const where = `FROM employees WHERE is_active = TRUE AND ($1 = '' OR name ILIKE $2)`;
    const params = [search, like];

    const total = await countTotal(where, params);
    const rows = await query(
      `SELECT
         id, name, profile_image, designation, contact_no, email_id,
         created_by, updated_by, is_active, created_at, updated_at
       ${where}
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [...params, limit, offset]
    );

    res.json({ data: rows.rows, total, page, limit });
  })
);

/* ----------------------------- forest/list -------------------------- */
// Nests sponsors[] (via forest_sponsors) and created_by/updated_by {id,first_name}.
listRouter.post(
  '/forest/list',
  wrap(async (req, res) => {
    const { limit, offset, page, search } = parsePageParams(req.body);
    const like = `%${search}%`;
    const where = `FROM forests f WHERE f.is_active = TRUE AND ($1 = '' OR f.forest_name ILIKE $2)`;
    const params = [search, like];

    const total = await countTotal(where, params);
    const rows = await query(
      `SELECT
         f.id,
         f.forest_name,
         f.forest_geo_lat,
         f.forest_geo_long,
         f.forest_oxygen,
         f.forest_carbonoffset,
         f.forest_address,
         f.forest_city,
         f.forest_state,
         f.forest_country,
         f.is_active,
         f.created_at,
         f.updated_at,
         CASE WHEN cb.id IS NULL THEN NULL
              ELSE json_build_object('id', cb.id, 'first_name', cb.first_name) END AS created_by,
         CASE WHEN ub.id IS NULL THEN NULL
              ELSE json_build_object('id', ub.id, 'first_name', ub.first_name) END AS updated_by,
         f.forest_unique_id,
         f.forest_internal_id,
         f.total_trees,
         f.average_age,
         f.total_species_planted,
         f.box_rows,
         f.box_column,
         f.tree_row,
         f.tree_column,
         f.project_period,
         f.plantation_date,
         f.is_updated,
         COALESCE(
           (SELECT json_agg(json_build_object(
                     'id', s.id,
                     'sponsor_name', s.sponsor_name,
                     'sponsor_logo', s.sponsor_logo,
                     'sponsor_forest_logo', s.sponsor_forest_logo,
                     'sponsor_tree_logo', s.sponsor_tree_logo,
                     'sponsor_og_image_url', s.sponsor_og_image_url))
            FROM forest_sponsors fs
            JOIN sponsors s ON s.id = fs.sponsor_id AND s.is_active = TRUE
            WHERE fs.forest_id = f.id AND fs.is_active = TRUE),
           '[]'::json
         ) AS sponsors
       ${where.replace('FROM forests f', `
         FROM forests f
         LEFT JOIN user_profiles cb ON cb.id = f.created_by
         LEFT JOIN user_profiles ub ON ub.id = f.updated_by`)}
       ORDER BY f.created_at DESC
       LIMIT $3 OFFSET $4`,
      [...params, limit, offset]
    );

    res.json({ data: rows.rows, pagination: { total, page, limit } });
  })
);

/* ----------------------------- reports/list ------------------------- */
// Nests Forest {id,forest_name,forest_unique_id}, CreatedBy/UpdatedBy {id,first_name}.
// Adds filter_limit metadata (distinct years/quarters bounds) — best-effort per spec.
listRouter.post(
  '/reports/list',
  wrap(async (req, res) => {
    const { limit, offset, page, search } = parsePageParams(req.body);
    const like = `%${search}%`;
    // Reports have no natural name; search matches the joined forest name.
    const where = `
      FROM reports r
      LEFT JOIN forests fo ON fo.id = r.forest_id
      WHERE r.is_active = TRUE
        AND ($1 = '' OR fo.forest_name ILIKE $2)`;
    const params = [search, like];

    const total = await countTotal(where, params);
    const rows = await query(
      `SELECT
         r.id, r.year, r.quarter, r.report_date, r.plantation_date,
         r.start_date, r.end_date, r.mode, r.type, r.version, r.project_period,
         r.forest_id, r.skip, r.created_by, r.updated_by, r.is_active,
         r.created_at, r.updated_at,
         CASE WHEN fo.id IS NULL THEN NULL
              ELSE json_build_object('id', fo.id, 'forest_name', fo.forest_name,
                                     'forest_unique_id', fo.forest_unique_id) END AS "Forest",
         CASE WHEN cb.id IS NULL THEN NULL
              ELSE json_build_object('id', cb.id, 'first_name', cb.first_name) END AS "CreatedBy",
         CASE WHEN ub.id IS NULL THEN NULL
              ELSE json_build_object('id', ub.id, 'first_name', ub.first_name) END AS "UpdatedBy"
       FROM reports r
       LEFT JOIN forests fo ON fo.id = r.forest_id
       LEFT JOIN user_profiles cb ON cb.id = r.created_by
       LEFT JOIN user_profiles ub ON ub.id = r.updated_by
       WHERE r.is_active = TRUE
         AND ($1 = '' OR fo.forest_name ILIKE $2)
       ORDER BY r.created_at DESC
       LIMIT $3 OFFSET $4`,
      [...params, limit, offset]
    );

    // filter_limit: distinct values available for client-side filter popover.
    // TODO(openQuestions): exact shape of filter_limit not documented; we
    // surface distinct years/quarters/modes/types as a faithful best-effort.
    const filters = await query<{
      years: number[] | null;
      quarters: number[] | null;
      modes: string[] | null;
      types: string[] | null;
    }>(
      `SELECT
         array_remove(array_agg(DISTINCT year), NULL)    AS years,
         array_remove(array_agg(DISTINCT quarter), NULL) AS quarters,
         array_remove(array_agg(DISTINCT mode), NULL)    AS modes,
         array_remove(array_agg(DISTINCT type), NULL)    AS types
       FROM reports WHERE is_active = TRUE`
    );
    const f = filters.rows[0];

    res.json({
      data: rows.rows,
      pagination: { total, page, limit },
      filter_limit: {
        years: f?.years ?? [],
        quarters: f?.quarters ?? [],
        modes: f?.modes ?? [],
        types: f?.types ?? [],
      },
    });
  })
);

/* ------------------------------ jobs/list --------------------------- */
listRouter.post(
  '/jobs/list',
  wrap(async (req, res) => {
    const { limit, offset, page, search } = parsePageParams(req.body);
    const like = `%${search}%`;
    const where = `FROM jobs WHERE ($1 = '' OR job_id ILIKE $2 OR job_type ILIKE $2 OR status ILIKE $2)`;
    const params = [search, like];

    const total = await countTotal(where, params);
    const rows = await query(
      `SELECT
         id, job_id, job_type, job_description, status, payload, result,
         created_by, updated_by, created_at, updated_at
       ${where}
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [...params, limit, offset]
    );

    res.json({ data: rows.rows, pagination: { total, page, limit } });
  })
);

/* --------------------- master-plantspecies/search ------------------- */
// Async species search backing the forest wizard SpeciesSearchSelect.
listRouter.post(
  '/master-plantspecies/search',
  wrap(async (req, res) => {
    const { limit, offset, page, search } = parsePageParams(req.body);
    const like = `%${search}%`;
    const where = `FROM master_plantspecies
      WHERE is_active = TRUE
        AND ($1 = '' OR species_name ILIKE $2 OR common_name ILIKE $2)`;
    const params = [search, like];

    const total = await countTotal(where, params);
    // Alias to the camelCase keys the client's SpeciesOption type reads
    // (speciesName/commonName/speciesCategory) so the wizard's typeahead labels
    // render. Mirrors the users/list camelCase aliasing convention.
    const rows = await query(
      `SELECT
         id,
         species_category AS "speciesCategory",
         species_name     AS "speciesName",
         common_name      AS "commonName",
         species_desc     AS "speciesDesc",
         oxygen_per_day   AS "oxygenPerDay",
         carbon_offset_per_day AS "carbonOffsetPerDay",
         rate, is_active
       ${where}
       ORDER BY species_name ASC
       LIMIT $3 OFFSET $4`,
      [...params, limit, offset]
    );

    res.json({ data: rows.rows, pagination: { total, page, limit } });
  })
);
