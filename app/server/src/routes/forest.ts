/**
 * Forest write + read routes — the FULL forest record (beyond the 2-step wizard).
 *
 * Surface (all under /api/v1, behind requireAuth):
 *   POST /forest/upsert              — full forest_create_payload.jsonc body
 *                                      (multipart OR json). INSERT (no id) /
 *                                      UPDATE (id). Fans out into forests (all
 *                                      scalar + jsonb cols) + forest_boxes (from
 *                                      box_data[]) + forest_trees (count per
 *                                      species, computed geo + oxygen/carbon) +
 *                                      forest_sponsors + forests_employees +
 *                                      user_role_forest_accesses, and writes a
 *                                      jobs row (forest_upsert_v1, completed).
 *                                      Returns {data:{forest, counts}}.
 *   POST /forest/trees/bulk-import   — rows in bulk_tree_gift_sheet.csv shape;
 *                                      upserts forest_trees by
 *                                      (forest_unique_id, tree_unique_id) +
 *                                      gift_forest_plants when a recipient is
 *                                      present. Returns {inserted,updated,gifts,errors[]}.
 *   GET  /forest/:id/dashboard       — KPI stats (oxygen/carbon/trees/species/
 *                                      avg age/alive/drying), role-scoped.
 *   GET  /forest/:id/geo             — {center, boundary, trees:[{tree_unique_id,
 *                                      lat,lng,species}]}, role-scoped.
 *   POST /forest/:id/trees/list      — paginated + searchable trees register,
 *                                      role-scoped (sponsor portal Trees tab).
 *
 * Role scoping (spec/sponsor_portal.md): SuperAdmin sees all forests; Admin
 * (sponsor) only forests linked via user_role_forest_accesses for their
 * userRoleId; any other role is rejected. Enforced by assertForestAccess.
 *
 * SECURITY: every persisted column is whitelisted; all SQL is parameterised;
 * identifiers come only from static whitelists. Unknown body keys are dropped.
 *
 * PROD NOTE: the live system runs forest/upsert as an async background job (the
 * Jobs tab shows it). We materialise it synchronously so local dev sees the
 * forest + boxes + trees immediately, and still insert the job row for parity.
 */
