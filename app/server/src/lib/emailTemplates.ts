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
  html: [
    /* wrapper — warm nature palette (Sample C) */
    `<div style="font-family:Georgia,'Times New Roman',serif;max-width:580px;margin:0 auto;background:#f2ede6;">`,

    /* logo bar */
    `<div style="background:#2d1f0e;padding:16px 32px;display:flex;align-items:center;justify-content:space-between;">`,
    `<div style="width:30px;height:30px;background:#c8813a;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;">`,
    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L8 8H4l4 4-2 6 6-3 6 3-2-6 4-4h-4z"/><line x1="12" y1="17" x2="12" y2="22"/></svg>`,
    `</div>`,
    `<span style="font-size:16px;font-weight:700;color:#f5e6c8;letter-spacing:.02em;">COMMUNITREE</span>`,
    `</div>`,

    /* hero */
    `<div style="background:linear-gradient(160deg,#3d5c1a 0%,#2d4412 40%,#1a2e08 100%);padding:34px 32px 30px;">`,
    `<div style="display:inline-block;background:rgba(200,129,58,.2);border:1px solid rgba(200,129,58,.4);color:#e8a55a;font-size:10px;font-family:Arial,sans-serif;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:4px 12px;border-radius:999px;margin-bottom:14px;">{{sponsor_kicker}}</div>`,
    `<div style="font-size:30px;font-weight:700;color:#fff;line-height:1.15;margin-bottom:6px;">{{forest_name}}</div>`,
    `<div style="font-size:14px;color:#a8c078;font-style:italic;margin-bottom:20px;">Quarterly Report &middot; Q{{quarter}} {{year}}</div>`,
    `<div style="font-size:14px;color:#c8d8a8;font-style:italic;line-height:1.6;border-left:2px solid #c8813a;padding-left:14px;">Your contribution is tracked, verified, and reported &mdash; every quarter.</div>`,
    `</div>`,

    /* body */
    `<div style="background:#fff;padding:28px 32px;">`,
    `<p style="font-size:15px;color:#2d1f0e;margin:0 0 16px;">Dear {{sponsor}},</p>`,
    `<p style="font-size:14px;color:#4a3828;line-height:1.7;margin:0 0 24px;font-family:Arial,sans-serif;">We&rsquo;re pleased to present your Q{{quarter}} {{year}} forest report for <strong>{{forest_name}}</strong>. Every section below is grounded in field-verified data from our on-ground team.</p>`,

    /* section heading */
    `<div style="font-size:11px;font-family:Arial,sans-serif;font-weight:700;color:#c8813a;text-transform:uppercase;letter-spacing:.1em;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid #f0e8d8;">Inside this report</div>`,

    /* report items */
    `<div style="display:flex;gap:14px;padding:12px 0;border-bottom:1px solid #f5f0e8;">`,
    `<div style="width:24px;height:24px;background:#f2ede6;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#c8813a;font-family:Arial,sans-serif;flex-shrink:0;margin-top:2px;">01</div>`,
    `<div><div style="font-size:14px;font-weight:700;color:#2d1f0e;margin-bottom:3px;">Maintenance &amp; Operations</div><div style="font-size:12px;color:#8a7060;line-height:1.5;font-family:Arial,sans-serif;">Watering schedules, weeding, pest management, and site maintenance this quarter.</div></div></div>`,

    `<div style="display:flex;gap:14px;padding:12px 0;border-bottom:1px solid #f5f0e8;">`,
    `<div style="width:24px;height:24px;background:#f2ede6;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#c8813a;font-family:Arial,sans-serif;flex-shrink:0;margin-top:2px;">02</div>`,
    `<div><div style="font-size:14px;font-weight:700;color:#2d1f0e;margin-bottom:3px;">Plant Growth &amp; Survival</div><div style="font-size:12px;color:#8a7060;line-height:1.5;font-family:Arial,sans-serif;">Species-wise survival rate, height progression, canopy cover across all zones.</div></div></div>`,

    `<div style="display:flex;gap:14px;padding:12px 0;border-bottom:1px solid #f5f0e8;">`,
    `<div style="width:24px;height:24px;background:#f2ede6;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#c8813a;font-family:Arial,sans-serif;flex-shrink:0;margin-top:2px;">03</div>`,
    `<div><div style="font-size:14px;font-weight:700;color:#2d1f0e;margin-bottom:3px;">Soil &amp; Climate</div><div style="font-size:12px;color:#8a7060;line-height:1.5;font-family:Arial,sans-serif;">Soil health, moisture retention, temperature and rainfall for Q{{quarter}} {{year}}.</div></div></div>`,

    `<div style="display:flex;gap:14px;padding:12px 0;margin-bottom:24px;">`,
    `<div style="width:24px;height:24px;background:#f2ede6;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#c8813a;font-family:Arial,sans-serif;flex-shrink:0;margin-top:2px;">04</div>`,
    `<div><div style="font-size:14px;font-weight:700;color:#2d1f0e;margin-bottom:3px;">Environmental Impact</div><div style="font-size:12px;color:#8a7060;line-height:1.5;font-family:Arial,sans-serif;">CO&#8322; sequestration estimate, oxygen generation, and biodiversity index.</div></div></div>`,

    /* quote / impact block */
    `<div style="background:#f8f2e8;border-radius:10px;padding:18px 20px;margin-bottom:24px;border-left:4px solid #c8813a;">`,
    `<div style="font-size:10px;font-family:Arial,sans-serif;font-weight:700;color:#c8813a;text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px;">The idea</div>`,
    `<div style="font-size:16px;color:#2d1f0e;font-style:italic;line-height:1.5;">&ldquo;Every tree we plant is a measured, verified step toward a more resilient and biodiverse future.&rdquo;</div>`,
    `</div>`,

    /* CTA */
    `<div style="background:#2d1f0e;border-radius:12px;padding:28px 24px;text-align:center;margin-bottom:8px;">`,
    `<div style="font-size:12px;color:#8a7060;font-style:italic;margin-bottom:8px;font-family:Arial,sans-serif;">Your full report is ready</div>`,
    `<div style="font-size:22px;font-weight:700;color:#f5e6c8;margin-bottom:18px;line-height:1.2;">View Q{{quarter}} {{year}}<br>{{forest_name}} Report</div>`,
    `<a href="{{report_url}}" style="display:inline-block;background:#c8813a;color:#fff;text-decoration:none;padding:13px 32px;border-radius:999px;font-size:14px;font-weight:700;font-family:Arial,sans-serif;">Open Report &rarr;</a>`,
    `</div>`,
    `</div>`,

    /* signature */
    `<div style="background:#fff;padding:18px 32px;border-top:1px solid #f0e8d8;">`,
    `<div style="font-size:14px;color:#2d1f0e;font-style:italic;margin-bottom:6px;">For a greener future,</div>`,
    `<div style="font-size:11px;color:#a89080;font-family:Arial,sans-serif;margin-bottom:0;">COMMUNITREE Team &middot; reports@communitree.co.in &middot; {{footer_credit}}</div>`,
    `</div>`,

    /* footer stats */
    `<div style="background:#faf6f0;border-top:1px solid #f0e8d8;padding:18px 32px;">`,
    `<div style="display:flex;">`,
    `<div style="flex:1;text-align:center;"><div style="font-size:18px;font-weight:700;color:#2d1f0e;font-family:Arial,sans-serif;">1.6M+</div><div style="font-size:10px;color:#b8a090;font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:.06em;">Trees Planted</div></div>`,
    `<div style="flex:1;text-align:center;border-left:1px solid #e8ddd0;"><div style="font-size:18px;font-weight:700;color:#2d1f0e;font-family:Arial,sans-serif;">12+</div><div style="font-size:10px;color:#b8a090;font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:.06em;">Cities</div></div>`,
    `<div style="flex:1;text-align:center;border-left:1px solid #e8ddd0;"><div style="font-size:18px;font-weight:700;color:#2d1f0e;font-family:Arial,sans-serif;">17</div><div style="font-size:10px;color:#b8a090;font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:.06em;">SDG Goals</div></div>`,
    `</div>`,
    `<div style="text-align:center;font-size:11px;color:#b8a090;font-family:Arial,sans-serif;margin-top:12px;">www.communitree.co.in &middot; Chennai, Tamil Nadu, India</div>`,
    `</div>`,

    `</div>`, /* /wrapper */
  ].join(''),
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
