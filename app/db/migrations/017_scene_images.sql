-- 017_scene_images — store uploaded 360° equirectangular images IN the database
-- so the Tap-to-Tag Studio can accept uploads with no external object storage
-- (Vercel Blob / Supabase) configured. Bytes served same-origin as an image so
-- the existing pano allowlist accepts the URL. Idempotent (runner re-applies).

CREATE TABLE IF NOT EXISTS scene_images (
  id         SERIAL PRIMARY KEY,
  forest_id  UUID NOT NULL REFERENCES forests(id),
  mime       TEXT NOT NULL DEFAULT 'image/jpeg',
  bytes      BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
