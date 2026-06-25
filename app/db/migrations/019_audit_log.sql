-- Audit log: every login attempt + every data mutation (forest/report/CRUD
-- upsert/delete, boundary, report-data, etc). Idempotent (runs each cold start).
CREATE TABLE IF NOT EXISTS audit_log (
  id          bigserial PRIMARY KEY,
  ts          timestamptz NOT NULL DEFAULT now(),
  actor_id    text,
  actor_name  text,
  role        text,
  action      text NOT NULL,
  entity      text,
  target_id   text,
  method      text,
  path        text,
  status      integer,
  ip          text,
  meta        jsonb
);
CREATE INDEX IF NOT EXISTS audit_log_ts_idx ON audit_log (ts DESC);
CREATE INDEX IF NOT EXISTS audit_log_actor_idx ON audit_log (actor_name);
CREATE INDEX IF NOT EXISTS audit_log_entity_idx ON audit_log (entity);
