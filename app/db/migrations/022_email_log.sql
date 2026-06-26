-- Email log: every email sent (or attempted) through Resend — the "Sent" inbox.
-- Written by lib/emailLog.logEmail() from the central send paths so both
-- successes and failures are captured. Read-only in the admin. Idempotent.
CREATE TABLE IF NOT EXISTS email_log (
  id           bigserial PRIMARY KEY,
  ts           timestamptz NOT NULL DEFAULT now(),
  kind         text NOT NULL,                 -- 'report' | 'gift'
  template_key text,                          -- e.g. 'report_quarterly' (null for gift)
  to_email     text NOT NULL,
  cc           text[] NOT NULL DEFAULT '{}',
  subject      text NOT NULL,
  status       text NOT NULL,                 -- 'sent' | 'failed'
  message_id   text,                          -- provider id when sent
  error        text,                          -- provider/error message when failed
  attached     boolean NOT NULL DEFAULT FALSE,-- PDF attached?
  forest_id    text,
  actor        text,                          -- username who triggered (null = system/public)
  meta         jsonb
);
CREATE INDEX IF NOT EXISTS email_log_ts_idx     ON email_log (ts DESC);
CREATE INDEX IF NOT EXISTS email_log_to_idx     ON email_log (to_email);
CREATE INDEX IF NOT EXISTS email_log_kind_idx   ON email_log (kind);
CREATE INDEX IF NOT EXISTS email_log_status_idx ON email_log (status);
