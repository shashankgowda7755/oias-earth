/**
 * Email log — records every Resend send (success or failure) into email_log,
 * the admin "Sent" inbox. logEmail() never throws: a logging failure must not
 * break or 500 a send. Called from the central send paths (sendReportMail,
 * sendGiftEmail) so every outbound email is captured in one place.
 */
import { query } from '../db';

export interface EmailLogEntry {
  kind: 'report' | 'gift';
  templateKey?: string | null;
  to: string;
  cc?: string[];
  subject: string;
  status: 'sent' | 'failed';
  messageId?: string | null;
  error?: string | null;
  attached?: boolean;
  forestId?: string | null;
  actor?: string | null;
  meta?: Record<string, unknown> | null;
}

export async function logEmail(e: EmailLogEntry): Promise<void> {
  try {
    await query(
      `INSERT INTO email_log
         (kind, template_key, to_email, cc, subject, status, message_id, error, attached, forest_id, actor, meta)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        e.kind,
        e.templateKey ?? null,
        e.to,
        e.cc ?? [],
        e.subject,
        e.status,
        e.messageId ?? null,
        e.error ?? null,
        e.attached ?? false,
        e.forestId ?? null,
        e.actor ?? null,
        e.meta ? JSON.stringify(e.meta) : null,
      ],
    );
  } catch {
    /* logging must never break a send */
  }
}

export interface EmailLogRow {
  id: number;
  ts: string;
  kind: string;
  templateKey: string | null;
  to: string;
  cc: string[];
  subject: string;
  status: string;
  messageId: string | null;
  error: string | null;
  attached: boolean;
  forestId: string | null;
  actor: string | null;
}

/** Paginated list for the inbox. kind: 'report'|'gift'; status: 'sent'|'failed'. */
export async function listEmailLog(opts: {
  page?: number; limit?: number; search?: string; kind?: string; status?: string;
}): Promise<{ rows: EmailLogRow[]; total: number }> {
  const limit = Math.min(Math.max(Number(opts.limit) || 100, 1), 500);
  const page = Math.max(Number(opts.page) || 1, 1);
  const offset = (page - 1) * limit;

  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.kind === 'report' || opts.kind === 'gift') {
    params.push(opts.kind);
    where.push(`kind = $${params.length}`);
  }
  if (opts.status === 'sent' || opts.status === 'failed') {
    params.push(opts.status);
    where.push(`status = $${params.length}`);
  }
  const s = String(opts.search ?? '').trim();
  if (s) {
    params.push(`%${s}%`);
    const p = `$${params.length}`;
    where.push(`(to_email ILIKE ${p} OR subject ILIKE ${p} OR actor ILIKE ${p} OR array_to_string(cc, ',') ILIKE ${p})`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const totalRes = await query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM email_log ${whereSql}`, params);
  const total = Number(totalRes.rows[0]?.n ?? 0);

  const rowsRes = await query<{
    id: number; ts: string; kind: string; template_key: string | null;
    to_email: string; cc: string[] | null; subject: string; status: string;
    message_id: string | null; error: string | null; attached: boolean;
    forest_id: string | null; actor: string | null;
  }>(
    `SELECT id, ts::text, kind, template_key, to_email, cc, subject, status,
            message_id, error, attached, forest_id, actor
       FROM email_log ${whereSql}
      ORDER BY ts DESC
      LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const rows: EmailLogRow[] = rowsRes.rows.map((r) => ({
    id: r.id,
    ts: r.ts,
    kind: r.kind,
    templateKey: r.template_key,
    to: r.to_email,
    cc: r.cc ?? [],
    subject: r.subject,
    status: r.status,
    messageId: r.message_id,
    error: r.error,
    attached: r.attached,
    forestId: r.forest_id,
    actor: r.actor,
  }));
  return { rows, total };
}
