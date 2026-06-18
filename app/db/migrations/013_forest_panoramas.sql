-- =====================================================================
-- 013_forest_panoramas.sql
-- Per-forest / per-plot 360° "walk the forest" tour links. We do NOT store the
-- panorama bytes — only an EMBED URL pointing at an external 360 host (Kuula,
-- Momento360, Theta360, Street View share, etc). Experiential deliverable, not
-- carbon proof. Zero object-storage dependency.
-- Idempotent.
-- =====================================================================

CREATE TABLE IF NOT EXISTS forest_panoramas (
  id          SERIAL PRIMARY KEY,
  forest_id   UUID NOT NULL REFERENCES forests(id),
  label       TEXT,                 -- e.g. "Block A entrance", "Canopy centre"
  provider    TEXT,                 -- kuula | momento360 | theta360 | streetview | other
  embed_url   TEXT NOT NULL,        -- external iframe/embed URL (host allowlisted in app)
  captured_on DATE,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_forest_panoramas_forest
  ON forest_panoramas (forest_id) WHERE is_active = TRUE;
