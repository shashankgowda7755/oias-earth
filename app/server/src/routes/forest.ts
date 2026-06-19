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
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
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
import { agbKg, CARBON_FRACTION, CO2_PER_C, ROOT_SHOOT, CARBON_METHOD } from '../lib/carbon';
import { isAllowedPanoUrl, providerOf, ALLOWED_TOUR_HOSTS } from '../lib/pano';
import { put } from '@vercel/blob';
import { sendGiftEmail, mailReady } from '../lib/mail';

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
  // Admin (sponsor) and Planter (field worker) are both scoped to assigned
  // forests via user_role_forest_accesses.
  if (role === 'Admin' || role === 'Planter') {
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

/**
 * GET /my/forests — forests the logged-in user can capture in. SuperAdmin sees
 * all; Admin/Planter see only forests granted via user_role_forest_accesses.
 * Drives the field app's forest picker.
 */
async function myForests(req: Request, res: Response): Promise<void> {
  const role = req.auth?.role;
  const userRoleId = req.auth?.userRoleId;
  let rows;
  if (role === 'SuperAdmin') {
    rows = await query(
      `SELECT f.id, f.forest_name, f.forest_unique_id, f.forest_city, f.forest_state,
              COUNT(t.id) FILTER (WHERE t.is_active = TRUE) AS total_trees,
              COUNT(t.id) FILTER (WHERE t.is_active = TRUE
                     AND t.forest_tree_geo_lat IS NOT NULL) AS tagged_trees
         FROM forests f
         LEFT JOIN forest_trees t ON t.forest_id = f.id
        WHERE f.is_active = TRUE
        GROUP BY f.id
        ORDER BY f.forest_name`
    );
  } else if ((role === 'Admin' || role === 'Planter') && userRoleId) {
    rows = await query(
      `SELECT f.id, f.forest_name, f.forest_unique_id, f.forest_city, f.forest_state,
              COUNT(t.id) FILTER (WHERE t.is_active = TRUE) AS total_trees,
              COUNT(t.id) FILTER (WHERE t.is_active = TRUE
                     AND t.forest_tree_geo_lat IS NOT NULL) AS tagged_trees
         FROM forests f
         JOIN user_role_forest_accesses a
           ON a.forest_id = f.id AND a.user_role_id = $1 AND a.is_active = TRUE
         LEFT JOIN forest_trees t ON t.forest_id = f.id
        WHERE f.is_active = TRUE
        GROUP BY f.id
        ORDER BY f.forest_name`,
      [userRoleId]
    );
  } else {
    throw forbidden('No forest access for this role');
  }
  res.json({
    data: rows.rows.map((r: Record<string, unknown>) => ({
      id: r.id,
      name: r.forest_name,
      unique_id: r.forest_unique_id,
      city: r.forest_city,
      state: r.forest_state,
      total_trees: Number(r.total_trees),
      tagged_trees: Number(r.tagged_trees),
    })),
  });
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

/**
 * POST /forest/:id/trees/:treeId/visit — log a longitudinal VISIT (revisit) for
 * one tree: a fresh dated record of status + height + diameter + age + optional
 * photo(s). Appends to forest_plant_timelines (the visit log) + assets, and
 * reflects the latest values on the tree's current row. This is the supply side
 * of proof-of-life — what turns a day-zero snapshot into a life record.
 *
 * Multipart: scalar fields + optional `photo` file(s). Role-gated.
 */
async function logTreeVisit(req: Request, res: Response): Promise<void> {
  const forestId = String(req.params.id);
  const treeId = String(req.params.treeId);
  await assertForestAccess(req, forestId);

  const tr = await query<{ id: string; species_id: number | null }>(
    `SELECT id, master_plant_species_id AS species_id
       FROM forest_trees WHERE id = $1 AND forest_id = $2 AND is_active = TRUE LIMIT 1`,
    [treeId, forestId]
  );
  if (tr.rowCount === 0) throw notFound('Tree not found in this forest');
  const speciesId = tr.rows[0]!.species_id;

  const b = (req.body ?? {}) as Record<string, unknown>;
  const numOrNull = (v: unknown): number | null =>
    v != null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null;
  const date = typeof b.timeline_date === 'string' && b.timeline_date ? b.timeline_date : null;
  if (!date) throw badRequest('timeline_date is required');
  const statusId = numOrNull(b.status_id);
  const height = numOrNull(b.height);
  const diameter = numOrNull(b.diameter);
  const age = numOrNull(b.age);
  const lat = b.lat != null && b.lat !== '' ? String(b.lat) : null;
  const lng = b.lng != null && b.lng !== '' ? String(b.lng) : null;

  const actor = req.auth?.profileId ?? null;
  const files = (req.files as Array<{ filename: string; mimetype?: string }> | undefined) ?? [];

  const client = await getClient();
  try {
    const ins = await client.query<{ id: number }>(
      `INSERT INTO forest_plant_timelines
         (plant_id, species_id, status_id, height, diameter, age,
          latitude, longitude, timeline_date, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10) RETURNING id`,
      [treeId, speciesId, statusId, height, diameter, age, lat, lng, date, actor]
    );
    const tlId = ins.rows[0]!.id;
    let order = 0;
    const photos: string[] = [];
    let anyDuplicate = false;
    for (const f of files) {
      // Read the just-written file once: hash it (recycled-photo fraud check) AND
      // push it to object storage so it survives serverless cold starts. The
      // local /uploads path is ephemeral on Vercel (the live photo-404 bug).
      let buffer: Buffer | null = null;
      try {
        buffer = fs.readFileSync(path.join(UPLOADS_DIR, f.filename));
      } catch {
        buffer = null;
      }
      const sha: string | null = buffer ? crypto.createHash('sha256').update(buffer).digest('hex') : null;
      let url = `/uploads/${f.filename}`; // fallback (ephemeral) if storage unset
      if (buffer && process.env.BLOB_READ_WRITE_TOKEN) {
        try {
          const blob = await put(`tree-visits/${tlId}-${order}-${f.filename}`, buffer, {
            access: 'public',
            contentType: f.mimetype || 'image/jpeg',
          });
          url = blob.url;
        } catch {
          /* keep ephemeral fallback */
        }
      }
      photos.push(url);
      let dup = false;
      if (sha) {
        const seen = await client.query(
          `SELECT 1 FROM forest_plant_timeline_assets WHERE sha256 = $1 LIMIT 1`,
          [sha]
        );
        dup = (seen.rowCount ?? 0) > 0;
      }
      if (dup) anyDuplicate = true;
      await client.query(
        `INSERT INTO forest_plant_timeline_assets
           (timeline_id, type, url, "order", sha256, is_duplicate, created_by, updated_by)
         VALUES ($1, 'image', $2, $3, $4, $5, $6, $6)`,
        [tlId, url, order++, sha, dup, actor]
      );
    }

    // GPS plausibility: flag a visit whose location is implausibly far from its
    // forest centre (likely spoofed or mis-captured).
    if (lat != null && lng != null) {
      const fc = await client.query<{ flat: string | null; flng: string | null }>(
        `SELECT forest_geo_lat AS flat, forest_geo_long AS flng FROM forests WHERE id = $1`,
        [forestId]
      );
      const flat = fc.rows[0]?.flat ? Number(fc.rows[0].flat) : null;
      const flng = fc.rows[0]?.flng ? Number(fc.rows[0].flng) : null;
      if (flat != null && flng != null) {
        const R = 6371000;
        const toRad = (x: number) => (x * Math.PI) / 180;
        const dLat = toRad(Number(lat) - flat);
        const dLng = toRad(Number(lng) - flng);
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(flat)) * Math.cos(toRad(Number(lat))) * Math.sin(dLng / 2) ** 2;
        const distM = 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
        const suspect = distM > 5000; // >5km from forest centre
        await client.query(
          `UPDATE forest_plant_timelines SET geo_suspect = $1, geo_distance_m = $2 WHERE id = $3`,
          [suspect, Math.round(distM), tlId]
        );
      }
    }
    void anyDuplicate;

    // Reflect the latest visit on the tree's current row.
    await client.query(
      `UPDATE forest_trees SET
         tree_status_id = COALESCE($1, tree_status_id),
         forest_tree_height = COALESCE($2, forest_tree_height),
         forest_tree_dia = COALESCE($3, forest_tree_dia),
         forest_tree_age = COALESCE($4, forest_tree_age),
         forest_tree_geo_lat = COALESCE($5, forest_tree_geo_lat),
         forest_tree_geo_long = COALESCE($6, forest_tree_geo_long),
         updated_by = $7, updated_at = now()
       WHERE id = $8`,
      [
        statusId,
        height != null ? String(height) : null,
        diameter != null ? String(diameter) : null,
        age,
        lat,
        lng,
        actor,
        treeId,
      ]
    );

    // Carbon ledger: allometric CO2e stock for this visit + delta vs prior.
    const wdRow = await client.query<{ wood_density: number | null }>(
      `SELECT wood_density FROM master_plantspecies WHERE id = $1`,
      [speciesId]
    );
    const wd =
      wdRow.rows[0]?.wood_density != null ? Number(wdRow.rows[0].wood_density) : 0.6;
    const priorRow = await client.query<{ co2e_kg: number | null }>(
      `SELECT co2e_kg FROM forest_tree_carbon_ledger
        WHERE tree_id = $1 ORDER BY measured_at DESC NULLS LAST, id DESC LIMIT 1`,
      [treeId]
    );
    const prior = priorRow.rows[0]?.co2e_kg != null ? Number(priorRow.rows[0].co2e_kg) : 0;
    const dead = statusId === 4;
    const agb = !dead && height != null && diameter != null ? agbKg(wd, diameter, height) : 0;
    const bgb = ROOT_SHOOT * agb;
    const carbon = (agb + bgb) * CARBON_FRACTION;
    const co2e = dead ? prior : agb > 0 ? carbon * CO2_PER_C : prior;
    const vintage = Number(String(date).slice(0, 4)) || null;
    await client.query(
      `INSERT INTO forest_tree_carbon_ledger
         (tree_id, timeline_id, forest_id, species_id, measured_at, dbh_cm, height_m,
          status_id, wood_density, agb_kg, bgb_kg, carbon_kg, co2e_kg, co2e_delta_kg,
          vintage_year, method_version, dbh_unverified)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,TRUE)
       ON CONFLICT (timeline_id) DO NOTHING`,
      [
        treeId, tlId, forestId, speciesId, date, diameter, height, statusId, wd,
        agb, bgb, carbon, co2e, co2e - prior, vintage, CARBON_METHOD,
      ]
    );

    res.json({
      data: {
        id: tlId, timeline_date: date, status_id: statusId, height, diameter, age, photos,
        co2e_kg: Math.round(co2e * 1000) / 1000,
      },
    });
  } finally {
    client.release();
  }
}

/**
 * POST /forest/:id/boundary — set a forest's boundary polygon (EUDR-style).
 * Body: { boundary: [{lat,lng}, ...] } (>=3 points, or [] to clear).
 * Stored in forests.forest_boundary (jsonb); exported as a GeoJSON Polygon.
 */
async function setForestBoundary(req: Request, res: Response): Promise<void> {
  const forestId = String(req.params.id);
  await assertForestAccess(req, forestId);
  const b = (req.body ?? {}) as Record<string, unknown>;
  const raw = Array.isArray(b.boundary) ? (b.boundary as Array<Record<string, unknown>>) : [];
  const clean = raw
    .map((p) => ({ lat: Number(p.lat), lng: Number(p.lng) }))
    .filter(
      (p) =>
        Number.isFinite(p.lat) && Number.isFinite(p.lng) &&
        Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180,
    );
  if (clean.length > 0 && clean.length < 3) {
    throw badRequest('a boundary needs at least 3 points');
  }
  await query(
    `UPDATE forests SET forest_boundary = $1::jsonb, updated_at = now() WHERE id = $2`,
    [JSON.stringify(clean), forestId],
  );
  res.json({ data: { boundary: clean, points: clean.length } });
}

/**
 * 360 tours (per-forest/plot "walk the forest" embeds). We store only an
 * external embed URL (no bytes); the host must be on the allowlist so the
 * sandboxed iframe can never point at an arbitrary page.
 */
async function listPanoramas(req: Request, res: Response): Promise<void> {
  const forestId = String(req.params.id);
  await assertForestAccess(req, forestId);
  const r = await query<Record<string, unknown>>(
    `SELECT id, label, provider, embed_url, captured_on, is_active
       FROM forest_panoramas WHERE forest_id = $1 ORDER BY captured_on DESC NULLS LAST, id`,
    [forestId],
  );
  res.json({ data: r.rows });
}

async function addPanorama(req: Request, res: Response): Promise<void> {
  const forestId = String(req.params.id);
  await assertForestAccess(req, forestId);
  const b = (req.body ?? {}) as Record<string, unknown>;
  const embedUrl = typeof b.embed_url === 'string' ? b.embed_url.trim() : '';
  if (!isAllowedPanoUrl(embedUrl)) {
    throw badRequest(`embed_url must be an https equirectangular image, a same-origin /panoramas/*.jpg, or an embed on a supported 360 host (${ALLOWED_TOUR_HOSTS.join(', ')})`);
  }
  const label = typeof b.label === 'string' && b.label.trim() ? b.label.trim().slice(0, 120) : null;
  const capturedOn = typeof b.captured_on === 'string' && b.captured_on.trim() ? b.captured_on.trim() : null;
  const r = await query<Record<string, unknown>>(
    `INSERT INTO forest_panoramas (forest_id, label, provider, embed_url, captured_on)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, label, provider, embed_url, captured_on, is_active`,
    [forestId, label, providerOf(embedUrl), embedUrl, capturedOn],
  );
  res.status(201).json({ data: r.rows[0] });
}

async function deletePanorama(req: Request, res: Response): Promise<void> {
  const forestId = String(req.params.id);
  await assertForestAccess(req, forestId);
  const pid = Number(req.params.pid);
  if (!Number.isInteger(pid)) throw badRequest('invalid panorama id');
  await query(
    `UPDATE forest_panoramas SET is_active = FALSE WHERE id = $1 AND forest_id = $2`,
    [pid, forestId],
  );
  res.json({ data: { id: pid, removed: true } });
}

// ---------------------------------------------------------------------------
// Interactive 360 tour: scenes + tree hotspots + navigation links (admin CRUD).
// ---------------------------------------------------------------------------
const sceneUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const pnum = (v: unknown, d = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

/** POST /forest/:id/scenes/upload — store an equirect image in object storage
 *  (Vercel Blob) and return its public URL. Needs BLOB_READ_WRITE_TOKEN. */
async function uploadSceneImage(req: Request, res: Response): Promise<void> {
  const forestId = String(req.params.id);
  await assertForestAccess(req, forestId);
  const file = (req as unknown as { file?: { buffer: Buffer; originalname: string; mimetype: string } }).file;
  if (!file) throw badRequest('image file is required (field "image")');
  if (!/^image\//.test(file.mimetype)) throw badRequest('file must be an image');
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw badRequest('object storage not configured — set BLOB_READ_WRITE_TOKEN (Vercel Blob) or paste an external https equirect URL instead');
  }
  const ext = (file.originalname.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const key = `panoramas/${forestId}/${Date.now()}.${ext}`;
  const blob = await put(key, file.buffer, { access: 'public', contentType: file.mimetype });
  res.status(201).json({ data: { url: blob.url } });
}

async function listScenesAdmin(req: Request, res: Response): Promise<void> {
  const forestId = String(req.params.id);
  await assertForestAccess(req, forestId);
  const scenes = await query<Record<string, unknown>>(
    `SELECT id, label, image_url, lat, lng, default_yaw, default_pitch, display_order, is_demo, is_active
       FROM forest_scenes WHERE forest_id = $1 AND is_active = TRUE ORDER BY display_order, id`,
    [forestId],
  );
  const ids = scenes.rows.map((s) => s.id as number);
  const hs = ids.length
    ? await query<Record<string, unknown>>(
        `SELECT h.id, h.scene_id, h.tree_id, h.yaw, h.pitch, ft.tree_unique_id,
                COALESCE(sp.common_name, sp.species_name) AS species
           FROM scene_hotspots h JOIN forest_trees ft ON ft.id = h.tree_id
           LEFT JOIN master_plantspecies sp ON sp.id = ft.master_plant_species_id
          WHERE h.scene_id = ANY($1::int[]) AND h.is_active = TRUE`,
        [ids],
      )
    : { rows: [] as Record<string, unknown>[] };
  const ln = ids.length
    ? await query<Record<string, unknown>>(
        `SELECT id, from_scene_id, to_scene_id, yaw, pitch, label FROM scene_links
          WHERE from_scene_id = ANY($1::int[]) AND is_active = TRUE`,
        [ids],
      )
    : { rows: [] as Record<string, unknown>[] };
  res.json({ data: { scenes: scenes.rows, hotspots: hs.rows, links: ln.rows } });
}

async function createScene(req: Request, res: Response): Promise<void> {
  const forestId = String(req.params.id);
  await assertForestAccess(req, forestId);
  const b = (req.body ?? {}) as Record<string, unknown>;
  const imageUrl = typeof b.image_url === 'string' ? b.image_url.trim() : '';
  if (!isAllowedPanoUrl(imageUrl)) {
    throw badRequest('image_url must be an https equirect image, a stored /panoramas URL, or an allowlisted host');
  }
  const label = typeof b.label === 'string' ? b.label.trim().slice(0, 120) || null : null;
  const r = await query<{ id: number }>(
    `INSERT INTO forest_scenes (forest_id, label, image_url, lat, lng, default_yaw, default_pitch, display_order, is_demo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [
      forestId, label, imageUrl,
      b.lat != null ? pnum(b.lat) : null, b.lng != null ? pnum(b.lng) : null,
      pnum(b.default_yaw), pnum(b.default_pitch), pnum(b.display_order),
      b.is_demo === true,
    ],
  );
  res.status(201).json({ data: { id: r.rows[0]!.id } });
}

async function deleteScene(req: Request, res: Response): Promise<void> {
  const forestId = String(req.params.id);
  await assertForestAccess(req, forestId);
  const sid = Number(req.params.sid);
  if (!Number.isInteger(sid)) throw badRequest('invalid scene id');
  // Soft-delete the scene and its hotspots + links (in or out).
  await query(`UPDATE forest_scenes SET is_active = FALSE WHERE id = $1 AND forest_id = $2`, [sid, forestId]);
  await query(`UPDATE scene_hotspots SET is_active = FALSE WHERE scene_id = $1`, [sid]);
  await query(`UPDATE scene_links SET is_active = FALSE WHERE from_scene_id = $1 OR to_scene_id = $1`, [sid]);
  res.json({ data: { id: sid, removed: true } });
}

/** assert a scene belongs to the forest; returns nothing or throws 404. */
async function assertSceneInForest(sceneId: number, forestId: string): Promise<void> {
  const r = await query(`SELECT 1 FROM forest_scenes WHERE id = $1 AND forest_id = $2 AND is_active = TRUE`, [sceneId, forestId]);
  if (r.rowCount === 0) throw notFound('Scene not found in this forest');
}

async function addHotspot(req: Request, res: Response): Promise<void> {
  const forestId = String(req.params.id);
  await assertForestAccess(req, forestId);
  const sid = Number(req.params.sid);
  if (!Number.isInteger(sid)) throw badRequest('invalid scene id');
  await assertSceneInForest(sid, forestId);
  const b = (req.body ?? {}) as Record<string, unknown>;
  const yaw = pnum(b.yaw);
  const pitch = pnum(b.pitch);
  if (yaw < 0 || yaw > 360 || pitch < -90 || pitch > 90) throw badRequest('yaw 0-360, pitch -90..90');
  // Resolve the tree by id or unique id AND confirm it belongs to this forest.
  let treeId = typeof b.tree_id === 'string' ? b.tree_id : null;
  const tree = await query<{ id: string }>(
    treeId
      ? `SELECT id FROM forest_trees WHERE id = $1 AND forest_id = $2 AND is_active = TRUE`
      : `SELECT id FROM forest_trees WHERE tree_unique_id = $1 AND forest_id = $2 AND is_active = TRUE`,
    [treeId ?? String(b.tree_unique_id ?? ''), forestId],
  );
  if (tree.rowCount === 0) throw badRequest('tree not found in this forest (cross-forest hotspots are rejected)');
  treeId = tree.rows[0]!.id;
  const r = await query<{ id: number }>(
    `INSERT INTO scene_hotspots (scene_id, tree_id, yaw, pitch) VALUES ($1,$2,$3,$4)
     ON CONFLICT (scene_id, tree_id) DO UPDATE SET yaw = EXCLUDED.yaw, pitch = EXCLUDED.pitch, is_active = TRUE
     RETURNING id`,
    [sid, treeId, yaw, pitch],
  );
  res.status(201).json({ data: { id: r.rows[0]!.id, tree_id: treeId } });
}

async function deleteHotspot(req: Request, res: Response): Promise<void> {
  const forestId = String(req.params.id);
  await assertForestAccess(req, forestId);
  const hid = Number(req.params.hid);
  if (!Number.isInteger(hid)) throw badRequest('invalid hotspot id');
  await query(
    `UPDATE scene_hotspots SET is_active = FALSE
      WHERE id = $1 AND scene_id IN (SELECT id FROM forest_scenes WHERE forest_id = $2)`,
    [hid, forestId],
  );
  res.json({ data: { id: hid, removed: true } });
}

async function addLink(req: Request, res: Response): Promise<void> {
  const forestId = String(req.params.id);
  await assertForestAccess(req, forestId);
  const sid = Number(req.params.sid);
  const b = (req.body ?? {}) as Record<string, unknown>;
  const toId = Number(b.to_scene_id);
  if (!Number.isInteger(sid) || !Number.isInteger(toId)) throw badRequest('invalid scene id');
  if (sid === toId) throw badRequest('a scene cannot link to itself');
  await assertSceneInForest(sid, forestId);
  await assertSceneInForest(toId, forestId); // both must be in the SAME forest
  const label = typeof b.label === 'string' ? b.label.trim().slice(0, 80) || null : null;
  const r = await query<{ id: number }>(
    `INSERT INTO scene_links (from_scene_id, to_scene_id, yaw, pitch, label) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [sid, toId, pnum(b.yaw), pnum(b.pitch), label],
  );
  res.status(201).json({ data: { id: r.rows[0]!.id } });
}

async function deleteLink(req: Request, res: Response): Promise<void> {
  const forestId = String(req.params.id);
  await assertForestAccess(req, forestId);
  const lid = Number(req.params.lid);
  if (!Number.isInteger(lid)) throw badRequest('invalid link id');
  await query(
    `UPDATE scene_links SET is_active = FALSE
      WHERE id = $1 AND from_scene_id IN (SELECT id FROM forest_scenes WHERE forest_id = $2)`,
    [lid, forestId],
  );
  res.json({ data: { id: lid, removed: true } });
}

// ---------------------------------------------------------------------------
// Gifting: every tree can be gifted to a recipient (name + email); sending
// emails them a link to the tree's live certificate / report card.
// ---------------------------------------------------------------------------
function appBase(req: Request): string {
  return process.env.APP_URL || `https://${req.get('host')}`;
}

async function assertTreeInForest(treeId: string, forestId: string): Promise<{ species: string | null; uid: string | null; forest_name: string | null }> {
  const r = await query<{ species: string | null; uid: string | null; forest_name: string | null }>(
    `SELECT COALESCE(sp.common_name, sp.species_name) AS species, ft.tree_unique_id AS uid, f.forest_name
       FROM forest_trees ft
       JOIN forests f ON f.id = ft.forest_id
       LEFT JOIN master_plantspecies sp ON sp.id = ft.master_plant_species_id
      WHERE ft.id = $1 AND ft.forest_id = $2 AND ft.is_active = TRUE`,
    [treeId, forestId],
  );
  if (r.rowCount === 0) throw notFound('Tree not found in this forest');
  return r.rows[0]!;
}

async function listGifts(req: Request, res: Response): Promise<void> {
  const forestId = String(req.params.id);
  await assertForestAccess(req, forestId);
  const r = await query<Record<string, unknown>>(
    `SELECT g.id, g.gift_tree_id, g.name, g.email_id, g.message, g.is_email_sent, ft.tree_unique_id
       FROM gift_forest_plants g
       JOIN forest_trees ft ON ft.id = g.gift_tree_id
      WHERE ft.forest_id = $1 AND g.is_active = TRUE
      ORDER BY ft.tree_unique_id`,
    [forestId],
  );
  res.json({ data: r.rows, mail_ready: mailReady() });
}

async function setGift(req: Request, res: Response): Promise<void> {
  const forestId = String(req.params.id);
  await assertForestAccess(req, forestId);
  const treeId = String(req.params.treeId);
  await assertTreeInForest(treeId, forestId);
  const b = (req.body ?? {}) as Record<string, unknown>;
  const name = typeof b.name === 'string' ? b.name.trim().slice(0, 120) || null : null;
  const email = typeof b.email === 'string' ? b.email.trim().slice(0, 200) || null : null;
  const message = typeof b.message === 'string' ? b.message.trim().slice(0, 500) || null : null;
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw badRequest('invalid email');
  const certUrl = `/report/tree/${treeId}`;
  const actor = req.auth?.profileId ?? null;
  const existing = await query<{ id: string }>(
    `SELECT id FROM gift_forest_plants WHERE gift_tree_id = $1 AND is_active = TRUE LIMIT 1`,
    [treeId],
  );
  if (existing.rowCount) {
    await query(
      `UPDATE gift_forest_plants SET name=$2, email_id=$3, message=$4, gift_certificate_url=$5, updated_by=$6, updated_at=now() WHERE id=$1`,
      [existing.rows[0]!.id, name, email, message, certUrl, actor],
    );
  } else {
    await query(
      `INSERT INTO gift_forest_plants (gift_tree_id, name, email_id, message, gift_certificate_url, allocating_on, is_email_sent, is_active, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5, CURRENT_DATE, FALSE, TRUE, $6,$6)`,
      [treeId, name, email, message, certUrl, actor],
    );
  }
  res.json({ data: { tree_id: treeId, name, email, message } });
}

async function sendGift(req: Request, res: Response): Promise<void> {
  const forestId = String(req.params.id);
  await assertForestAccess(req, forestId);
  if (!mailReady()) throw badRequest('email not configured — set RESEND_API_KEY (resend.com) in env, then redeploy');
  const treeId = String(req.params.treeId);
  const tree = await assertTreeInForest(treeId, forestId);
  const g = await query<{ id: string; name: string | null; email_id: string | null; message: string | null }>(
    `SELECT id, name, email_id, message FROM gift_forest_plants WHERE gift_tree_id = $1 AND is_active = TRUE LIMIT 1`,
    [treeId],
  );
  if (g.rowCount === 0 || !g.rows[0]!.email_id) throw badRequest('set a recipient email for this tree first');
  await sendGiftEmail({
    to: g.rows[0]!.email_id!,
    recipientName: g.rows[0]!.name,
    species: tree.species,
    treeUid: tree.uid,
    forestName: tree.forest_name,
    message: g.rows[0]!.message,
    certUrl: `${appBase(req)}/report/tree/${treeId}`,
  });
  await query(`UPDATE gift_forest_plants SET is_email_sent = TRUE, updated_at = now() WHERE id = $1`, [g.rows[0]!.id]);
  res.json({ data: { tree_id: treeId, sent_to: g.rows[0]!.email_id } });
}

async function sendAllGifts(req: Request, res: Response): Promise<void> {
  const forestId = String(req.params.id);
  await assertForestAccess(req, forestId);
  if (!mailReady()) throw badRequest('email not configured — set RESEND_API_KEY (resend.com) in env, then redeploy');
  const resend = String((req.body as Record<string, unknown>)?.resend ?? '') === 'true';
  const rows = await query<{ tree_id: string; name: string | null; email_id: string; message: string | null; species: string | null; uid: string | null; forest_name: string | null }>(
    `SELECT g.gift_tree_id AS tree_id, g.name, g.email_id, g.message,
            COALESCE(sp.common_name, sp.species_name) AS species, ft.tree_unique_id AS uid, f.forest_name
       FROM gift_forest_plants g
       JOIN forest_trees ft ON ft.id = g.gift_tree_id
       JOIN forests f ON f.id = ft.forest_id
       LEFT JOIN master_plantspecies sp ON sp.id = ft.master_plant_species_id
      WHERE ft.forest_id = $1 AND g.is_active = TRUE AND g.email_id IS NOT NULL
        AND ($2::boolean OR g.is_email_sent = FALSE)`,
    [forestId, resend],
  );
  let sent = 0;
  const errors: string[] = [];
  for (const r of rows.rows) {
    try {
      await sendGiftEmail({
        to: r.email_id, recipientName: r.name, species: r.species, treeUid: r.uid,
        forestName: r.forest_name, message: r.message, certUrl: `${appBase(req)}/report/tree/${r.tree_id}`,
      });
      await query(`UPDATE gift_forest_plants SET is_email_sent = TRUE, updated_at = now() WHERE gift_tree_id = $1 AND is_active = TRUE`, [r.tree_id]);
      sent++;
    } catch (e) {
      errors.push(`${r.uid ?? r.tree_id}: ${e instanceof Error ? e.message : 'failed'}`);
    }
  }
  res.json({ data: { sent, total: rows.rowCount, errors } });
}

/**
 * GET /admin/integrity — SuperAdmin review queue: visits flagged for GPS-far-
 * from-forest (geo_suspect) or a reused/duplicate photo. Surfaces the
 * capture-integrity layer so a human can review suspect captures.
 */
async function adminIntegrity(req: Request, res: Response): Promise<void> {
  if (req.auth?.role !== 'SuperAdmin') throw forbidden('SuperAdmin only');
  const rows = await query<Record<string, unknown>>(
    `SELECT tl.id, tl.timeline_date, tl.geo_suspect, tl.geo_distance_m,
            ft.id AS tree_id, ft.tree_unique_id, f.id AS forest_id, f.forest_name,
            (SELECT bool_or(a.is_duplicate) FROM forest_plant_timeline_assets a
              WHERE a.timeline_id = tl.id AND a.is_active = TRUE) AS dup
       FROM forest_plant_timelines tl
       JOIN forest_trees ft ON ft.id = tl.plant_id
       JOIN forests f ON f.id = ft.forest_id
      WHERE tl.is_active = TRUE
        AND ( tl.geo_suspect = TRUE
              OR EXISTS (SELECT 1 FROM forest_plant_timeline_assets a
                          WHERE a.timeline_id = tl.id AND a.is_duplicate = TRUE) )
      ORDER BY tl.timeline_date DESC NULLS LAST, tl.id DESC
      LIMIT 200`,
  );
  res.json({
    data: rows.rows.map((r) => ({
      timeline_id: r.id,
      date: r.timeline_date,
      geo_suspect: Boolean(r.geo_suspect),
      geo_distance_m: r.geo_distance_m != null ? Math.round(Number(r.geo_distance_m)) : null,
      photo_duplicate: Boolean(r.dup),
      tree_id: r.tree_id,
      tree_unique_id: r.tree_unique_id,
      forest_id: r.forest_id,
      forest_name: r.forest_name,
    })),
  });
}

/**
 * GET /admin/planters — SuperAdmin: list Planter accounts + their assigned forests.
 */
async function listPlanters(req: Request, res: Response): Promise<void> {
  if (req.auth?.role !== 'SuperAdmin') throw forbidden('SuperAdmin only');
  const rows = await query<Record<string, unknown>>(
    `SELECT up.id, up.username, up.first_name,
            COALESCE(json_agg(DISTINCT f.forest_name) FILTER (WHERE f.id IS NOT NULL), '[]') AS forests
       FROM user_profiles up
       JOIN user_roles ur ON ur.profile_id = up.id AND ur.role_id = 4 AND ur.is_active = TRUE
       LEFT JOIN user_role_forest_accesses a ON a.user_role_id = ur.id AND a.is_active = TRUE
       LEFT JOIN forests f ON f.id = a.forest_id
      WHERE up.is_active = TRUE
      GROUP BY up.id ORDER BY up.username`,
  );
  res.json({
    data: rows.rows.map((r) => ({
      id: r.id,
      username: r.username,
      name: r.first_name,
      forests: Array.isArray(r.forests) ? r.forests.filter(Boolean) : [],
    })),
  });
}

/**
 * POST /admin/planters — SuperAdmin: create a Planter (field worker) scoped to
 * forests. Body: { username, password, name?, forest_ids: [uuid] }.
 */
async function createPlanter(req: Request, res: Response): Promise<void> {
  if (req.auth?.role !== 'SuperAdmin') throw forbidden('SuperAdmin only');
  const b = (req.body ?? {}) as Record<string, unknown>;
  const username = typeof b.username === 'string' ? b.username.trim() : '';
  const password = typeof b.password === 'string' ? b.password : '';
  const name = typeof b.name === 'string' ? b.name.trim() : null;
  const forestIds = Array.isArray(b.forest_ids)
    ? (b.forest_ids as unknown[]).map(String).filter((x) => /^[0-9a-f-]{36}$/i.test(x))
    : [];
  if (!username || password.length < 6) {
    throw badRequest('username and a password (6+ chars) are required');
  }
  const exists = await query(`SELECT 1 FROM user_profiles WHERE username = $1 LIMIT 1`, [username]);
  if ((exists.rowCount ?? 0) > 0) throw badRequest('That username is already taken');

  const actor = req.auth?.profileId ?? null;
  const hash = await bcrypt.hash(password, 10);
  const client = await getClient();
  try {
    const prof = await client.query<{ id: string }>(
      `INSERT INTO user_profiles (first_name, username, password_hash, is_active, is_verified, created_by, updated_by)
       VALUES ($1, $2, $3, TRUE, TRUE, $4, $4) RETURNING id`,
      [name, username, hash, actor],
    );
    const profileId = prof.rows[0]!.id;
    const role = await client.query<{ id: string }>(
      `INSERT INTO user_roles (profile_id, role_id, is_active, created_by, updated_by)
       VALUES ($1, 4, TRUE, $2, $2) RETURNING id`,
      [profileId, actor],
    );
    const roleId = role.rows[0]!.id;
    for (const fid of forestIds) {
      await client.query(
        `INSERT INTO user_role_forest_accesses (user_role_id, forest_id, is_active, created_by, updated_by)
         VALUES ($1, $2, TRUE, $3, $3)`,
        [roleId, fid, actor],
      );
    }
    res.json({ data: { id: profileId, username, name, forests: forestIds.length } });
  } finally {
    client.release();
  }
}

/**
 * GET /admin/planters — list field-worker (Planter) accounts + their assigned
 * forests. SuperAdmin only.
 */
async function adminPlanters(req: Request, res: Response): Promise<void> {
  if (req.auth?.role !== 'SuperAdmin') throw forbidden('SuperAdmin only');
  const rows = await query<{ id: string; first_name: string | null; username: string | null; forests: string[] }>(
    `SELECT up.id, up.first_name, up.username,
            COALESCE(array_remove(array_agg(DISTINCT f.forest_name), NULL), '{}') AS forests
       FROM user_profiles up
       JOIN user_roles ur ON ur.profile_id = up.id AND ur.role_id = 4 AND ur.is_active = TRUE
       LEFT JOIN user_role_forest_accesses a ON a.user_role_id = ur.id AND a.is_active = TRUE
       LEFT JOIN forests f ON f.id = a.forest_id
      WHERE up.is_active = TRUE
      GROUP BY up.id, up.first_name, up.username
      ORDER BY up.username`,
  );
  res.json({
    data: rows.rows.map((r) => ({ id: r.id, name: r.first_name, username: r.username, forests: r.forests })),
  });
}

/**
 * POST /admin/planters — create a Planter account scoped to forests.
 * Body: { username, password, first_name?, forest_ids: uuid[] }. SuperAdmin only.
 */
async function adminCreatePlanter(req: Request, res: Response): Promise<void> {
  if (req.auth?.role !== 'SuperAdmin') throw forbidden('SuperAdmin only');
  const b = (req.body ?? {}) as Record<string, unknown>;
  const username = String(b.username ?? '').trim();
  const password = String(b.password ?? '');
  const name = String(b.first_name ?? b.name ?? '').trim() || null;
  const forestIds = Array.isArray(b.forest_ids) ? (b.forest_ids as unknown[]).map(String) : [];
  if (!username || password.length < 6) throw badRequest('username and a 6+ character password are required');
  const dup = await query(`SELECT 1 FROM user_profiles WHERE username = $1`, [username]);
  if (dup.rowCount) throw badRequest('username already taken');

  const hash = await bcrypt.hash(password, 10);
  const actor = req.auth?.profileId ?? null;
  const client = await getClient();
  try {
    const p = await client.query<{ id: string }>(
      `INSERT INTO user_profiles (first_name, username, password_hash, is_active, is_verified, created_by, updated_by)
       VALUES ($1,$2,$3,TRUE,TRUE,$4,$4) RETURNING id`,
      [name, username, hash, actor],
    );
    const pid = p.rows[0]!.id;
    const ur = await client.query<{ id: string }>(
      `INSERT INTO user_roles (profile_id, role_id, is_active, created_by, updated_by)
       VALUES ($1,4,TRUE,$2,$2) RETURNING id`,
      [pid, actor],
    );
    const urid = ur.rows[0]!.id;
    for (const fid of forestIds) {
      await client.query(
        `INSERT INTO user_role_forest_accesses (user_role_id, forest_id, is_active, created_by, updated_by)
         VALUES ($1,$2,TRUE,$3,$3)`,
        [urid, fid, actor],
      );
    }
    res.json({ data: { id: pid, username, forests: forestIds.length } });
  } finally {
    client.release();
  }
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
forestRouter.post('/forest/:id/trees/:treeId/visit', upload.any(), wrap(logTreeVisit));
forestRouter.get('/my/forests', wrap(myForests));
forestRouter.post('/forest/:id/boundary', wrap(setForestBoundary));
forestRouter.get('/forest/:id/panoramas', wrap(listPanoramas));
forestRouter.post('/forest/:id/panoramas', wrap(addPanorama));
forestRouter.post('/forest/:id/panoramas/:pid/delete', wrap(deletePanorama));
// 360 tour: scenes + hotspots + links
forestRouter.get('/forest/:id/scenes', wrap(listScenesAdmin));
forestRouter.post('/forest/:id/scenes', wrap(createScene));
forestRouter.post('/forest/:id/scenes/upload', sceneUpload.single('image'), wrap(uploadSceneImage));
forestRouter.post('/forest/:id/scenes/:sid/delete', wrap(deleteScene));
forestRouter.post('/forest/:id/scenes/:sid/hotspots', wrap(addHotspot));
forestRouter.post('/forest/:id/hotspots/:hid/delete', wrap(deleteHotspot));
forestRouter.post('/forest/:id/scenes/:sid/links', wrap(addLink));
forestRouter.post('/forest/:id/links/:lid/delete', wrap(deleteLink));
// Gifting: recipient per tree + email the certificate
forestRouter.get('/forest/:id/gifts', wrap(listGifts));
forestRouter.post('/forest/:id/trees/:treeId/gift', wrap(setGift));
forestRouter.post('/forest/:id/trees/:treeId/gift/send', wrap(sendGift));
forestRouter.post('/forest/:id/gifts/send-all', wrap(sendAllGifts));
forestRouter.get('/admin/integrity', wrap(adminIntegrity));
forestRouter.get('/admin/planters', wrap(adminPlanters));
forestRouter.post('/admin/planters', wrap(adminCreatePlanter));
forestRouter.get('/admin/planters', wrap(listPlanters));
forestRouter.post('/admin/planters', wrap(createPlanter));
