/**
 * Vercel serverless entry point for the COMMUNITREE admin platform.
 *
 * Backend selection (mirrors app/server/src/db.ts):
 *   - DATABASE_URL set   -> real Postgres (Neon). Data PERSISTS across cold starts.
 *   - DATABASE_URL unset -> embedded PGlite in /tmp. Data RESETS on cold start.
 *
 * On cold start:
 *   1. Points uploads at /tmp (only writable path on Vercel).
 *   2. Runs SQL migrations inline (idempotent, seeds admin user).
 *   3. Optionally rotates the seeded admin password to ADMIN_PASSWORD.
 *   4. Loads the compiled Express app (which picks the backend itself).
 *
 * The Express app re-uses the same pool/PGlite instance for the function's
 * warm lifecycle.
 */

'use strict';

const path = require('path');
const fs = require('fs');

const HAS_PG = !!process.env.DATABASE_URL;

// Uploads always go to /tmp (only writable path on Vercel).
if (!process.env.UPLOADS_DIR) {
  process.env.UPLOADS_DIR = '/tmp/uploads';
}
// PGlite fallback dir only matters when no Postgres is configured.
if (!HAS_PG && !process.env.PGLITE_DIR) {
  process.env.PGLITE_DIR = '/tmp/.pglite-data';
}

const MIGRATIONS_DIR = path.resolve(__dirname, '../app/db/migrations');

// bcrypt hash of the insecure default "communitree123" baked into 002_seed.sql.
// We only rotate a password that STILL matches this — never one the user changed.
const DEFAULT_ADMIN_HASH =
  '$2a$10$ceAYDt3bwrQBCOTepXLqseNPHQnJ59S7J1blahNXbx0zYB5iM9FF6';

function readMigrations() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((file) => ({
      file,
      sql: fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'),
    }));
}

// Replace the insecure seeded admin password with ADMIN_PASSWORD, if set.
// `run` takes {text, values} and runs one parameterized statement.
async function rotateAdminPassword(run) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return;
  const bcrypt = require('bcryptjs');
  const hash = await bcrypt.hash(pw, 10);
  const username = process.env.ADMIN_USERNAME || 'communitree_admin';
  await run({
    text: 'UPDATE user_profiles SET password_hash = $1 WHERE username = $2 AND password_hash = $3',
    values: [hash, username, DEFAULT_ADMIN_HASH],
  });
}

// Run migrations once per cold start via a lazy promise.
let migrationPromise = null;

function ensureMigrated() {
  if (!migrationPromise) {
    migrationPromise = (async () => {
      const files = readMigrations();
      if (HAS_PG) {
        const { Client } = await import('pg');
        // Use the POOLED endpoint: Neon only publishes DNS for the -pooler host,
        // and multi-statement DDL/seed files run fine through it in one
        // simple-query round trip (verified against this Neon instance).
        const client = new Client({ connectionString: process.env.DATABASE_URL });
        await client.connect();
        try {
          for (const { file, sql } of files) {
            try {
              await client.query(sql);
            } catch (e) {
              // A single bad migration must NOT take down the whole API. Log it
              // and continue — the app boots and every other migration still runs.
              console.error(`[vercel] migration ${file} failed (continuing):`, e && e.message ? e.message : e);
            }
          }
          await rotateAdminPassword((q) => client.query(q.text, q.values));
        } finally {
          await client.end();
        }
        console.log('[vercel] migrations applied to Postgres');
      } else {
        const { PGlite } = await import('@electric-sql/pglite');
        const db = new PGlite(process.env.PGLITE_DIR);
        await db.waitReady;
        try {
          for (const { file, sql } of files) {
            try {
              await db.exec(sql);
            } catch (e) {
              console.error(`[vercel] migration ${file} failed (continuing):`, e && e.message ? e.message : e);
            }
          }
          await rotateAdminPassword((q) => db.query(q.text, q.values));
        } finally {
          await db.close();
        }
        console.log('[vercel] migrations applied to', process.env.PGLITE_DIR);
      }
    })().catch((err) => {
      console.error('[vercel] migration failed:', err);
      migrationPromise = null; // allow retry
      throw err;
    });
  }
  return migrationPromise;
}

// Lazy-load the Express app after env is set + migrations are done.
let appInstance = null;

function getApp() {
  if (!appInstance) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    appInstance = require('../app/server/dist/server/src/index').app;
  }
  return appInstance;
}

module.exports = async function handler(req, res) {
  await ensureMigrated();
  const app = getApp();
  return new Promise((resolve, reject) => {
    res.on('finish', resolve);
    res.on('error', reject);
    app(req, res);
  });
};