import { Router, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { query, getClient, type DbClient } from '../db';
import { badRequest, forbidden, notFound } from '../errors';
import { parsePageParams, countTotal } from './helpers';
import {
  ageDays,
  treeOxygen,
  treeCarbon,
  spreadTreeGeo,
  padTreeNumber,
  treeCertUrl,
} from '../lib/geo';

export const forestRouter = Router();

/* ------------------------------------------------------------------ */
/* Uploads (shared dir with crud.ts so /uploads serves both)          */
/* ------------------------------------------------------------------ */

const UPLOADS_DIR =
  process.env.UPLOADS_DIR ?? path.resolve(__dirname, '..', '..', 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${file.fieldname}-${Date.now()}-${safe}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
function fileUrl(req: Request, filename: string): string {
  return `${req.protocol}://${req.get('host')}/uploads/${filename}`;
}

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<void>;
const wrap =
  (fn: Handler): Handler =>
  async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (err) {
      next(err);
    }
  };

/* ------------------------------------------------------------------ */
/* Column whitelists for the FULL forest payload                       */
/* ------------------------------------------------------------------ */

/** Scalar forest columns the full payload may set (snake_case). */
const FOREST_SCALAR_COLUMNS = [
  'forest_name',
  'forest_desc',
  'forest_unique_id',
  'forest_internal_id',
  'forest_url',
  'forest_geo_lat',
  'forest_geo_long',
  'forest_geo_radius',
  'forest_geo_shape',
  'forest_address',
  'forest_city',
  'forest_state',
  'forest_country',
  'box_rows',
  'box_column',
  'box_to_box_distance',
  'tree_row',
  'tree_column',
  'tree_to_tree_distance',
  'direction_angle',
  'boundary_gap',
  'pathway_spacing',
  'project_site',
  'project_period',
  'plantation_date',
  'plantation_strategy',
  'plantation_strategy_other',
  'irrigation_method',
  'irrigation_method_other',
  'climate',
  'climate_other',
  'soil_type',
  'soil_type_other',
  'digipin',
  'last_inspection_date',
  'permission_letter',
  'site_layout',
  'is_updated',
  'is_active',
];

/** jsonb forest columns (JSON.stringify'd before binding). */
const FOREST_JSONB_COLUMNS = new Set([
  'forest_boundary',
  'project_details',
  'soil_ph_level',
  'temperature_humidity',
  'land_ownership',
  'land_area',
  'authorization_details',
  'area_population_statistics_details',
  'direct_and_indirect_beneficiaries',
  'forest_value_flow_impact_report',
  'species_details',
  'maintenance_workforce',
  'plant_growth_data',
  'environmental_need_indicators',
  'security_and_infrastructure',
  'plantation_progress',
  'additional_sponsor_logo',
  'dashboard_images',
  'report_images',
]);

const FOREST_ALL_COLUMNS = new Set([...FOREST_SCALAR_COLUMNS, ...FOREST_JSONB_COLUMNS]);

/**
 * Payload key (camelCase from the live UI OR snake_case) -> column.
 * The forest_create_payload.jsonc uses snake_case names that already match the
 * columns, but we also accept camelCase for symmetry with the wizard client.
 */
function toSnake(key: string): string {
  return key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
}

/** A species row inside a box_data[].species_data[] entry. */
interface SpeciesData {
  species_id?: number | string;
  speciesId?: number | string;
  planted_on?: string;
  plantedOn?: string;
  count?: number | string;
  height?: number | string;
  diameter?: number | string;
  dia?: number | string;
  species_common_name?: string;
  species_name?: string;
}

/** A box from box_data[]. */
interface BoxData {
  id?: string;
  row?: number | string;
  column?: number | string;
  tree_to_tree_distance?: number | string;
  treeToTreeDistance?: number | string;
  prefix?: string;
  start?: number | string;
  row_position?: number | string;
  rowPosition?: number | string;
  column_position?: number | string;
  columnPosition?: number | string;
  species_data?: SpeciesData[];
  speciesData?: SpeciesData[];
}

/** Parse a value that may be a JSON string (multipart) or already an array/obj. */
function parseMaybeJson<T>(value: unknown, fallback: T): T {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'string') {
    const t = value.trim();
    if (t === '') return fallback;
    try {
      return JSON.parse(t) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

function bodyId(req: Request): string | undefined {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const id = b.id ?? b.forest_id ?? b.forestId;
  if (id === undefined || id === null || id === '') return undefined;
  return String(id);
}

/** Width of the running number inferred from a box `start` token ("001" -> 3). */
function startWidth(start: number | string | undefined): number {
  if (typeof start === 'string' && /^\d+$/.test(start)) return start.length;
  return 0;
}

/* ------------------------------------------------------------------ */
/* FOREST UPSERT — full payload                                        */
/* ------------------------------------------------------------------ */

async function upsertForest(req: Request, res: Response): Promise<void> {
  const actor = req.auth?.profileId ?? null;
  const id = bodyId(req);
  const body = (req.body ?? {}) as Record<string, unknown>;

  // 1. Collect scalar + jsonb forest columns from the body.
  const colMap = new Map<string, unknown>();
  for (const [rawKey, rawVal] of Object.entries(body)) {
    const col = FOREST_ALL_COLUMNS.has(rawKey) ? rawKey : toSnake(rawKey);
    if (!FOREST_ALL_COLUMNS.has(col)) continue;
    let value: unknown = rawVal;
    if (FOREST_JSONB_COLUMNS.has(col) && value !== null && value !== undefined) {
      // jsonb columns: accept an object/array directly OR a JSON string.
      value = typeof value === 'string' ? value : JSON.stringify(value);
    }
    colMap.set(col, value);
  }

  // 2. Uploaded files override their URL columns (permission_letter, site_layout).
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  for (const f of files) {
    if (f.fieldname === 'permission_letter' || f.fieldname === 'site_layout') {
      colMap.set(f.fieldname, fileUrl(req, f.filename));
    }
  }

  // 3. Structured arrays + assignee ids.
  const boxData = parseMaybeJson<BoxData[]>(body.box_data ?? body.boxData, []);
  const employeeId = (body.employee_id ?? body.employeeId) as string | undefined;
  const sponsorId = (body.sponsor_id ?? body.sponsorId) as string | undefined;
  const userRoleId = (body.user_role_id ?? body.userRoleId) as string | undefined;
  // Optional explicit multi-assign arrays (superset of the single ids above).
  const sponsorIds = parseMaybeJson<string[]>(body.sponsor_ids ?? body.sponsorIds, []);
  const employeeIds = parseMaybeJson<string[]>(body.employee_ids ?? body.employeeIds, []);

  const centerLat = Number(colMap.get('forest_geo_lat') ?? body.forest_geo_lat ?? 0);
  const centerLng = Number(colMap.get('forest_geo_long') ?? body.forest_geo_long ?? 0);

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // --- forest row (INSERT or UPDATE) ---
    let forestId: string;
    if (!id) {
      const cols = [...colMap.keys(), 'created_by', 'updated_by'];
      const vals = [...colMap.values(), actor, actor];
      const ph = cols.map((_, i) => `$${i + 1}`).join(', ');
      const r = await client.query<{ id: string }>(
        `INSERT INTO forests (${cols.join(', ')}) VALUES (${ph}) RETURNING id`,
        vals
      );
      forestId = r.rows[0]!.id;
    } else {
      forestId = id;
      if (colMap.size > 0) {
        const cols = [...colMap.keys()];
        const vals = [...colMap.values()];
        const setSql = cols.map((c, i) => `${c} = $${i + 1}`).join(', ');
        const r = await client.query<{ id: string }>(
          `UPDATE forests SET ${setSql}, is_updated = TRUE, updated_by = $${cols.length + 1}
             WHERE id = $${cols.length + 2} RETURNING id`,
          [...vals, actor, forestId]
        );
        if (r.rowCount === 0) throw notFound('Forest not found');
      }
      // Re-running rebuilds the generated child rows. Detach the tree-level
      // dependents first (gift_forest_plants / donor_trees FK forest_trees),
      // otherwise the tree DELETE trips their foreign keys.
      await client.query(
        `DELETE FROM gift_forest_plants
          WHERE gift_tree_id IN (SELECT id FROM forest_trees WHERE forest_id = $1)`,
        [forestId]
      );
      await client.query(
        `DELETE FROM donor_trees
          WHERE tree_id IN (SELECT id FROM forest_trees WHERE forest_id = $1)`,
        [forestId]
      );
      await client.query(`DELETE FROM forest_trees WHERE forest_id = $1`, [forestId]);
      await client.query(`DELETE FROM forest_boxes WHERE forest_id = $1`, [forestId]);
      await client.query(`DELETE FROM forest_clusters WHERE forest_id = $1`, [forestId]);
      await client.query(`DELETE FROM forest_sponsors WHERE forest_id = $1`, [forestId]);
      await client.query(`DELETE FROM forests_employees WHERE forest_id = $1`, [forestId]);
      // user_role_forest_accesses is left intact on update unless a new
      // userRoleId is supplied (handled below) — it governs portal access.
    }

    // Resolve the forest_unique_id (for tree cert URLs).
    const fuidRow = await client.query<{ forest_unique_id: string | null }>(
      `SELECT forest_unique_id FROM forests WHERE id = $1`,
      [forestId]
    );
    const forestUniqueId = fuidRow.rows[0]?.forest_unique_id ?? forestId;

    // --- join rows: sponsors + employees ---
    const allSponsors = uniq([...(sponsorId ? [sponsorId] : []), ...sponsorIds]);
    for (const sId of allSponsors) {
      if (!sId) continue;
      await client.query(
        `INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active, created_by, updated_by)
         VALUES ($1,$2,TRUE,$3,$3)`,
        [forestId, sId, actor]
      );
    }
    const allEmployees = uniq([...(employeeId ? [employeeId] : []), ...employeeIds]);
    for (const eId of allEmployees) {
      if (!eId) continue;
      await client.query(
        `INSERT INTO forests_employees (forest_id, employee_id, is_active, created_by, updated_by)
         VALUES ($1,$2,TRUE,$3,$3)`,
        [forestId, eId, actor]
      );
    }
    // Grant portal access to the supplied user_role (sponsor login scope).
    if (userRoleId) {
      const exists = await client.query(
        `SELECT 1 FROM user_role_forest_accesses
          WHERE user_role_id = $1 AND forest_id = $2`,
        [userRoleId, forestId]
      );
      if (exists.rowCount === 0) {
        await client.query(
          `INSERT INTO user_role_forest_accesses
             (user_role_id, forest_id, is_active, created_by, updated_by)
           VALUES ($1,$2,TRUE,$3,$3)`,
          [userRoleId, forestId, actor]
        );
      }
    }

    // --- boxes + trees from box_data[] ---
    const stats = await generateBoxesAndTrees(
      client,
      forestId,
      forestUniqueId,
      boxData,
      centerLat,
      centerLng,
      actor
    );

    // One representative cluster centred on the forest (live job builds many).
    if (Number.isFinite(centerLat) && Number.isFinite(centerLng) && (centerLat || centerLng)) {
      await client.query(
        `INSERT INTO forest_clusters (forest_id, lat, lng, tree_count) VALUES ($1,$2,$3,$4)`,
        [forestId, String(centerLat), String(centerLng), stats.trees]
      );
    }

    // Cache forest totals (matches live forests.forest_oxygen/_carbonoffset).
    await client.query(
      `UPDATE forests
          SET total_trees = $1,
              total_species_planted = $2,
              forest_oxygen = $3,
              forest_carbonoffset = $4,
              updated_by = $5
        WHERE id = $6`,
      [stats.trees, stats.species, stats.oxygen, stats.carbon, actor, forestId]
    );

    // Mirror the live async-job record.
    const jobId = `JOB_${Date.now()}_${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    await client.query(
      `INSERT INTO jobs (job_id, job_type, job_description, status, payload, result, created_by, updated_by)
       VALUES ($1,'forest_upsert_v1',$2,'completed',$3,$4,$5,$5)`,
      [
        jobId,
        JSON.stringify({
          forest_id: `${forestUniqueId} - ${colMap.get('forest_name') ?? ''}`.trim(),
          total_number_of_boxes: stats.boxes,
          total_number_of_trees: stats.trees,
        }),
        JSON.stringify({ url: '/api/v1/forest/upsert', method: 'POST' }),
        JSON.stringify({ success: true, message: 'Forest created successfully' }),
        actor,
      ]
    );

    await client.query('COMMIT');

    const forest = await fetchForestRecord(forestId);
    res.json({
      data: {
        forest,
        counts: {
          boxes: stats.boxes,
          trees: stats.trees,
          species: stats.species,
          oxygen: stats.oxygen,
          carbon: stats.carbon,
        },
      },
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

interface GenStats {
  boxes: number;
  trees: number;
  species: number;
  oxygen: number;
  carbon: number;
}

/**
 * Insert forest_boxes from box_data[], and per species_data{species_id,count,...}
 * generate `count` forest_trees with:
 *   tree_unique_id = prefix + zero-padded running number from `start`
 *   master_plant_species_id = species_id
 *   forest_tree_geo_lat/long = deterministic spread around the forest center
 *   forest_tree_oxygen/carbonoffset = species rate * age_days
 */
async function generateBoxesAndTrees(
  client: DbClient,
  forestId: string,
  forestUniqueId: string,
  boxData: BoxData[],
  centerLat: number,
  centerLng: number,
  actor: string | null
): Promise<GenStats> {
  const now = new Date();
  let totalTrees = 0;
  const speciesSeen = new Set<number>();
  let oxygenSum = 0;
  let carbonSum = 0;

  // Cache species rates so we don't re-query per tree.
  const speciesRate = new Map<number, { o2: number; co: number }>();
  const rateOf = async (sid: number): Promise<{ o2: number; co: number }> => {
    const hit = speciesRate.get(sid);
    if (hit) return hit;
    const r = await client.query<{ oxygen_per_day: number | null; carbon_offset_per_day: number | null }>(
      `SELECT oxygen_per_day, carbon_offset_per_day FROM master_plantspecies WHERE id = $1`,
      [sid]
    );
    const rate = {
      o2: Number(r.rows[0]?.oxygen_per_day) || 0,
      co: Number(r.rows[0]?.carbon_offset_per_day) || 0,
    };
    speciesRate.set(sid, rate);
    return rate;
  };

  for (let bIdx = 0; bIdx < boxData.length; bIdx++) {
    const box = boxData[bIdx]!;
    const prefix = box.prefix ?? '';
    const startToken = box.start ?? 1;
    const startNum = Number(startToken) || 1;
    const padW = startWidth(startToken);
    const ttd = num(box.tree_to_tree_distance ?? box.treeToTreeDistance);

    const boxRes = await client.query<{ id: string }>(
      `INSERT INTO forest_boxes
         (forest_id, "row", "column", row_position, column_position,
          prefix, start, tree_to_tree_distance, is_active, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE,$9,$9)
       RETURNING id`,
      [
        forestId,
        intOrNull(box.row),
        intOrNull(box.column),
        intOrNull(box.row_position ?? box.rowPosition),
        intOrNull(box.column_position ?? box.columnPosition),
        prefix,
        String(startToken),
        ttd,
        actor,
      ]
    );
    const boxId = boxRes.rows[0]!.id;

    const speciesList = box.species_data ?? box.speciesData ?? [];
    let runningOffset = 0; // running index within the box (drives geo + numbering)
    for (const sp of speciesList) {
      const sid = Number(sp.species_id ?? sp.speciesId);
      if (!Number.isFinite(sid) || sid <= 0) continue;
      const count = Math.max(0, Math.trunc(Number(sp.count) || 0));
      const plantedOn = sp.planted_on ?? sp.plantedOn ?? null;
      const days = ageDays(plantedOn, now);
      const { o2, co } = await rateOf(sid);
      const oxy = treeOxygen(o2, days);
      const carb = treeCarbon(co, days);
      const height = sp.height !== undefined ? String(sp.height) : null;
      const dia = (sp.diameter ?? sp.dia) !== undefined ? String(sp.diameter ?? sp.dia) : null;
      const name = sp.species_common_name ?? null;

      for (let i = 0; i < count; i++) {
        const treeUniqueId = `${prefix}${padTreeNumber(startNum + runningOffset, padW)}`;
        const geo = spreadTreeGeo(centerLat, centerLng, bIdx, runningOffset);
        await client.query(
          `INSERT INTO forest_trees
             (forest_id, box_id, master_plant_species_id, tree_unique_id,
              forest_tree_name, forest_tree_height, forest_tree_dia, forest_tree_age,
              forest_tree_oxygen, forest_tree_carbonoffset,
              forest_tree_geo_lat, forest_tree_geo_long, planted_on, tree_url,
              is_display, is_active, created_by, updated_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,TRUE,TRUE,$15,$15)`,
          [
            forestId,
            boxId,
            sid,
            treeUniqueId,
            name,
            height,
            dia,
            days,
            String(oxy),
            String(carb),
            geo.lat,
            geo.lng,
            plantedOn,
            treeCertUrl(forestUniqueId, treeUniqueId),
            actor,
          ]
        );
        runningOffset++;
        totalTrees++;
        oxygenSum += oxy;
        carbonSum += carb;
        speciesSeen.add(sid);
      }
    }
  }

  return {
    boxes: boxData.length,
    trees: totalTrees,
    species: speciesSeen.size,
    oxygen: Math.round(oxygenSum * 1000) / 1000,
    carbon: Math.round(carbonSum * 1000) / 1000,
  };
}

function uniq(arr: string[]): string[] {
  return [...new Set(arr.filter(Boolean))];
}
function intOrNull(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) ? n : null;
}
function num(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Return a forest record (full row + joined sponsors[]). */
async function fetchForestRecord(forestId: string): Promise<unknown> {
  const r = await query(
    `SELECT f.*,
       COALESCE(
         (SELECT json_agg(json_build_object(
                   'id', s.id, 'sponsor_name', s.sponsor_name,
                   'sponsor_logo', s.sponsor_logo))
          FROM forest_sponsors fs JOIN sponsors s ON s.id = fs.sponsor_id
          WHERE fs.forest_id = f.id AND fs.is_active = TRUE),
         '[]'::json) AS sponsors
     FROM forests f WHERE f.id = $1`,
    [forestId]
  );
  return r.rows[0] ?? { id: forestId };
}

/* ------------------------------------------------------------------ */
/* BULK TREE / GIFT IMPORT                                             */
/* ------------------------------------------------------------------ */

/** One row of the bulk_tree_gift_sheet.csv shape. */
interface BulkRow {
  forest_unique_id?: string;
  forestUniqueId?: string;
  tree_unique_id?: string;
  treeUniqueId?: string;
  species_id?: number | string;
  speciesId?: number | string;
  species_common_name?: string;
  species_name?: string;
  height?: number | string;
  dia?: number | string;
  planted_on?: string;
  plantedOn?: string;
  gift_recipient_name?: string;
  gift_recipient_email_id?: string;
  tree_url?: string;
}

/**
 * Bulk import trees + gift recipients. Body: { rows: BulkRow[] } (or a bare
 * array). For each row:
 *   - resolve the forest by forest_unique_id (must already exist)
 *   - upsert forest_trees on (forest_id, tree_unique_id) with species + height/
 *     dia/planted_on + computed age/oxygen/carbon + cert URL
 *   - if a gift recipient is present, upsert a gift_forest_plants row and set
 *     the tree cert URL https://bethetreehugger.co/tree/<fuid>/<tuid>
 * Returns {inserted, updated, gifts, errors:[{row, message}]}.
 */
async function bulkImportTrees(req: Request, res: Response): Promise<void> {
  const actor = req.auth?.profileId ?? null;
  const body = req.body as unknown;
  const rows: BulkRow[] = Array.isArray(body)
    ? (body as BulkRow[])
    : Array.isArray((body as { rows?: unknown })?.rows)
    ? ((body as { rows: BulkRow[] }).rows)
    : [];

  if (rows.length === 0) throw badRequest('rows[] is required (bulk_tree_gift_sheet shape)');

  const now = new Date();
  let inserted = 0;
  let updated = 0;
  let gifts = 0;
  const errors: Array<{ row: number; message: string }> = [];

  // forest_unique_id -> forest id cache.
  const forestCache = new Map<string, string | null>();
  const resolveForest = async (fuid: string): Promise<string | null> => {
    if (forestCache.has(fuid)) return forestCache.get(fuid)!;
    const r = await query<{ id: string }>(
      `SELECT id FROM forests WHERE forest_unique_id = $1 LIMIT 1`,
      [fuid]
    );
    const fid = r.rows[0]?.id ?? null;
    forestCache.set(fuid, fid);
    return fid;
  };
  const speciesRate = new Map<number, { o2: number; co: number }>();
  const rateOf = async (sid: number): Promise<{ o2: number; co: number }> => {
    const hit = speciesRate.get(sid);
    if (hit) return hit;
    const r = await query<{ oxygen_per_day: number | null; carbon_offset_per_day: number | null }>(
      `SELECT oxygen_per_day, carbon_offset_per_day FROM master_plantspecies WHERE id = $1`,
      [sid]
    );
    const rate = {
      o2: Number(r.rows[0]?.oxygen_per_day) || 0,
      co: Number(r.rows[0]?.carbon_offset_per_day) || 0,
    };
    speciesRate.set(sid, rate);
    return rate;
  };

  const client = await getClient();
  try {
    await client.query('BEGIN');
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      try {
        const fuid = (row.forest_unique_id ?? row.forestUniqueId ?? '').trim();
        const tuid = (row.tree_unique_id ?? row.treeUniqueId ?? '').trim();
        if (!fuid || !tuid) throw new Error('forest_unique_id and tree_unique_id are required');
        const forestId = await resolveForest(fuid);
        if (!forestId) throw new Error(`forest_unique_id ${fuid} not found`);

        const sid = Number(row.species_id ?? row.speciesId);
        const speciesId = Number.isFinite(sid) && sid > 0 ? sid : null;
        const plantedOn = row.planted_on ?? row.plantedOn ?? null;
        const days = ageDays(plantedOn, now);
        const { o2, co } = speciesId !== null ? await rateOf(speciesId) : { o2: 0, co: 0 };
        const oxy = treeOxygen(o2, days);
        const carb = treeCarbon(co, days);
        const certUrl = row.tree_url?.trim() || treeCertUrl(fuid, tuid);
        const name = row.species_common_name ?? null;
        const height = row.height !== undefined ? String(row.height) : null;
        const dia = row.dia !== undefined ? String(row.dia) : null;

        // Upsert tree on (forest_id, tree_unique_id).
        const existing = await client.query<{ id: string }>(
          `SELECT id FROM forest_trees WHERE forest_id = $1 AND tree_unique_id = $2 LIMIT 1`,
          [forestId, tuid]
        );
        let treeId: string;
        if (existing.rowCount === 0) {
          const ins = await client.query<{ id: string }>(
            `INSERT INTO forest_trees
               (forest_id, master_plant_species_id, tree_unique_id, forest_tree_name,
                forest_tree_height, forest_tree_dia, forest_tree_age,
                forest_tree_oxygen, forest_tree_carbonoffset, planted_on, tree_url,
                is_display, is_active, created_by, updated_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,TRUE,TRUE,$12,$12)
             RETURNING id`,
            [forestId, speciesId, tuid, name, height, dia, days, String(oxy), String(carb), plantedOn, certUrl, actor]
          );
          treeId = ins.rows[0]!.id;
          inserted++;
        } else {
          treeId = existing.rows[0]!.id;
          await client.query(
            `UPDATE forest_trees
                SET master_plant_species_id = COALESCE($2, master_plant_species_id),
                    forest_tree_name = COALESCE($3, forest_tree_name),
                    forest_tree_height = COALESCE($4, forest_tree_height),
                    forest_tree_dia = COALESCE($5, forest_tree_dia),
                    forest_tree_age = $6,
                    forest_tree_oxygen = $7,
                    forest_tree_carbonoffset = $8,
                    planted_on = COALESCE($9, planted_on),
                    tree_url = $10,
                    updated_by = $11
              WHERE id = $1`,
            [treeId, speciesId, name, height, dia, days, String(oxy), String(carb), plantedOn, certUrl, actor]
          );
          updated++;
        }

        // Gift recipient -> gift_forest_plants (upsert by gift_tree_id).
        const giftName = row.gift_recipient_name?.trim();
        const giftEmail = row.gift_recipient_email_id?.trim();
        if (giftName || giftEmail) {
          const g = await client.query<{ id: string }>(
            `SELECT id FROM gift_forest_plants WHERE gift_tree_id = $1 LIMIT 1`,
            [treeId]
          );
          if (g.rowCount === 0) {
            await client.query(
              `INSERT INTO gift_forest_plants
                 (gift_tree_id, name, email_id, gift_certificate_url, allocating_on,
                  is_active, created_by, updated_by)
               VALUES ($1,$2,$3,$4,$5,TRUE,$6,$6)`,
              [treeId, giftName ?? null, giftEmail ?? null, certUrl, now.toISOString().slice(0, 10), actor]
            );
          } else {
            await client.query(
              `UPDATE gift_forest_plants
                  SET name = COALESCE($2, name), email_id = COALESCE($3, email_id),
                      gift_certificate_url = $4, updated_by = $5
                WHERE id = $1`,
              [g.rows[0]!.id, giftName ?? null, giftEmail ?? null, certUrl, actor]
            );
          }
          // Mark the tree as assigned (gifted) — sets assigned_to-style flag via cert.
          gifts++;
        }
      } catch (rowErr) {
        errors.push({ row: i, message: rowErr instanceof Error ? rowErr.message : String(rowErr) });
      }
    }

    // Recompute the touched forests' cached totals.
    for (const fid of new Set([...forestCache.values()].filter(Boolean) as string[])) {
      await recomputeForestTotals(client, fid);
    }

    await client.query('COMMIT');
    res.json({ inserted, updated, gifts, errors });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

/** Re-sum forest_trees -> forests.total_trees / total_species_planted / oxygen / carbon. */
async function recomputeForestTotals(client: DbClient, forestId: string): Promise<void> {
  await client.query(
    `UPDATE forests f SET
        total_trees = sub.cnt,
        total_species_planted = sub.species,
        forest_oxygen = sub.oxygen,
        forest_carbonoffset = sub.carbon
     FROM (
        SELECT
          COUNT(*)::int AS cnt,
          COUNT(DISTINCT master_plant_species_id)::int AS species,
          COALESCE(SUM(forest_tree_oxygen::numeric), 0) AS oxygen,
          COALESCE(SUM(forest_tree_carbonoffset::numeric), 0) AS carbon
        FROM forest_trees WHERE forest_id = $1 AND is_active = TRUE
     ) sub
     WHERE f.id = $1`,
    [forestId]
  );
}

/* ------------------------------------------------------------------ */
/* ROLE SCOPING — SuperAdmin: all; Admin: only accessible forests      */
/* ------------------------------------------------------------------ */

/**
 * Throws 403 unless the caller may read this forest.
 *   - SuperAdmin: any forest.
 *   - Admin (sponsor): only forests linked to their userRoleId via
 *     user_role_forest_accesses.
 *   - any other role: rejected.
 */
async function assertForestAccess(req: Request, forestId: string): Promise<void> {
  const role = req.auth?.role;
  if (role === 'SuperAdmin') return;
  if (role === 'Admin') {
    const userRoleId = req.auth?.userRoleId;
    if (!userRoleId) throw forbidden('No forest access for this role');
    const r = await query(
      `SELECT 1 FROM user_role_forest_accesses
        WHERE user_role_id = $1 AND forest_id = $2 AND is_active = TRUE LIMIT 1`,
      [userRoleId, forestId]
    );
    if (r.rowCount === 0) throw forbidden('You do not have access to this forest');
    return;
  }
  throw forbidden('Insufficient role for forest access');
}

/* ------------------------------------------------------------------ */
/* SPONSOR / GEO READS                                                 */
/* ------------------------------------------------------------------ */

/** GET /forest/:id/dashboard — KPI stats (computed from forest_trees). */
async function forestDashboard(req: Request, res: Response): Promise<void> {
  const forestId = String(req.params.id);
  await assertForestAccess(req, forestId);

  const head = await query<{
    id: string;
    forest_name: string | null;
    forest_unique_id: string | null;
    forest_geo_lat: string | null;
    forest_geo_long: string | null;
  }>(
    `SELECT id, forest_name, forest_unique_id, forest_geo_lat, forest_geo_long
       FROM forests WHERE id = $1`,
    [forestId]
  );
  if (head.rowCount === 0) throw notFound('Forest not found');

  // Drying/dead derived from tree_status_master (status text); alive = the rest.
  const agg = await query<{
    trees: number;
    species: number;
    oxygen: string | null;
    carbon: string | null;
    avg_age_days: string | null;
    drying: number;
    dead: number;
  }>(
    `SELECT
       COUNT(*)::int AS trees,
       COUNT(DISTINCT master_plant_species_id)::int AS species,
       COALESCE(SUM(forest_tree_oxygen::numeric), 0)::text AS oxygen,
       COALESCE(SUM(forest_tree_carbonoffset::numeric), 0)::text AS carbon,
       COALESCE(AVG(forest_tree_age), 0)::text AS avg_age_days,
       COUNT(*) FILTER (WHERE LOWER(COALESCE(ts.status,'')) = 'drying')::int AS drying,
       COUNT(*) FILTER (WHERE LOWER(COALESCE(ts.status,'')) = 'dead')::int AS dead
     FROM forest_trees ft
     LEFT JOIN tree_status_master ts ON ts.id = ft.tree_status_id
     WHERE ft.forest_id = $1 AND ft.is_active = TRUE`,
    [forestId]
  );
  const a = agg.rows[0]!;
  const trees = a.trees;
  const dead = a.dead;
  const drying = a.drying;
  const avgAgeDays = Number(a.avg_age_days ?? 0);

  // Sponsors for the co-branded "Sponsored by" panel.
  const sponsors = await query(
    `SELECT s.id, s.sponsor_name, s.sponsor_logo, s.sponsor_forest_logo
       FROM forest_sponsors fs JOIN sponsors s ON s.id = fs.sponsor_id
       WHERE fs.forest_id = $1 AND fs.is_active = TRUE`,
    [forestId]
  );

  res.json({
    data: {
      forest: head.rows[0],
      kpis: {
        oxygen_generated: Number(a.oxygen ?? 0),
        carbon_offset: Number(a.carbon ?? 0),
        trees_planted: trees,
        species_planted: a.species,
        average_age_years: Math.round((avgAgeDays / 365) * 100) / 100,
        average_age_days: Math.round(avgAgeDays),
        trees_alive: trees - dead,
        trees_drying: drying,
        trees_dead: dead,
      },
      sponsors: sponsors.rows,
    },
  });
}

/** GET /forest/:id/geo — {center, boundary, trees:[{tree_unique_id,lat,lng,species}]}. */
async function forestGeo(req: Request, res: Response): Promise<void> {
  const forestId = String(req.params.id);
  await assertForestAccess(req, forestId);

  const f = await query<{
    forest_geo_lat: string | null;
    forest_geo_long: string | null;
    forest_boundary: unknown;
  }>(
    `SELECT forest_geo_lat, forest_geo_long, forest_boundary FROM forests WHERE id = $1`,
    [forestId]
  );
  if (f.rowCount === 0) throw notFound('Forest not found');
  const row = f.rows[0]!;

  // forest_boundary may be stored as a jsonb array OR (live PNB) a JSON string.
  let boundary: unknown = row.forest_boundary ?? null;
  if (typeof boundary === 'string') {
    try {
      boundary = JSON.parse(boundary);
    } catch {
      /* leave as-is */
    }
  }

  const trees = await query<{
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
        AND ft.forest_tree_geo_lat IS NOT NULL`,
    [forestId]
  );

  // Tagged vs total trees (geo-tagging progress for the capture UI).
  const counts = await query<{ tagged: string; total: string }>(
    `SELECT
       COUNT(*) FILTER (WHERE forest_tree_geo_lat IS NOT NULL
                         AND forest_tree_geo_long IS NOT NULL) AS tagged,
       COUNT(*) AS total
       FROM forest_trees
      WHERE forest_id = $1 AND is_active = TRUE AND is_display = TRUE`,
    [forestId]
  );
  const c = counts.rows[0] ?? { tagged: '0', total: '0' };

  res.json({
    data: {
      center: {
        lat: row.forest_geo_lat ? Number(row.forest_geo_lat) : null,
        lng: row.forest_geo_long ? Number(row.forest_geo_long) : null,
      },
      boundary: boundary ?? [],
      counts: { tagged: Number(c.tagged), total: Number(c.total) },
      trees: trees.rows.map((t) => ({
        tree_unique_id: t.tree_unique_id,
        lat: t.lat ? Number(t.lat) : null,
        lng: t.lng ? Number(t.lng) : null,
        species: t.species,
      })),
    },
  });
}

/**
 * POST /forest/:id/trees/geo — geo-tag ONE tree (set/update its coordinates).
 *
 * Body: { tree_id?: uuid, tree_unique_id?: string, lat: number, lng: number }
 * Identify the tree by `tree_id` (preferred) or `tree_unique_id`, both scoped
 * to this forest. Role-gated like every other forest read/write.
 *
 * This is the write side of geo-tagging: the capture UI sends coordinates from
 * device GPS, a map tap/drag, or manual entry — all three land here.
 */
async function tagTreeGeo(req: Request, res: Response): Promise<void> {
  const forestId = String(req.params.id);
  await assertForestAccess(req, forestId);

  const b = (req.body ?? {}) as Record<string, unknown>;
  const treeId = typeof b.tree_id === 'string' ? b.tree_id.trim() : '';
  const treeUid =
    typeof b.tree_unique_id === 'string' ? b.tree_unique_id.trim() : '';
  if (!treeId && !treeUid) {
    throw badRequest('tree_id or tree_unique_id is required');
  }

  const lat = Number(b.lat);
  const lng = Number(b.lng);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw badRequest('lat must be a number between -90 and 90');
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw badRequest('lng must be a number between -180 and 180');
  }

  const actor = req.auth?.profileId ?? null;
  // Match by id when given, else by (forest_id, tree_unique_id). Coordinates are
  // stored as TEXT to mirror the rest of the schema.
  const result = await query<{
    id: string;
    tree_unique_id: string | null;
    lat: string | null;
    lng: string | null;
  }>(
    `UPDATE forest_trees
        SET forest_tree_geo_lat = $1,
            forest_tree_geo_long = $2,
            updated_by = $3,
            updated_at = now()
      WHERE forest_id = $4
        AND is_active = TRUE
        AND ( ($5 <> '' AND id = $5::uuid)
              OR ($5 = '' AND tree_unique_id = $6) )
      RETURNING id, tree_unique_id,
                forest_tree_geo_lat AS lat, forest_tree_geo_long AS lng`,
    [String(lat), String(lng), actor, forestId, treeId, treeUid]
  );

  if (result.rowCount === 0) {
    throw notFound('Tree not found in this forest');
  }
  const t = result.rows[0]!;
  res.json({
    data: {
      id: t.id,
      tree_unique_id: t.tree_unique_id,
      lat: t.lat ? Number(t.lat) : null,
      lng: t.lng ? Number(t.lng) : null,
    },
  });
}

/**
 * POST /forest/:id/trees/list — paginated + searchable trees register, scoped
 * to the forest (+ role-gated). Mirrors the sponsor portal Trees tab columns.
 */
async function forestTreesList(req: Request, res: Response): Promise<void> {
  const forestId = String(req.params.id);
  await assertForestAccess(req, forestId);

  const { limit, offset, page, search } = parsePageParams(req.body);
  const like = `%${search}%`;
  const where = `
    FROM forest_trees ft
    LEFT JOIN master_plantspecies sp ON sp.id = ft.master_plant_species_id
    WHERE ft.forest_id = $1 AND ft.is_active = TRUE
      AND ($2 = '' OR ft.tree_unique_id ILIKE $3 OR ft.forest_tree_name ILIKE $3
           OR sp.species_name ILIKE $3 OR sp.common_name ILIKE $3)`;
  const params = [forestId, search, like];

  const total = await countTotal(where, params);
  const rows = await query(
    `SELECT
       ft.id,
       ft.tree_unique_id,
       ft.forest_tree_name      AS plant_name,
       ft.forest_tree_petname   AS pet_name,
       sp.species_name          AS plant_species,
       sp.common_name           AS species_common_name,
       ft.planted_by,
       ft.planted_on,
       ft.forest_tree_height    AS height,
       ft.forest_tree_dia       AS dia,
       ft.forest_tree_age       AS age_days,
       ft.forest_tree_oxygen    AS oxygen_generated,
       ft.forest_tree_carbonoffset AS carbon_offset,
       ft.forest_tree_geo_lat   AS lat,
       ft.forest_tree_geo_long  AS lng,
       ft.tree_url
     ${where}
     ORDER BY ft.tree_unique_id ASC
     LIMIT $4 OFFSET $5`,
    [...params, limit, offset]
  );

  res.json({ data: rows.rows, pagination: { total, page, limit } });
}

/* ------------------------------------------------------------------ */
/* Route registration                                                  */
/* ------------------------------------------------------------------ */

forestRouter.post('/forest/upsert', upload.any(), wrap(upsertForest));
forestRouter.post('/forests/upsert', upload.any(), wrap(upsertForest));
forestRouter.post('/forest/trees/bulk-import', wrap(bulkImportTrees));
forestRouter.post('/forests/trees/bulk-import', wrap(bulkImportTrees));
forestRouter.get('/forest/:id/dashboard', wrap(forestDashboard));
forestRouter.get('/forest/:id/geo', wrap(forestGeo));
forestRouter.post('/forest/:id/trees/list', wrap(forestTreesList));
forestRouter.post('/forest/:id/trees/geo', wrap(tagTreeGeo));
