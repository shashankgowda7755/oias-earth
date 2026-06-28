/**
 * Centralised env config. Loads .env once (via dotenv) and exposes typed
 * values with local-dev defaults. No secrets are hardcoded beyond dev defaults.
 */
import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

export const config = {
  // DATABASE_URL is OPTIONAL. When unset the server uses embedded PGlite
  // (@electric-sql/pglite) so it runs with NO external Postgres install. When
  // set, the node-postgres path is used. (See src/db.ts.)
  databaseUrl: process.env.DATABASE_URL ?? '',
  // Dev-only default secret. CHANGE in any real deployment.
  jwtSecret: required('JWT_SECRET', 'dev-only-change-me-communitree-secret'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  // TEMPORARY pre-launch convenience: a password-free "demo login" that mints an
  // admin session (POST /auth/demo-login). Per product owner, demo access is ON by
  // default during the pre-launch demo period. PUBLIC BACKDOOR — set
  // ALLOW_DEMO_LOGIN=false to disable, and REMOVE this route before real launch.
  allowDemoLogin: process.env.ALLOW_DEMO_LOGIN !== 'false',
  port: Number(process.env.PORT ?? 4000),
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
} as const;
