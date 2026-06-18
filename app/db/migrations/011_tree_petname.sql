-- =====================================================================
-- 011_tree_petname.sql
-- Per-tree "pet name" (the incumbent's emotional gift-tree hook) + an index
-- on tree_status_id so the public map / sponsor portal can aggregate survival
-- (alive vs dead) fast across thousands of trees.
-- Idempotent.
-- =====================================================================

ALTER TABLE forest_trees ADD COLUMN IF NOT EXISTS forest_tree_petname TEXT;

CREATE INDEX IF NOT EXISTS idx_forest_trees_status
  ON forest_trees (forest_id, tree_status_id)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_forest_trees_geo
  ON forest_trees (forest_id)
  WHERE is_active = TRUE AND is_display = TRUE
    AND forest_tree_geo_lat IS NOT NULL AND forest_tree_geo_long IS NOT NULL;
