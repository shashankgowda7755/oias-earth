## Design notes

### Why Resend over Composio
A verified OIAS Earth sending domain already exists on Resend (used for gift
certificates). Resend supports native `cc` arrays and `attachments` in a single
`emails.send()` call, removing Composio's two-step Gmail flow. One provider =
one verified sender, one SDK, one place to log.

### Where the PDF is generated
The report is a stack of `.rpt-slide` DOM nodes rendered by html2canvas + jsPDF.
That DOM only exists in the **report viewer**, so the PDF can only be produced
client-side there. Consequence:
- **Viewer send** (`/forest/:id/send-report`) attaches the real PDF.
- **Reports-list send** (`/report/:id/send`) has no rendered slides → link-only.
Transport is multipart (`FormData`), reusing the existing `photoUpload` multer
memory storage; Express body limit is 25 MB which covers a 12-slide PDF.

### Template precedence
`getTemplate(key)` returns the DB row if present, else the in-code default. This
keeps the app working with zero DB rows while allowing live copy edits without a
deploy. All `{{placeholder}}` substitution is HTML-escaped to close the prior
raw-name injection gap in map/report HTML.

### Logging contract
`logEmail()` is intentionally swallow-all (never throws) so a logging failure can
never break or 500 a send. It is called inside `sendReportMail` and
`sendGiftEmail` — the two central send paths — so *every* attempt is captured
exactly once with full context (kind, template, forest, actor, attachment flag),
including failures. This makes the Sent inbox the single source of truth.
