/**
 * Audit log — record who did what, when. Captures every login attempt and every
 * data mutation. Fire-and-forget: a logging failure NEVER breaks the request
 * (insert is best-effort, errors swallowed).
 */
import type { Request, Response, NextFunction } from 'express';
import { query } from '../db';

export interface AuditEntry {
  actorId?: string | null;
  actorName?: string | null;
  role?: string | null;
  action: string;
  entity?: string | null;
  targetId?: string | null;
  method?: string | null;
  path?: string | null;
  status?: number | null;
  ip?: string | null;
  meta?: unknown;
}

/** Best-effort insert; never throws into the request path. */
export function recordAudit(e: AuditEntry): void {
  query(
    `INSERT INTO audit_log
       (actor_id, actor_name, role, action, entity, target_id, method, path, status, ip, meta)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      e.actorId ?? null,
      e.actorName ?? null,
      e.role ?? null,
      e.action,
      e.entity ?? null,
      e.targetId ?? null,
      e.method ?? null,
      e.path ?? null,
      e.status ?? null,
      e.ip ?? null,
      e.meta != null ? JSON.stringify(e.meta) : null,
    ],
  ).catch(() => undefined);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const READ_SUFFIX = /\/(list|search)$/;

function clientIp(req: Request): string | null {
  const fwd = req.header('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return req.ip ?? req.socket?.remoteAddress ?? null;
}

/**
 * Middleware: log every authed MUTATION (POST/PATCH/DELETE that isn't a
 * `/list` or `/search` read). Records on response finish so the real status is
 * captured. Mounted after requireAuth so req.auth (actor) is set.
 */
export function auditWrites(req: Request, res: Response, next: NextFunction): void {
  const method = req.method.toUpperCase();
  const isMutation = method === 'POST' || method === 'PATCH' || method === 'DELETE';
  if (!isMutation || READ_SUFFIX.test(req.path)) {
    next();
    return;
  }

  res.on('finish', () => {
    try {
      const segs = req.path.split('/').filter(Boolean); // e.g. ['forest','upsert'] | ['forest','<uuid>','boundary']
      const entity = segs[0] ?? null;
      const verbSegs = segs.slice(1).filter((s) => !UUID_RE.test(s));
      const action = `${entity ?? 'api'}.${verbSegs.join('.') || method.toLowerCase()}`;
      const uuidInPath = segs.find((s) => UUID_RE.test(s));
      const bodyId =
        req.body && typeof req.body === 'object' ? (req.body as { id?: string }).id : undefined;
      const targetId = uuidInPath ?? (typeof bodyId === 'string' ? bodyId : null);
      const auth = req.auth;
      recordAudit({
        actorId: auth?.profileId ?? null,
        actorName: auth?.username ?? null,
        role: auth?.role ?? null,
        action,
        entity,
        targetId,
        method,
        path: req.path,
        status: res.statusCode,
        ip: clientIp(req),
      });
    } catch {
      /* never break the request */
    }
  });
  next();
}

export { clientIp };
