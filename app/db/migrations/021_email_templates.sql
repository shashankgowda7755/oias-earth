-- Email templates: tracked, editable report-email copy with {{placeholders}}.
-- The canonical DEFAULT lives in code (src/lib/emailTemplates.ts) so the system
-- works before anyone edits anything; a row here is an admin OVERRIDE for that
-- key. Idempotent (runs each cold start); no seed (code provides the default).
CREATE TABLE IF NOT EXISTS email_templates (
  key          text PRIMARY KEY,         -- e.g. 'report_quarterly'
  name         text NOT NULL,            -- human label for the admin editor
  subject      text NOT NULL,            -- plain-text, supports {{tokens}}
  html         text NOT NULL,            -- HTML body, supports {{tokens}}
  cc           text[] NOT NULL DEFAULT '{}',  -- static CC added to every send
  placeholders text[] NOT NULL DEFAULT '{}',  -- documented tokens for the editor
  updated_at   timestamptz NOT NULL DEFAULT now(),
  updated_by   text
);
