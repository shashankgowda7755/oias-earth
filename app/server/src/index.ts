/**
 * Express entry point for the CommuniTREE admin rebuild API.
 *
 * Surface:
 *   POST /api/v1/auth/login                         (public)
 *   POST /api/v1/<entity>/list  + /search           (auth, RAW token)
 *   POST/PATCH/DELETE /api/v1/<entity>[/:id]         (auth, RAW token)
 *
 * Auth: REST endpoints require the RAW JWT in the Authorization header (NO
 * "Bearer " prefix), verified by requireAuth. See src/auth/middleware.ts.
 */
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import { requireAuth } from './auth/middleware';
import { authRouter } from './routes/auth';
import { listRouter } from './routes/lists';
import { crudRouter, UPLOADS_DIR } from './routes/crud';
import { forestRouter } from './routes/forest';
import { publicRouter } from './routes/public';
import { DB_BACKEND } from './db';
import { HttpError } from './errors';

const app = express();

app.use(
  cors({
    origin: config.corsOrigins,
    // The client sends the token in the Authorization header (raw).
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);
// Forest full-payload upserts + the 800-row bulk gift import are large.
app.use(express.json({ limit: '25mb' }));

// Uploaded files (logos/images) saved by the multipart upsert routes are
// served back at /uploads/<filename> — the stored column holds this URL.
app.use('/uploads', express.static(UPLOADS_DIR));

// Health check (public).
app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true, service: 'communitree-admin-server', db: DB_BACKEND });
});

// Public auth.
app.use('/api/v1/auth', authRouter);

// Public proof registry (no token): forests map + per-forest tagged trees.
app.use('/api/v1', publicRouter);

// Everything below requires a valid RAW token.
// forestRouter is mounted FIRST so its full-payload /forest/upsert + the new
// geo/dashboard/bulk-import routes take precedence over the legacy wizard
// upsert that still lives (for reference) in crudRouter.
app.use('/api/v1', requireAuth, listRouter);
app.use('/api/v1', requireAuth, forestRouter);
app.use('/api/v1', requireAuth, crudRouter);

// 404 for unmatched API routes.
app.use('/api', (_req: Request, res: Response) => {
  res.status(404).json({ error: true, message: 'Not found' });
});

// Serve the built React client in production (when dist exists alongside this server).
const CLIENT_DIST = path.resolve(__dirname, '../../../../client/dist');
const CLIENT_INDEX = path.join(CLIENT_DIST, 'index.html');
if (fs.existsSync(CLIENT_INDEX)) {
  app.use(express.static(CLIENT_DIST));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(CLIENT_INDEX);
  });
}

// Central error handler -> {error:true, message}. Express needs the 4-arg sig.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: true, message: err.message });
    return;
  }
  // Unexpected error.
  // eslint-disable-next-line no-console
  console.error('[error]', err);
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: true, message });
});

// Only start the HTTP server when run directly (not when imported as a serverless handler).
if (require.main === module) {
  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(
      `[server] CommuniTREE admin API listening on :${config.port} (db backend: ${DB_BACKEND})`
    );
  });
}

export { app };
