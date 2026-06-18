-- =====================================================================
-- 012_forest_is_demo.sql
-- Mark demonstration / seeded forests so public surfaces can disclose that
-- their monitoring data is SIMULATED (not field-verified). Integrity rule:
-- never present a fabricated record as a verified one.
-- Idempotent.
-- =====================================================================

ALTER TABLE forests ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE forests SET is_demo = TRUE
  WHERE forest_unique_id LIKE 'FLAGSHIP-%' OR forest_unique_id LIKE 'DEMO-%';
