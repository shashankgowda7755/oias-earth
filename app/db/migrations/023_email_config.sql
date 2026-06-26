-- Email configuration: global sender identity + To/CC address lists.
-- system_email_config holds one row of global settings (upserted by key).
-- forest_email_config holds per-forest To/CC overrides.
-- No existing send logic is altered; these tables are additive.
-- Idempotent.

CREATE TABLE IF NOT EXISTS system_email_config (
  key          text PRIMARY KEY,   -- 'global'
  display_name text NOT NULL DEFAULT 'OIAS Earth',
  from_address text NOT NULL DEFAULT '',
  reply_to     text,
  to_emails    text[] NOT NULL DEFAULT '{}',   -- global extra To addresses
  cc_emails    text[] NOT NULL DEFAULT '{}',   -- global CC addresses
  updated_at   timestamptz NOT NULL DEFAULT now(),
  updated_by   text
);

-- Seed one row so GET always returns data
INSERT INTO system_email_config (key) VALUES ('global') ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS forest_email_config (
  forest_id      uuid PRIMARY KEY REFERENCES forests(id) ON DELETE CASCADE,
  to_emails      text[] NOT NULL DEFAULT '{}',   -- additive on top of global To
  cc_emails      text[] NOT NULL DEFAULT '{}',   -- replaces global CC when non-empty
  updated_at     timestamptz NOT NULL DEFAULT now(),
  updated_by     text
);

CREATE INDEX IF NOT EXISTS forest_email_config_forest_idx ON forest_email_config (forest_id);
