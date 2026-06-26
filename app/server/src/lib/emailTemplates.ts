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
    /* wrapper */
    `<div style="font-family:Arial,Helvetica,sans-serif;max-width:620px;margin:0 auto;background:#eef2ef;">`,

    /* logo bar */
    `<div style="background:#fff;padding:14px 28px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e8edf0;">`,
    `<div style="display:flex;align-items:center;gap:8px;">`,
    `<div style="width:26px;height:26px;background:#16282e;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;">`,
    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a8e063" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L8 8H4l4 4-2 6 6-3 6 3-2-6 4-4h-4z"/><line x1="12" y1="17" x2="12" y2="22"/></svg>`,
    `</div><span style="font-size:14px;font-weight:800;color:#16282e;">OIAS Earth</span></div>`,
    `<span style="font-size:11px;color:#6b7c75;letter-spacing:.03em;">Quarterly Forest Report &middot; {{year}}</span>`,
    `</div>`,

    /* hero */
    `<div style="background:linear-gradient(145deg,#16282e 0%,#1e3d2f 60%,#2f6b3f 100%);padding:32px 28px 28px;">`,
    `<div style="display:inline-block;background:rgba(168,224,99,.15);border:1px solid rgba(168,224,99,.35);color:#a8e063;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;padding:4px 12px;border-radius:999px;margin-bottom:14px;">{{sponsor_kicker}}</div>`,
    `<div style="color:#fff;font-size:26px;font-weight:800;line-height:1.2;margin-bottom:8px;">Your forest is<br><span style="color:#a8e063;">growing stronger</span></div>`,
    `<div style="color:#9db8b0;font-size:14px;line-height:1.55;max-width:420px;">Your Q{{quarter}} {{year}} quarterly report for {{forest_name}} is ready &mdash; covering plant growth, soil health, species data and environmental impact.</div>`,
    `<div style="margin-top:16px;">`,
    `<span style="display:inline-block;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:#cdd8d2;font-size:11px;padding:4px 12px;border-radius:999px;margin-right:8px;">Q{{quarter}} {{year}}</span>`,
    `<span style="display:inline-block;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:#cdd8d2;font-size:11px;padding:4px 12px;border-radius:999px;">{{forest_name}}</span>`,
    `</div></div>`,

    /* body */
    `<div style="background:#fff;padding:28px 28px 0;">`,
    `<p style="font-size:15px;color:#16282e;margin:0 0 14px;">Dear {{sponsor}},</p>`,
    `<p style="font-size:15px;color:#3d5247;line-height:1.65;margin:0 0 24px;">We&rsquo;re pleased to share your <strong style="color:#16282e;">Q{{quarter}} {{year}} quarterly forest report</strong> for <strong style="color:#16282e;">{{forest_name}}</strong>. This report covers all maintenance activities, biodiversity observations, plant growth metrics, and the estimated environmental impact your contribution has enabled this quarter.</p>`,

    /* section label */
    `<div style="font-size:10px;font-weight:800;color:#2f6b3f;letter-spacing:.12em;text-transform:uppercase;margin-bottom:12px;">What&rsquo;s inside this report</div>`,

    /* section cards */
    `<div style="background:#f0f7f1;border-radius:10px;padding:14px 16px;margin-bottom:8px;display:flex;align-items:flex-start;gap:14px;">`,
    `<div style="min-width:28px;height:28px;background:#2f6b3f;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;flex-shrink:0;">01</div>`,
    `<div><div style="font-size:13px;font-weight:700;color:#16282e;margin-bottom:3px;">Maintenance &amp; Operations</div><div style="font-size:12px;color:#5f7068;line-height:1.5;">Watering schedules, weeding, pest management, and site maintenance carried out this quarter.</div></div></div>`,

    `<div style="background:#f5f3eb;border-radius:10px;padding:14px 16px;margin-bottom:8px;display:flex;align-items:flex-start;gap:14px;">`,
    `<div style="min-width:28px;height:28px;background:#8b6914;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;flex-shrink:0;">02</div>`,
    `<div><div style="font-size:13px;font-weight:700;color:#16282e;margin-bottom:3px;">Plant Growth &amp; Survival</div><div style="font-size:12px;color:#5f7068;line-height:1.5;">Species-wise survival rate, height progression, and canopy cover data tracked across all planted zones.</div></div></div>`,

    `<div style="background:#edf4f8;border-radius:10px;padding:14px 16px;margin-bottom:8px;display:flex;align-items:flex-start;gap:14px;">`,
    `<div style="min-width:28px;height:28px;background:#1a6080;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;flex-shrink:0;">03</div>`,
    `<div><div style="font-size:13px;font-weight:700;color:#16282e;margin-bottom:3px;">Soil &amp; Climate Data</div><div style="font-size:12px;color:#5f7068;line-height:1.5;">Soil health indicators, moisture retention, temperature trends, and rainfall data for the quarter.</div></div></div>`,

    `<div style="background:#f4edf8;border-radius:10px;padding:14px 16px;margin-bottom:24px;display:flex;align-items:flex-start;gap:14px;">`,
    `<div style="min-width:28px;height:28px;background:#6b3a8b;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;flex-shrink:0;">04</div>`,
    `<div><div style="font-size:13px;font-weight:700;color:#16282e;margin-bottom:3px;">Environmental Impact</div><div style="font-size:12px;color:#5f7068;line-height:1.5;">Estimated CO&#8322; sequestration, oxygen generation, and biodiversity index for this reporting period.</div></div></div>`,

    /* quote block */
    `<div style="border-left:3px solid #a8e063;background:#f8faf9;padding:16px 20px;border-radius:0 10px 10px 0;margin-bottom:24px;">`,
    `<div style="font-size:10px;font-weight:800;color:#a8e063;letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px;">The impact</div>`,
    `<div style="font-size:16px;font-style:italic;color:#16282e;line-height:1.5;font-weight:600;margin-bottom:6px;">&ldquo;Every tree planted is a measurable step toward a more resilient, biodiverse future.&rdquo;</div>`,
    `<div style="font-size:12px;color:#6b7c75;">Your contribution is tracked, verified, and reported &mdash; every quarter.</div>`,
    `</div>`,

    /* CTA block */
    `<div style="background:linear-gradient(135deg,#16282e 0%,#1e3d2f 100%);border-radius:14px;padding:28px 28px 26px;text-align:center;margin-bottom:28px;">`,
    `<div style="font-size:12px;color:#9db8b0;margin-bottom:8px;font-style:italic;">Your report is ready</div>`,
    `<div style="font-size:20px;font-weight:800;color:#fff;line-height:1.3;margin-bottom:18px;">View your full Q{{quarter}} {{year}}<br>Forest Report</div>`,
    `<a href="{{report_url}}" style="display:inline-block;background:#a8e063;color:#16282e;text-decoration:none;padding:13px 32px;border-radius:999px;font-weight:800;font-size:14px;">Open Q{{quarter}} {{year}} Report &rarr;</a>`,
    `</div></div>`,

    /* signature */
    `<div style="padding:20px 28px;border-top:1px solid #e8edf0;">`,
    `<div style="font-size:14px;font-style:italic;color:#2f6b3f;font-weight:600;margin-bottom:10px;">For a Greener Future,</div>`,
    `<div style="font-size:10px;color:#9db8b0;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">OIAS Earth &middot; Urban Forest Creators</div>`,
    `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">`,
    `<div style="width:36px;height:36px;border-radius:50%;background:#2f6b3f;color:#a8e063;display:inline-flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;flex-shrink:0;">OE</div>`,
    `<div><div style="font-size:13px;font-weight:700;color:#16282e;">OIAS Earth Team</div><div style="font-size:11px;color:#6b7c75;">Forest Reporting &middot; reports@oiasearth.com</div></div></div>`,
    `<div style="font-size:11px;color:#9db8b0;">{{footer_credit}}</div>`,
    `</div>`,

    /* footer stats */
    `<div style="background:#f8faf9;border-top:1px solid #e8edf0;padding:20px 28px;">`,
    `<div style="font-size:12px;color:#6b7c75;line-height:1.5;margin-bottom:14px;">Creating urban forests, restoring ecosystems, and tracking biodiversity through plantation drives and community conservation across India. Scalable, SDG-aligned, hands-on CSR engagements built for real impact.</div>`,
    `<div style="display:flex;text-align:center;">`,
    `<div style="flex:1;"><div style="font-size:18px;font-weight:800;color:#16282e;">1.6M+</div><div style="font-size:10px;color:#9db8b0;text-transform:uppercase;letter-spacing:.06em;margin-top:2px;">Trees Planted</div></div>`,
    `<div style="flex:1;border-left:1px solid #dce6e0;"><div style="font-size:18px;font-weight:800;color:#16282e;">12+</div><div style="font-size:10px;color:#9db8b0;text-transform:uppercase;letter-spacing:.06em;margin-top:2px;">Cities</div></div>`,
    `<div style="flex:1;border-left:1px solid #dce6e0;"><div style="font-size:18px;font-weight:800;color:#16282e;">17</div><div style="font-size:10px;color:#9db8b0;text-transform:uppercase;letter-spacing:.06em;margin-top:2px;">SDG Goals</div></div>`,
    `</div>`,
    `<div style="text-align:center;margin-top:14px;font-size:11px;color:#9db8b0;">www.oiasearth.com</div>`,
    `<div style="text-align:center;margin-top:6px;font-size:10px;color:#bbb;">OIAS Earth &middot; Chennai, Tamil Nadu, India</div>`,
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
