/**
 * Write routes — aligned to the CONFIRMED live contracts
 * (spec/write_contracts.md, verified 2026-06-16):
 *
 *   POST /api/v1/<entity>/upsert   (multipart/form-data OR application/json)
 *       - NO id in body  => INSERT
 *       - id present      => UPDATE
 *       - file fields (logo/image) saved to /uploads, URL stored on the column
 *       - resp: { data: <full record> }
 *
 *   POST /api/v1/<entity>/delete   body { id, <entity>_id }  (sends both keys)
 *       - HARD delete by id (despite is_active existing — the live UI warns
 *         "cannot be undone" + "detaches from all forests/trees")
 *       - resp: { message: "<Entity> deleted successfully" }
 *
 * Every table row's action menu = View / Edit / Delete; Edit re-opens the
 * upsert form prefilled (with id) — handled entirely client-side, the server
 * just sees an upsert-with-id.
 *
 * SECURITY: entity AND every writable column are whitelisted. Unknown entities
 * -> 400; unknown body keys are dropped (only whitelisted columns persist). All
 * SQL is parameterised; identifiers come only from the static whitelist.
 *
 * Special cases:
 *   - users: split across user_profiles + user_roles (upsert profile then role;
 *     delete removes role rows then the profile). See upsertUser/deleteUser.
 *   - forest: the wizard payload (basic + grid + boxes) fans out into
 *     forest + forest_boxes + forest_trees + forest_clusters + join rows, and a
 *     jobs row (job_type 'forest_upsert_v1', status 'completed') is inserted to
 *     mirror the live async-job behaviour. Done synchronously here; prod runs it
 *     async (see comment in upsertForest).
 */
