/**
 * Dual database backend.
 *
 * The server runs against EITHER:
 *   1. node-postgres (`pg`) Pool   — when DATABASE_URL is set (real Postgres), OR
 *   2. embedded PGlite             — when DATABASE_URL is UNSET (zero-install dev).
 *
 * Both are exposed behind one async `query(text, params)` + `getClient()` API so
 * every route is backend-agnostic. PGlite persists to `${server}/.pglite-data`
 * (a directory) so data survives restarts, mirroring a real DB.
 *
 * WHY a thin adapter rather than two code paths in every route:
 *   The live REST contract is identical regardless of where the rows live; the
 *   backend choice is purely an ops/runnability concern. Keeping it in one place
 *   means routes never branch on it.
 *
 * pg type-coercion notes (preserved from the pg-only version):
 *   - BIGINT (oid 20) -> JS string by default (avoids Number precision loss;
 *     mobile_no etc. are strings in our types).
 *   - NUMERIC (oid 1700) -> string by default (matches the live REST shape where
 *     forest_oxygen is "2069100.00"). We force this explicitly for pg.
 *   PGlite returns these as strings too, so the serialised shapes match.
 */
import path from 'path';
import { config } from './config';
import type { QueryResultRow } from 'pg';

/** Minimal shape every backend returns from a query. */
export interface QueryResult<T extends QueryResultRow = QueryResultRow> {
  rows: T[];
  rowCount: number;
}

/** A connection that can run queries (used for transactions). pg clients add
 *  release(); PGlite has no pooling so release() is a no-op there. */
export interface DbClient {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: ReadonlyArray<unknown>
  ): Promise<QueryResult<T>>;
  /** Return the client to the pool (pg) / no-op (PGlite). */
  release(): void;
}

/** The backend the adapter resolved to (logged once at startup). */
export const DB_BACKEND: 'postgres' | 'pglite' = config.databaseUrl
  ? 'postgres'
  : 'pglite';

/**
 * tsc (module: CommonJS) rewrites a literal `import()` into `require()`, which
 * cannot load PGlite's ESM build. This indirection keeps a TRUE dynamic import
 * at runtime so the ESM-only `@electric-sql/pglite` package loads correctly.
 */
const dynamicImport = new Function('specifier', 'return import(specifier)') as (
  specifier: string
) => Promise<unknown>;

/* ------------------------------------------------------------------ */
/* Backend lazy-init (one shared instance)                             */
/* ------------------------------------------------------------------ */

type Backend = {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: ReadonlyArray<unknown>
  ): Promise<QueryResult<T>>;
  getClient(): Promise<DbClient>;
  end(): Promise<void>;
};

let backendPromise: Promise<Backend> | null = null;

async function initPostgres(): Promise<Backend> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Pool, types } = await import('pg');
  // NUMERIC stays a string so forest_oxygen serialises like the live API.
  types.setTypeParser(1700, (val) => val);

  const pool = new Pool({ connectionString: config.databaseUrl });
  pool.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('[db] unexpected pool error', err);
  });

  return {
    async query<T extends QueryResultRow = QueryResultRow>(
      text: string,
      params?: ReadonlyArray<unknown>
    ): Promise<QueryResult<T>> {
      const r = await pool.query<T>(text, params as unknown[] | undefined);
      return { rows: r.rows, rowCount: r.rowCount ?? 0 };
    },
    async getClient(): Promise<DbClient> {
      const client = await pool.connect();
      return {
        async query<T extends QueryResultRow = QueryResultRow>(
          text: string,
          params?: ReadonlyArray<unknown>
        ): Promise<QueryResult<T>> {
          const r = await client.query<T>(text, params as unknown[] | undefined);
          return { rows: r.rows, rowCount: r.rowCount ?? 0 };
        },
        release(): void {
          client.release();
        },
      };
    },
    async end(): Promise<void> {
      await pool.end();
    },
  };
}

async function initPglite(): Promise<Backend> {
  // ESM-only package — loaded via the dynamicImport shim above.
  const mod = (await dynamicImport('@electric-sql/pglite')) as {
    PGlite: new (dataDir?: string) => PgliteInstance;
  };
  // Persist to a file-backed dir so data survives restarts.
  const dataDir = path.resolve(__dirname, '..', '.pglite-data');
  const db = new mod.PGlite(dataDir);
  await db.waitReady;

  /**
   * PGlite uses $1/$2 placeholders like pg and returns {rows}. It exposes a
   * single in-process connection, so getClient() returns the same instance and
   * transactions (BEGIN/COMMIT) run serially on it. That is sufficient for
   * local dev; production uses the pooled pg path above.
   */
  const run = async <T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: ReadonlyArray<unknown>
  ): Promise<QueryResult<T>> => {
    const r = await db.query<T>(text, params ? [...params] : undefined);
    const rows = (r.rows ?? []) as T[];
    // PGlite affectedRows covers writes; rows.length covers RETURNING/SELECT.
    const rowCount = typeof r.affectedRows === 'number' ? r.affectedRows : rows.length;
    return { rows, rowCount: rows.length > 0 ? rows.length : rowCount };
  };

  return {
    query: run,
    async getClient(): Promise<DbClient> {
      return { query: run, release: () => undefined };
    },
    async end(): Promise<void> {
      await db.close();
    },
  };
}

/** PGlite runtime shape we rely on (typed locally since it is dynamically imported). */
interface PgliteInstance {
  waitReady: Promise<void>;
  query<T = unknown>(
    text: string,
    params?: unknown[]
  ): Promise<{ rows: T[]; affectedRows?: number }>;
  close(): Promise<void>;
}

function getBackend(): Promise<Backend> {
  if (!backendPromise) {
    backendPromise = DB_BACKEND === 'postgres' ? initPostgres() : initPglite();
  }
  return backendPromise;
}

/* ------------------------------------------------------------------ */
/* Public API — backend-agnostic                                       */
/* ------------------------------------------------------------------ */

/** Run a query against the active backend. */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: ReadonlyArray<unknown>
): Promise<QueryResult<T>> {
  const backend = await getBackend();
  return backend.query<T>(text, params);
}

/** Acquire a client (for transactions). Always release() it when done. */
export async function getClient(): Promise<DbClient> {
  const backend = await getBackend();
  return backend.getClient();
}

/** Close the backend (used by scripts/tests). */
export async function closeDb(): Promise<void> {
  if (backendPromise) {
    const backend = await backendPromise;
    await backend.end();
    backendPromise = null;
  }
}
