> Status: implemented and pushed in commit `996bdbe` (live on push). Checked
> items reflect completed work; recorded here as the spec of record.

## 1. Provider consolidation (Resend only)

- [x] 1.1 Delete `app/server/src/lib/composio.ts`
- [x] 1.2 Remove the `sendGmail` import + all Composio usage from `routes/forest.ts`
- [x] 1.3 Add `sendReportMail()` to `lib/mail.ts` — Resend, non-throwing (`{ok,messageId,error}`), CC + optional PDF attachment, sends from `RESEND_FROM`

## 2. Tracked templates

- [x] 2.1 `022`→`021_email_templates.sql`: `email_templates` table (key, subject, html, cc, …)
- [x] 2.2 `lib/emailTemplates.ts`: code default, DB override, `{{placeholder}}` render with HTML escaping
- [x] 2.3 De-duplicate the two identical inline report templates into one builder
- [x] 2.4 SuperAdmin CRUD: `GET/PUT/DELETE /email-templates(/:key)`

## 3. CC resolution

- [x] 3.1 Report sends auto-CC active sponsor email + forest contact email
- [x] 3.2 Merge manual `body.cc` + template-static cc; dedupe; strip the TO address

## 4. PDF attachment

- [x] 4.1 `reportDownload.ts`: extract `renderReportPdfBlob()` shared by Download + Send
- [x] 4.2 `ReportForestQuarterly` send: render PDF in browser → upload via multipart
- [x] 4.3 `/forest/:id/send-report` accepts multipart `pdf` (`photoUpload.single('pdf')`) and attaches it via Resend

## 5. Sent inbox (email_log)

- [x] 5.1 `022_email_log.sql`: `email_log` table (to/cc/subject/status/message_id/attached/actor/…)
- [x] 5.2 `lib/emailLog.ts`: `logEmail()` (never throws) + `listEmailLog()` (paginated, search, kind/status filter)
- [x] 5.3 Log every send (success + failure) centrally in `sendReportMail` + `sendGiftEmail`
- [x] 5.4 `POST /email-log/list` (Admin/SuperAdmin) + `SentEmails` page + nav entry

## 6. Build + ship

- [x] 6.1 `tsc --noEmit` passes for client and server
- [x] 6.2 Commit + push to `main` (`996bdbe`)
- [ ] 6.3 Set `RESEND_API_KEY` + `RESEND_FROM` (verified OIAS Earth sender) in Vercel — **ops, pending**
- [ ] 6.4 Live-verify a report send: PDF attached, CC present, row appears in the Sent inbox — **deploy-gated**
