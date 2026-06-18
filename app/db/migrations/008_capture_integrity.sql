-- =====================================================================
-- 008_capture_integrity.sql
-- Capture-integrity layer (anti-spoofing) — addresses the dMRV landscape's #1
-- systemic gap: untrusted device GPS + recycled/edited photos.
--
--  - forest_plant_timeline_assets.sha256 + is_duplicate: hash every uploaded
--    photo; flag reuse of an identical image (recycled-photo fraud).
--  - forest_plant_timelines.geo_suspect: set when a visit's GPS is implausibly
--    far from its forest centre (likely spoof / wrong location).
-- These are append-only flags; nothing is deleted, so audits stay intact.
-- =====================================================================

ALTER TABLE forest_plant_timeline_assets ADD COLUMN IF NOT EXISTS sha256       TEXT;
ALTER TABLE forest_plant_timeline_assets ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_fpta_sha256 ON forest_plant_timeline_assets(sha256);

ALTER TABLE forest_plant_timelines ADD COLUMN IF NOT EXISTS geo_suspect    BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE forest_plant_timelines ADD COLUMN IF NOT EXISTS geo_distance_m DOUBLE PRECISION;
