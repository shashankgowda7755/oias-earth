/**
 * Vercel serverless entry point for the CommuniTREE admin platform.
 *
 * On cold start:
 *   1. Points PGlite at /tmp (only writable path on Vercel)
 *   2. Runs SQL migrations inline (idempotent, seeds admin user)
 *   3. Loads the compiled Express app
 *
 * Every request is then handled by the Express app, which re-uses the
 * same PGlite instance for the function's warm lifecycle.
 *
 * Data resets on cold starts — tables/admin are re-seeded automatically.
 * For persistence, set DATABASE_URL to a Postgres connection string.
 */

'use strict';

const path = require('path');
const fs = require('fs');

// MUST be set before requiring app (db.ts reads this on first query)
if (!process.env.PGLITE_DIR) {
  process.env.PGLITE_DIR = '/tmp/.pglite-data';
}

const MIGRATIONS_DIR = path.resolve(__dirname, '../app/db/migrations');

// Run migrations once per cold start via a lazy promise.
let migrationPromise = null;

function ensureMigrated() {
  if (!migrationPromise) {
    migrationPromise = (async () => {
      const { PGlite } = await import('@electric-sql/pglite');
      const db = new PGlite(process.env.PGLITE_DIR);
      await db.waitReady;
      const files = fs
        .readdirSync(MIGRATIONS_DIR)
        .filter((f) => f.endsWith('.sql'))
        .sort();
      for (const f of files) {
        const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8');
        await db.exec(sql);
      }
      await db.close();
      console.log('[vercel] migrations applied to', process.env.PGLITE_DIR);
    })().catch((err) => {
      console.error('[vercel] migration failed:', err);
      migrationPromise = null; // allow retry
      throw err;
    });
  }
  return migrationPromise;
}

// Lazy-load the Express app after PGLITE_DIR is set + migrations are done.
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
