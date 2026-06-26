/**
 * Tracked, editable email templates with {{placeholder}} substitution.
 *
 * Source of truth = DEFAULT_TEMPLATES (in code, version-controlled). An admin
 * edit is stored in the email_templates table and OVERRIDES the code default
 * for that key. getTemplate() returns the DB row when present, else the code
 * default — so sending works before anyone edits anything.
 *
 * Rendering:
 *   - renderHtml(): HTML-escapes every value so a forest/sponsor name with
 *     <, &, " can't break layout or inject markup (fixes the old inline gap).
 *   - renderText(): plain substitution for the subject line (no HTML entities).
 * Unknown / missing tokens render as empty string.
 *
 * Placeholders are pure value-substitution (no conditionals): callers compose
 * any conditional copy (e.g. the sponsor prefix) into a token value, so the
 * template stays a flat token map an admin can safely edit.
 */
import { query } from '../db';

export interface EmailTemplate {
  key: string;
  name: string;
  subject: string;
  html: string;
  cc: string[];
  placeholders: string[];
}

export function escHtml(s: unknown): string {
  return String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

const TOKEN_RE = /\{\{\s*(\w+)\s*\}\}/g;
type Vars = Record<string, string | number | null | undefined>;

/** HTML body render — values are HTML-escaped. */
export function renderHtml(tpl: string, vars: Vars): string {
  return tpl.replace(TOKEN_RE, (_m, k: string) => (vars[k] == null ? '' : escHtml(vars[k])));
}

/** Subject / plain-text render — raw substitution, no entity encoding. */
export function renderText(tpl: string, vars: Vars): string {
  return tpl.replace(TOKEN_RE, (_m, k: string) => (vars[k] == null ? '' : String(vars[k])));
}

/* ------------------------------------------------------------------ */
/* Code defaults                                                        */
/* ------------------------------------------------------------------ */

/**
 * Quarterly forest report email. Tokens:
 *   forest_name, quarter, year, report_url   — data
 *   sponsor                                  — sponsor name ('' when none)
 *   sponsor_kicker                           — pre-composed header eyebrow
 *   subject_prefix                           — pre-composed "Sponsor · " (or '')
 *   footer_credit                            — pre-composed attribution line
 * Callers build the *_prefix / *_kicker / footer tokens so conditional copy
 * never leaks dangling separators into the editable body.
 */
const REPORT_QUARTERLY: EmailTemplate = {
  key: 'report_quarterly',
  name: 'Quarterly Forest Report',
  subject: '{{subject_prefix}}{{forest_name}} — Quarterly Forest Report (Q{{quarter}} {{year}})',
  html:
    `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#16282e">` +
    `<div style="background:#16282e;padding:24px 28px;border-radius:12px 12px 0 0">` +
    `<div style="color:#a8e063;font-weight:800;font-size:13px;letter-spacing:.08em">{{sponsor_kicker}}</div>` +
    `<div style="color:#fff;font-size:24px;font-weight:800;margin-top:6px">{{forest_name}}</div>` +
    `<div style="color:#cdd8d2;font-size:13px;margin-top:4px">Q{{quarter}} · {{year}}</div></div>` +
    `<div style="border:1px solid #e3e9e5;border-top:none;border-radius:0 0 12px 12px;padding:26px 28px">` +
    `<p style="margin:0 0 16px;line-height:1.5">Your quarterly forest report is ready — maintenance, plant growth, soil &amp; climate, species health, and the estimated environmental impact for this quarter.</p>` +
    `<a href="{{report_url}}" style="display:inline-block;background:#2f6b3f;color:#fff;text-decoration:none;padding:13px 28px;border-radius:999px;font-weight:700;font-size:15px">View full report &rarr;</a>` +
    `<p style="margin:18px 0 0;font-size:12px;color:#888">Open the report to view all sections and download a PDF. Carbon/oxygen figures are estimates.</p>` +
    `<p style="margin:12px 0 0;font-size:12px;color:#aaa">{{footer_credit}}</p></div></div>`,
  cc: [],
  placeholders: [
    'forest_name', 'sponsor', 'quarter', 'year', 'report_url',
    'sponsor_kicker', 'subject_prefix', 'footer_credit',
  ],
};

const DEFAULT_TEMPLATES: Record<string, EmailTemplate> = {
  [REPORT_QUARTERLY.key]: REPORT_QUARTERLY,
};

export function defaultTemplate(key: string): EmailTemplate | null {
  return DEFAULT_TEMPLATES[key] ?? null;
}

export function listDefaultTemplates(): EmailTemplate[] {
  return Object.values(DEFAULT_TEMPLATES);
}

/* ------------------------------------------------------------------ */
/* DB-backed lookup (override > default)                               */
/* ------------------------------------------------------------------ */

interface TemplateRow {
  key: string;
  name: string;
  subject: string;
  html: string;
  cc: string[] | null;
  placeholders: string[] | null;
}

/** Returns the admin-edited row if present, else the code default, else null. */
export async function getTemplate(key: string): Promise<EmailTemplate | null> {
  const r = await query<TemplateRow>(
    `SELECT key, name, subject, html, cc, placeholders FROM email_templates WHERE key = $1`,
    [key],
  );
  const row = r.rows[0];
  if (row) {
    return {
      key: row.key,
      name: row.name,
      subject: row.subject,
      html: row.html,
      cc: row.cc ?? [],
      placeholders: row.placeholders ?? [],
    };
  }
  return defaultTemplate(key);
}
