## Why

Report and gift emails went through the **Composio Gmail MCP bridge** — a
second email provider on top of Resend (already used for gift certificates),
with a clumsy two-step attachment flow, no record of what was sent, and no way
to deliver the actual report PDF to a sponsor. Two byte-identical report email
templates were also inlined in code with no way to edit copy without a deploy,
and unescaped recipient/sponsor names were interpolated into HTML.

The user has a **verified OIAS Earth sending domain on Resend**, which removes
the only reason to keep Composio. Consolidating on one provider gives a single
verified sender, native CC + attachments, editable templates, and a persisted
log of every send.

## What Changes

- **Drop Composio entirely.** All outbound email now goes through Resend from
  the verified OIAS Earth domain (`RESEND_FROM`). `lib/composio.ts` deleted.
- **Tracked templates.** `email_templates` table: the default lives in code, a
  DB row overrides it. `{{placeholder}}` rendering with HTML escaping (closes
  the raw-name injection gap). The two identical inline report templates are
  de-duplicated into one builder. SuperAdmin CRUD: `GET/PUT/DELETE
  /email-templates(/:key)`.
- **CC support.** Report sends auto-CC every available address (active sponsor
  email + forest contact email) plus manual `body.cc` and any template-static
  cc, deduped, with the TO address removed.
- **PDF attachment.** The quarterly report is rendered to a PDF in the browser
  (the only place the slides exist in the DOM), uploaded with the send, and
  attached via Resend alongside the live link. `renderReportPdfBlob()` is shared
  by the Download button and the Send flow.
- **Sent inbox.** Every send — success *and* failure — is written to
  `email_log` from the central send paths (`sendReportMail`, `sendGiftEmail`),
  with to/cc/subject/status/attachment/actor. Viewable in the admin "Emails" tab
  via `POST /email-log/list`.

Status: already implemented and pushed (commit `996bdbe`). This change is the
retroactive spec of record.

## Capabilities

### New Capabilities
- `transactional-email`: single-provider (Resend) outbound email from the
  verified OIAS Earth domain, with code-default-plus-DB-override templates,
  HTML-escaped placeholder rendering, CC resolution, optional PDF attachment,
  and a persisted send log (the "Sent" inbox) capturing every attempt.

### Modified Capabilities
- `sponsor-portal` / `proof-of-life`: quarterly report and gift-tree emails now
  route through `transactional-email` (Resend) instead of the Composio Gmail
  bridge; report emails carry the report PDF and CC the sponsor/contact.

## Impact

- **DB**: `app/db/migrations/021_email_templates.sql`,
  `022_email_log.sql` (new tables; idempotent).
- **Server**: `lib/mail.ts` (`sendReportMail`, central logging),
  `lib/emailTemplates.ts` (new), `lib/emailLog.ts` (new),
  `lib/composio.ts` (**deleted**), `routes/forest.ts` (both report sends +
  gift sends route through Resend; `/email-templates` + `/email-log/list`).
- **Client**: `pages/SentEmails.tsx` (new inbox), `components/Sidebar.tsx`,
  `components/TabNav.tsx`, `pages/Dashboard.tsx` (nav),
  `pages/report/ReportForestQuarterly.tsx` (send with PDF + CC toast),
  `pages/report/reportDownload.ts` (`renderReportPdfBlob`).
- **Ops**: requires `RESEND_API_KEY` and `RESEND_FROM` (verified OIAS Earth
  sender) in Vercel — if `RESEND_FROM` is unset, sends fall back to
  `onboarding@resend.dev` (test mode, owner-only delivery). `COMPOSIO_*` env
  vars are now unused and can be removed.
- No new runtime dependencies (Resend already present).