import { Router, type Request, type Response, type NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { query, getClient } from '../db';
import { badRequest, notFound } from '../errors';
import { putObject, storageReady } from '../lib/storage';

export const crudRouter = Router();

/* ------------------------------------------------------------------ */
/* Uploads — multipart file fields saved to /uploads, served statically */
/* ------------------------------------------------------------------ */

export const UPLOADS_DIR =
  process.env.UPLOADS_DIR ?? path.resolve(__dirname, '..', '..', 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    // <fieldname>-<ts>-<original>, mirroring the live object-store naming
    // (e.g. sponsor_logo-<ts>-<file>) so stored URLs look like production.
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${file.fieldname}-${Date.now()}-${safe}`);
  },
});
// .any() because each entity has its own file field names (sponsor_logo,
// sponsor_forest_logo, profile_image, ...). JSON requests pass through untouched.
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

/** Public base URL for stored files (served by index.ts at /uploads). */
function fileUrl(req: Request, filename: string): string {
  return `${req.protocol}://${req.get('host')}/uploads/${filename}`;
}

/**
 * Resolve the public URL to persist for an uploaded file.
 *
 * Prefer DURABLE object storage (Supabase/Vercel Blob) so the URL survives a
 * redeploy/cold start — the local /uploads dir lives in Vercel's ephemeral /tmp
 * and is wiped on every cold start, which is why sponsor logos / employee+user
 * avatars used to vanish. Falls back to the local /uploads URL only when no
 * storage backend is configured (dev), so behaviour degrades gracefully.
 *
 * NOTE (prod): set SUPABASE_URL + SUPABASE_SERVICE_KEY + SUPABASE_BUCKET (or
 * BLOB_READ_WRITE_TOKEN) in Vercel or uploads still land in ephemeral /tmp.
 */
async function storedUrl(
  req: Request,
  f: Express.Multer.File,
  keyPrefix: string,
): Promise<string> {
  if (storageReady()) {
    try {
      const buf = fs.readFileSync(f.path);
      const url = await putObject(
        `${keyPrefix}/${f.filename}`,
        buf,
        f.mimetype || 'application/octet-stream',
      );
      // Best-effort cleanup of the local temp file; ignore failures.
      fs.unlink(f.path, () => undefined);
      return url;
    } catch {
      // Fall through to the local URL on any storage error.
    }
  }
  return fileUrl(req, f.filename);
}

/* ------------------------------------------------------------------ */
/* Whitelist: entity URL segment -> table + writable columns           */
/* ------------------------------------------------------------------ */

interface EntityConfig {
  table: string;
  /** Columns a client may set on upsert (snake_case DB columns). */
  columns: string[];
  /** File field name -> column that stores its URL. */
  fileFields?: Record<string, string>;
  /** jsonb columns (values JSON.stringify'd before binding). */
  jsonbColumns?: Set<string>;
  /** Singular label used in the delete message ("Sponsor deleted successfully"). */
  label: string;
  /**
   * Whether the table has created_by/updated_by audit columns. Defaults to true.
   * Set false for tables that only track created_at/updated_at (e.g.
   * master_plantspecies) so the generic upsert doesn't write missing columns.
   */
  trackActor?: boolean;
}

const SPONSOR: EntityConfig = {
  table: 'sponsors',
  label: 'Sponsor',
  columns: [
    'sponsor_name',
    'sponsor_email',
    'sponsor_logo',
    'sponsor_forest_logo',
    'sponsor_tree_logo',
    'sponsor_og_image_url',
    'established_year',
    'website_url',
    'industry',
    'headquarters',
    'is_active',
  ],
  fileFields: {
    sponsor_logo: 'sponsor_logo',
    sponsor_forest_logo: 'sponsor_forest_logo',
    sponsor_tree_logo: 'sponsor_tree_logo',
    sponsor_og_image_url: 'sponsor_og_image_url',
  },
};

const EMPLOYEE: EntityConfig = {
  table: 'employees',
  label: 'Employee',
  columns: ['name', 'profile_image', 'designation', 'contact_no', 'email_id', 'is_active'],
  fileFields: { profile_image: 'profile_image' },
};

const REPORT: EntityConfig = {
  table: 'reports',
  label: 'Report',
  columns: [
    'year',
    'quarter',
    'report_date',
    'plantation_date',
    'start_date',
    'end_date',
    'mode',
    'type',
    'version',
    'report_data',
    'project_period',
    'skip',
    'forest_id',
    'is_active',
  ],
  jsonbColumns: new Set(['report_data', 'skip']),
};

const SPECIES: EntityConfig = {
  table: 'master_plantspecies',
  label: 'Species',
  // No created_by/updated_by on this table — only created_at/updated_at.
  trackActor: false,
  columns: [
    'species_name',
    'common_name',
    'species_category',
    'species_desc',
    'oxygen_per_day',
    'carbon_offset_per_day',
    'rate',
    'wood_density',
    'is_timber_production',
    'is_flowering_plant',
    'is_fruit_bearing',
    'is_nesting_habitat',
    'is_active',
  ],
};

// Generic-path entities. Forest + users have dedicated handlers (below).
const ENTITIES: Record<string, EntityConfig> = {
  sponsor: SPONSOR,
  sponsors: SPONSOR, // accept plural alias for symmetry with list routes
  employee: EMPLOYEE,
  employees: EMPLOYEE,
  report: REPORT,
  reports: REPORT,
  species: SPECIES,
  'master-plantspecies': SPECIES, // alias matching the list route segment
};

/** Map a camelCase body key to a snake_case column. */
function toSnake(key: string): string {
  return key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
}

/**
 * Merge multer text fields + parsed JSON body + uploaded files into one
 * snake_case record limited to the entity's whitelisted columns.
 */
async function collectColumns(
  req: Request,
  cfg: EntityConfig
): Promise<{ cols: string[]; values: unknown[] }> {
  const allowed = new Set(cfg.columns);
  const jsonCols = cfg.jsonbColumns ?? new Set<string>();
  const out = new Map<string, unknown>();

  const body = (req.body ?? {}) as Record<string, unknown>;
  for (const [rawKey, rawVal] of Object.entries(body)) {
    const col = allowed.has(rawKey) ? rawKey : toSnake(rawKey);
    if (!allowed.has(col)) continue;
    // multipart text fields arrive as strings; jsonb cols may be JSON strings.
    let value: unknown = rawVal;
    if (jsonCols.has(col) && value !== null && value !== undefined) {
      value = typeof value === 'string' ? value : JSON.stringify(value);
    }
    out.set(col, value);
  }

  // Uploaded files override / set their URL columns — persisted to durable
  // object storage when configured (survives redeploys), local URL otherwise.
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  for (const f of files) {
    const col = cfg.fileFields?.[f.fieldname];
    if (col && allowed.has(col)) {
      out.set(col, await storedUrl(req, f, cfg.table));
    }
  }

  return { cols: [...out.keys()], values: [...out.values()] };
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

/** Pull the id from body (upsert) — present => UPDATE, absent => INSERT. */
function bodyId(req: Request): string | undefined {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const id = b.id;
  if (id === undefined || id === null || id === '') return undefined;
  return String(id);
}

/* ------------------------------------------------------------------ */
/* USERS — profile + role split                                        */
/* ------------------------------------------------------------------ */

interface UserUpsertBody {
  id?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  mobile?: string | number;
  mobileCountryCode?: string;
  imageUrl?: string;
  password?: string;
  roleId?: number | string;
}

async function upsertUser(req: Request, res: Response): Promise<void> {
  const b = (req.body ?? {}) as UserUpsertBody;
  const actor = req.auth?.profileId ?? null;
  const id = bodyId(req);

  // A profile_image / image_url file field, if uploaded.
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const imageFile = files.find(
    (f) => f.fieldname === 'image_url' || f.fieldname === 'profile_image'
  );
  // Durable storage when configured (survives redeploys); local URL otherwise.
  const imageUrl = imageFile ? await storedUrl(req, imageFile, 'users') : b.imageUrl;
  const roleId =
    b.roleId === undefined || b.roleId === null || b.roleId === ''
      ? undefined
      : Number(b.roleId);
  const mobileNo =
    b.mobile === undefined || b.mobile === null || b.mobile === ''
      ? undefined
      : String(b.mobile).replace(/\D/g, '');

  const client = await getClient();
  try {
    if (!id) {
      // INSERT
      if (!b.username || !b.password) throw badRequest('username and password are required');
      if (roleId === undefined) throw badRequest('roleId is required');

      const passwordHash = await bcrypt.hash(String(b.password), 10);
      const profile = await client.query<{ id: string }>(
        `INSERT INTO user_profiles
           (first_name, last_name, username, email_id, mobile_no,
            mobile_country_code, image_url, password_hash, is_active, created_by, updated_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE,$9,$9)
         RETURNING id`,
        [
          b.firstName ?? null,
          b.lastName ?? null,
          b.username,
          b.email ?? null,
          mobileNo ?? null,
          b.mobileCountryCode ?? null,
          imageUrl ?? null,
          passwordHash,
          actor,
        ]
      );
      const profileId = profile.rows[0]!.id;
      await client.query(
        `INSERT INTO user_roles (profile_id, role_id, is_active, created_by, updated_by)
         VALUES ($1,$2,TRUE,$3,$3)`,
        [profileId, roleId, actor]
      );
      const record = await fetchUserRecord(profileId);
      res.json({ data: record });
      return;
    }

    // UPDATE (id present)
    const cols: string[] = [];
    const values: unknown[] = [];
    const set = (col: string, val: unknown) => {
      if (val !== undefined) {
        cols.push(col);
        values.push(val);
      }
    };
    set('first_name', b.firstName);
    set('last_name', b.lastName);
    set('username', b.username);
    set('email_id', b.email);
    set('mobile_no', mobileNo);
    set('mobile_country_code', b.mobileCountryCode);
    set('image_url', imageUrl);
    if (b.password) {
      cols.push('password_hash');
      values.push(await bcrypt.hash(String(b.password), 10));
    }

    if (cols.length > 0) {
      const setSql = cols.map((c, i) => `${c} = $${i + 1}`).join(', ');
      const r = await client.query<{ id: string }>(
        `UPDATE user_profiles
            SET ${setSql}, updated_by = $${cols.length + 1}
          WHERE id = $${cols.length + 2}
          RETURNING id`,
        [...values, actor, id]
      );
      if (r.rowCount === 0) throw notFound('User not found');
    }

    if (roleId !== undefined) {
      // Update the active role row, or create one if none exists.
      const upd = await client.query(
        `UPDATE user_roles SET role_id = $1, updated_by = $2
          WHERE profile_id = $3 AND is_active = TRUE`,
        [roleId, actor, id]
      );
      if (upd.rowCount === 0) {
        await client.query(
          `INSERT INTO user_roles (profile_id, role_id, is_active, created_by, updated_by)
           VALUES ($1,$2,TRUE,$3,$3)`,
          [id, roleId, actor]
        );
      }
    }

    const record = await fetchUserRecord(id);
    res.json({ data: record });
  } finally {
    client.release();
  }
}

/** Return a user record in the same shape as users/list rows. */
async function fetchUserRecord(profileId: string): Promise<unknown> {
  const r = await query(
    `SELECT
       COALESCE(up.user_id, 0)  AS "id",
       up.id                    AS "profileId",
       up.first_name            AS "firstName",
       up.last_name             AS "lastName",
       up.image_url             AS "imageUrl",
       up.username              AS "username",
       mr.name                  AS "role",
       mr.id                    AS "roleId",
       ur.id                    AS "user_role_id",
       up.email_id              AS "email",
       up.mobile_no::text       AS "mobile"
     FROM user_profiles up
     LEFT JOIN user_roles ur ON ur.profile_id = up.id AND ur.is_active = TRUE
     LEFT JOIN master_roles mr ON mr.id = ur.role_id
     WHERE up.id = $1
     ORDER BY ur.created_at DESC
     LIMIT 1`,
    [profileId]
  );
  return r.rows[0] ?? { id: profileId };
}

async function deleteUser(req: Request, res: Response): Promise<void> {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const id = (b.id ?? b.user_id ?? b.users_id) as string | undefined;
  if (!id) throw badRequest('id is required');

  const client = await getClient();
  try {
    // HARD delete: remove role rows first (FK), then the profile.
    await client.query(`DELETE FROM user_roles WHERE profile_id = $1`, [id]);
    const r = await client.query<{ id: string }>(
      `DELETE FROM user_profiles WHERE id = $1 RETURNING id`,
      [id]
    );
    if (r.rowCount === 0) throw notFound('User not found');
    res.json({ message: 'User deleted successfully' });
  } finally {
    client.release();
  }
}

/* ------------------------------------------------------------------ */
/* FOREST upsert + the geo/dashboard/bulk-import reads now live in       */
/* routes/forest.ts (the FULL forest_create_payload.jsonc handler). Only */
/* the forest DELETE remains here, via the generic delete below.         */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Generic UPSERT / DELETE for whitelisted entities                    */
/* ------------------------------------------------------------------ */

async function genericUpsert(req: Request, res: Response, cfg: EntityConfig): Promise<void> {
  const actor = req.auth?.profileId ?? null;
  const id = bodyId(req);
  const { cols, values } = await collectColumns(req, cfg);
  const trackActor = cfg.trackActor !== false;

  if (!id) {
    // Guard: one report per (forest, year, quarter). Prevents duplicate quarters
    // (a non-technical operator clicking "create" twice) before the INSERT.
    if (cfg.table === 'reports') {
      const b = (req.body ?? {}) as Record<string, unknown>;
      if (b.forest_id != null && b.year != null && b.quarter != null) {
        const dup = await query(
          `SELECT 1 FROM reports WHERE forest_id = $1 AND year = $2 AND quarter = $3 AND is_active = TRUE LIMIT 1`,
          [b.forest_id, b.year, b.quarter],
        );
        if ((dup.rowCount ?? 0) > 0) {
          throw badRequest('A report for this forest, year and quarter already exists. Open the existing one instead.');
        }
      }
    }
    // INSERT
    if (cols.length === 0) throw badRequest('No valid fields provided');
    const allCols = trackActor ? [...cols, 'created_by', 'updated_by'] : [...cols];
    const allVals = trackActor ? [...values, actor, actor] : [...values];
    const placeholders = allCols.map((_, i) => `$${i + 1}`).join(', ');
    const r = await query<{ id: string }>(
      `INSERT INTO ${cfg.table} (${allCols.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      allVals
    );
    res.json({ data: r.rows[0] });
    return;
  }

  // UPDATE
  if (cols.length === 0) {
    // Nothing to change; return current record.
    const cur = await query(`SELECT * FROM ${cfg.table} WHERE id = $1`, [id]);
    if (cur.rowCount === 0) throw notFound(`${cfg.label} not found`);
    res.json({ data: cur.rows[0] });
    return;
  }
  const setSql = cols.map((c, i) => `${c} = $${i + 1}`).join(', ');
  const r = trackActor
    ? await query<Record<string, unknown>>(
        `UPDATE ${cfg.table} SET ${setSql}, updated_by = $${cols.length + 1}
          WHERE id = $${cols.length + 2} RETURNING *`,
        [...values, actor, id]
      )
    : await query<Record<string, unknown>>(
        `UPDATE ${cfg.table} SET ${setSql} WHERE id = $${cols.length + 1} RETURNING *`,
        [...values, id]
      );
  if (r.rowCount === 0) throw notFound(`${cfg.label} not found`);
  res.json({ data: r.rows[0] });
}

async function genericDelete(req: Request, res: Response, cfg: EntityConfig): Promise<void> {
  const b = (req.body ?? {}) as Record<string, unknown>;
  // The live contract sends both `id` and `<entity>_id`; accept either.
  const id = (b.id ?? b[`${entitySingular(cfg)}_id`]) as string | undefined;
  if (!id) throw badRequest('id is required');

  // HARD delete (live UI: "cannot be undone"). For forests, detach join rows
  // first so FKs don't block the delete (mirrors "detaches from all forests/trees").
  if (cfg.table === 'forests') {
    // Detach tree-level dependents (gift/donor FK forest_trees) before the
    // tree DELETE, then the forest's boxes/clusters/joins.
    await query(
      `DELETE FROM gift_forest_plants
        WHERE gift_tree_id IN (SELECT id FROM forest_trees WHERE forest_id = $1)`,
      [id]
    );
    await query(
      `DELETE FROM donor_trees
        WHERE tree_id IN (SELECT id FROM forest_trees WHERE forest_id = $1)`,
      [id]
    );
    // Proof timelines (+ their assets), carbon ledger, tour hotspots, and the
    // other per-tree tables all FK forest_trees — detach in dependency order
    // (was a 500 whenever a tree had a proof photo/visit). The carbon ledger FKs
    // forest_trees AND forest_plant_timelines AND forests, so it goes FIRST
    // (before the timelines it references).
    await query(
      `DELETE FROM forest_tree_carbon_ledger
        WHERE forest_id = $1
           OR tree_id IN (SELECT id FROM forest_trees WHERE forest_id = $1)
           OR timeline_id IN (SELECT id FROM forest_plant_timelines
                WHERE plant_id IN (SELECT id FROM forest_trees WHERE forest_id = $1))`,
      [id]
    );
    await query(
      `DELETE FROM forest_plant_timeline_assets
        WHERE timeline_id IN (SELECT id FROM forest_plant_timelines
          WHERE plant_id IN (SELECT id FROM forest_trees WHERE forest_id = $1))`,
      [id]
    );
    await query(
      `DELETE FROM forest_plant_timelines
        WHERE plant_id IN (SELECT id FROM forest_trees WHERE forest_id = $1)`,
      [id]
    );
    await query(
      `DELETE FROM scene_hotspots
        WHERE tree_id IN (SELECT id FROM forest_trees WHERE forest_id = $1)`,
      [id]
    );
    await query(
      `DELETE FROM forest_tree_activities
        WHERE forest_tree_id IN (SELECT id FROM forest_trees WHERE forest_id = $1)`,
      [id]
    );
    await query(
      `DELETE FROM forest_tree_sponsors
        WHERE forest_tree_id IN (SELECT id FROM forest_trees WHERE forest_id = $1)`,
      [id]
    );
    await query(
      `DELETE FROM tree_asserts
        WHERE tree_id IN (SELECT id FROM forest_trees WHERE forest_id = $1)`,
      [id]
    );
    await query(`DELETE FROM forest_trees WHERE forest_id = $1`, [id]);
    await query(`DELETE FROM forest_boxes WHERE forest_id = $1`, [id]);
    await query(`DELETE FROM forest_clusters WHERE forest_id = $1`, [id]);
    await query(`DELETE FROM forest_sponsors WHERE forest_id = $1`, [id]);
    await query(`DELETE FROM forests_employees WHERE forest_id = $1`, [id]);
    await query(`DELETE FROM forests_reports WHERE forest_id = $1`, [id]);
  }
  if (cfg.table === 'sponsors') {
    await query(`DELETE FROM forest_sponsors WHERE sponsor_id = $1`, [id]);
  }
  if (cfg.table === 'employees') {
    await query(`DELETE FROM forests_employees WHERE employee_id = $1`, [id]);
  }
  if (cfg.table === 'reports') {
    await query(`DELETE FROM forests_reports WHERE report_id = $1`, [id]);
  }

  const r = await query<{ id: string }>(`DELETE FROM ${cfg.table} WHERE id = $1 RETURNING id`, [
    id,
  ]);
  if (r.rowCount === 0) throw notFound(`${cfg.label} not found`);
  res.json({ message: `${cfg.label} deleted successfully` });
}

function entitySingular(cfg: EntityConfig): string {
  // sponsors -> sponsor, employees -> employee, reports -> report, forests -> forest
  return cfg.table.replace(/s$/, '').replace(/ie$/, 'y');
}

/* ------------------------------------------------------------------ */
/* Route registration                                                  */
/* ------------------------------------------------------------------ */

// Users (profile + role split). Plural + (defensive) singular.
crudRouter.post('/users/upsert', upload.any(), wrap(upsertUser));
crudRouter.post('/user/upsert', upload.any(), wrap(upsertUser));
crudRouter.post('/users/delete', upload.any(), wrap(deleteUser));
crudRouter.post('/user/delete', upload.any(), wrap(deleteUser));

// Forest UPSERT is handled by routes/forest.ts (full payload). Only DELETE
// remains here (hard delete + detach join rows), via genericDelete.
crudRouter.post(
  '/forest/delete',
  upload.any(),
  wrap((req, res) => genericDelete(req, res, { table: 'forests', label: 'Forest', columns: [] }))
);
crudRouter.post(
  '/forests/delete',
  upload.any(),
  wrap((req, res) => genericDelete(req, res, { table: 'forests', label: 'Forest', columns: [] }))
);

// Generic entities (sponsor(s), employee(s), report(s)).
crudRouter.post(
  '/:entity/upsert',
  upload.any(),
  wrap(async (req, res) => {
    const cfg = ENTITIES[req.params.entity ?? ''];
    if (!cfg) throw badRequest(`Unknown or unsupported entity: ${req.params.entity}`);
    await genericUpsert(req, res, cfg);
  })
);
crudRouter.post(
  '/:entity/delete',
  upload.any(),
  wrap(async (req, res) => {
    const cfg = ENTITIES[req.params.entity ?? ''];
    if (!cfg) throw badRequest(`Unknown or unsupported entity: ${req.params.entity}`);
    await genericDelete(req, res, cfg);
  })
);
