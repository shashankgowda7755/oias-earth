/**
 * Raw-SQL migration runner — dual backend.
 *
 * Applies every *.sql file in ../../db/migrations in lexical order
 * (001_init.sql then 002_seed.sql) against the ACTIVE backend:
 *   - node-postgres Pool  when DATABASE_URL is set, OR
 *   - embedded PGlite     when DATABASE_URL is unset (persisted to
 *     ../.pglite-data so the migrated schema survives restarts).
 *
 * Usage:  npm run migrate
 *
 * Idempotency: 001_init uses CREATE TABLE/INDEX IF NOT EXISTS; 002_seed uses
 * ON CONFLICT DO NOTHING + guarded setval(), so re-running is safe.
 *
 * NOTE: this is plain JS (no ts build step) so it runs before/independently of
 * the server. The dual-backend logic mirrors src/db.ts.
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const MIGRATIONS_DIR = path.resolve(__dirname, '..', '..', 'db', 'migrations');
const PGLITE_DIR = process.env.PGLITE_DIR ?? path.resolve(__dirname, '..', '.pglite-data');
const DATABASE_URL = process.env.DATABASE_URL || '';

function readMigrations() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((file) => ({ file, sql: fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8') }));
}

async function migratePostgres(files) {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: DATABASE_URL });
  try {
    for (const { file, sql } of files) {
      process.stdout.write(`-> applying ${file} (postgres) ... `);
      // pg simple-query protocol runs the whole multi-statement file in one go.
      await pool.query(sql);
      process.stdout.write('done\n');
    }
  } finally {
    await pool.end();
  }
}

async function migratePglite(files) {
  // ESM-only package — dynamic import from CommonJS.
  const { PGlite } = await import('@electric-sql/pglite');
  const db = new PGlite(PGLITE_DIR);
  await db.waitReady;
  try {
    for (const { file, sql } of files) {
      process.stdout.write(`-> applying ${file} (pglite) ... `);
      // db.exec() runs a multi-statement script (no params) — the right call
      // for whole .sql files. db.query() is single-statement + params only.
      await db.exec(sql);
      process.stdout.write('done\n');
    }
  } finally {
    await db.close();
  }
}

async function main() {
  const files = readMigrations();
  if (files.length === 0) {
    console.log('No migration files found in', MIGRATIONS_DIR);
    return;
  }

  if (DATABASE_URL) {
    console.log('[migrate] backend: postgres (DATABASE_URL set)');
    await migratePostgres(files);
  } else {
    console.log('[migrate] backend: pglite (no DATABASE_URL) ->', PGLITE_DIR);
    await migratePglite(files);
  }

  console.log('All migrations applied.');
}

main().catch((err) => {
  console.error('Migration failed:', err && err.message ? err.message : err);
  process.exit(1);
});
