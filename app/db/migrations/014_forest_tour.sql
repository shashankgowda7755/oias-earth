-- =====================================================================
-- 014_forest_tour.sql
-- Interactive 360° tour: navigable multi-scene panoramas with tree hotspots.
--   forest_scenes   — one 360 capture point (equirect image_url).
--   scene_hotspots  — a tree pinned on a scene at (yaw,pitch) → links to /tree/:id.
--   scene_links     — Street-View-style navigation arrow between two scenes.
-- Image bytes are NOT stored here — image_url points at object storage (Vercel
-- Blob) or an external https equirect; validated by isAllowedPanoUrl.
-- Idempotent.
-- =====================================================================

CREATE TABLE IF NOT EXISTS forest_scenes (
  id            SERIAL PRIMARY KEY,
  forest_id     UUID NOT NULL REFERENCES forests(id),
  label         TEXT,
  image_url     TEXT NOT NULL,
  lat           DOUBLE PRECISION,
  lng           DOUBLE PRECISION,
  default_yaw   DOUBLE PRECISION NOT NULL DEFAULT 0,
  default_pitch DOUBLE PRECISION NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_demo       BOOLEAN NOT NULL DEFAULT FALSE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scene_hotspots (
  id         SERIAL PRIMARY KEY,
  scene_id   INTEGER NOT NULL REFERENCES forest_scenes(id),
  tree_id    UUID NOT NULL REFERENCES forest_trees(id),
  yaw        DOUBLE PRECISION NOT NULL,
  pitch      DOUBLE PRECISION NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT scene_hotspots_yawpitch_ck CHECK (yaw >= 0 AND yaw <= 360 AND pitch >= -90 AND pitch <= 90),
  CONSTRAINT scene_hotspots_scene_tree_uq UNIQUE (scene_id, tree_id)
);

CREATE TABLE IF NOT EXISTS scene_links (
  id            SERIAL PRIMARY KEY,
  from_scene_id INTEGER NOT NULL REFERENCES forest_scenes(id),
  to_scene_id   INTEGER NOT NULL REFERENCES forest_scenes(id),
  yaw           DOUBLE PRECISION NOT NULL DEFAULT 0,
  pitch         DOUBLE PRECISION NOT NULL DEFAULT 0,
  label         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT scene_links_not_self CHECK (from_scene_id <> to_scene_id)
);

CREATE INDEX IF NOT EXISTS idx_forest_scenes_forest ON forest_scenes (forest_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_scene_hotspots_scene ON scene_hotspots (scene_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_scene_hotspots_tree  ON scene_hotspots (tree_id);
CREATE INDEX IF NOT EXISTS idx_scene_links_from     ON scene_links (from_scene_id) WHERE is_active = TRUE;
