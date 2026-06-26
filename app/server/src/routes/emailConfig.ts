/**
 * Email configuration routes — global sender identity + To/CC address lists.
 *
 * Surface (all under /api/v1, behind requireAuth):
 *   GET  /settings/email              — read global config (SuperAdmin only)
 *   PUT  /settings/email              — write global config (SuperAdmin only)
 *   GET  /forest/:id/email-config     — read per-forest To/CC (SuperAdmin only)
 *   PUT  /forest/:id/email-config     — write per-forest To/CC (SuperAdmin only)
 *
 * These tables are ADDITIVE — no existing send logic reads from them yet.
 * The send flow in forest.ts (resolveCc / sendReportEmail) will be wired
 * to consult these tables in a follow-up. Nothing breaks if these rows are empty.
 */
import { Router, type Request, type Response } from 'express';
import { query } from '../db';
import { forbidden, notFound } from '../errors';

export const emailConfigRouter = Router();

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseEmails(raw: unknown): string[] {
  const arr = Array.isArray(raw) ? raw : String(raw ?? '').split(',');
  return arr.map((x: unknown) => String(x ?? '').trim()).filter((e) => EMAIL_RE.test(e));
}

/* ------------------------------------------------------------------ */
/* Global config                                                        */
/* ------------------------------------------------------------------ */

emailConfigRouter.get('/settings/email', async (req: Request, res: Response) => {
  if (req.auth?.role !== 'SuperAdmin') throw forbidden('SuperAdmin only');
  const r = await query<{
    display_name: string; from_address: string; reply_to: string | null;
    to_emails: string[]; cc_emails: string[]; updated_at: string; updated_by: string | null;
  }>(`SELECT display_name, from_address, reply_to, to_emails, cc_emails, updated_at, updated_by
       FROM system_email_config WHERE key = 'global'`);
  res.json({ data: r.rows[0] ?? null });
});

emailConfigRouter.put('/settings/email', async (req: Request, res: Response) => {
  if (req.auth?.role !== 'SuperAdmin') throw forbidden('SuperAdmin only');
  const b = req.body as {
    display_name?: unknown; from_address?: unknown; reply_to?: unknown;
    to_emails?: unknown; cc_emails?: unknown;
  };
  const displayName = String(b.display_name ?? '').trim();
  const fromAddress = String(b.from_address ?? '').trim();
  const replyTo = b.reply_to ? String(b.reply_to).trim() : null;
  const toEmails = parseEmails(b.to_emails);
  const ccEmails = parseEmails(b.cc_emails);

  if (!displayName) { res.status(400).json({ error: true, message: 'display_name is required' }); return; }
  if (!fromAddress || !EMAIL_RE.test(fromAddress)) { res.status(400).json({ error: true, message: 'Valid from_address is required' }); return; }
  if (replyTo && !EMAIL_RE.test(replyTo)) { res.status(400).json({ error: true, message: 'Invalid reply_to address' }); return; }

  await query(
    `INSERT INTO system_email_config (key, display_name, from_address, reply_to, to_emails, cc_emails, updated_at, updated_by)
     VALUES ('global', $1, $2, $3, $4, $5, now(), $6)
     ON CONFLICT (key) DO UPDATE SET
       display_name = EXCLUDED.display_name,
       from_address = EXCLUDED.from_address,
       reply_to     = EXCLUDED.reply_to,
       to_emails    = EXCLUDED.to_emails,
       cc_emails    = EXCLUDED.cc_emails,
       updated_at   = now(),
       updated_by   = EXCLUDED.updated_by`,
    [displayName, fromAddress, replyTo, toEmails, ccEmails, req.auth?.username ?? null],
  );
  res.json({ data: { ok: true } });
});

/* ------------------------------------------------------------------ */
/* Per-forest config                                                    */
/* ------------------------------------------------------------------ */

emailConfigRouter.get('/forest/:id/email-config', async (req: Request, res: Response) => {
  if (req.auth?.role !== 'SuperAdmin') throw forbidden('SuperAdmin only');
  const forestId = String(req.params.id);
  if (!UUID_RE.test(forestId)) throw notFound('Forest not found');

  const exists = await query<{ id: string }>(`SELECT id FROM forests WHERE id = $1`, [forestId]);
  if (!exists.rows[0]) throw notFound('Forest not found');

  const r = await query<{ to_emails: string[]; cc_emails: string[]; updated_at: string; updated_by: string | null }>(
    `SELECT to_emails, cc_emails, updated_at, updated_by FROM forest_email_config WHERE forest_id = $1`,
    [forestId],
  );
  res.json({ data: r.rows[0] ?? { to_emails: [], cc_emails: [], updated_at: null, updated_by: null } });
});

emailConfigRouter.put('/forest/:id/email-config', async (req: Request, res: Response) => {
  if (req.auth?.role !== 'SuperAdmin') throw forbidden('SuperAdmin only');
  const forestId = String(req.params.id);
  if (!UUID_RE.test(forestId)) throw notFound('Forest not found');

  const exists = await query<{ id: string }>(`SELECT id FROM forests WHERE id = $1`, [forestId]);
  if (!exists.rows[0]) throw notFound('Forest not found');

  const b = req.body as { to_emails?: unknown; cc_emails?: unknown };
  const toEmails = parseEmails(b.to_emails);
  const ccEmails = parseEmails(b.cc_emails);

  await query(
    `INSERT INTO forest_email_config (forest_id, to_emails, cc_emails, updated_at, updated_by)
     VALUES ($1, $2, $3, now(), $4)
     ON CONFLICT (forest_id) DO UPDATE SET
       to_emails  = EXCLUDED.to_emails,
       cc_emails  = EXCLUDED.cc_emails,
       updated_at = now(),
       updated_by = EXCLUDED.updated_by`,
    [forestId, toEmails, ccEmails, req.auth?.username ?? null],
  );
  res.json({ data: { ok: true } });
});
