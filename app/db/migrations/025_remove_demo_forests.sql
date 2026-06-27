-- =====================================================================
-- 025_remove_demo_forests.sql
-- Production starts with NO demo forests. Migrations 002 (IDFC, Temenos) and
-- 004 (Vandalur) re-insert demo forests on every cold start; this migration
-- runs last and removes them (and all their dependents) so the forest list
-- stays clean. Real forests added via the admin UI / importer have different
-- ids and are never touched.
--
-- Idempotent: deletes are no-ops once the rows are gone. FLAGSHIP-* forests are
-- seeded by a script (not a migration) so they don't re-spawn on Vercel; if one
-- is present it is removed here too.
-- =====================================================================

DO $$
DECLARE
  demo_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO demo_ids
  FROM forests
  WHERE id IN (
      '55ec5786-c1d1-4f72-a403-5b1a9d8e4d34',  -- IDFC First Bank (002)
      '25b16c3c-595e-4c53-83e9-e5b3b3b9d869',  -- Temenos (002)
      '7a11d000-0000-4000-8000-000000000702'   -- Vandalur Forest (004)
    )
    OR forest_unique_id LIKE 'FLAGSHIP-%'
    OR forest_unique_id LIKE 'DEMO-%';

  IF demo_ids IS NULL OR array_length(demo_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  -- Tree-level dependents (FK -> forest_trees).
  DELETE FROM gift_forest_plants WHERE gift_tree_id IN (SELECT id FROM forest_trees WHERE forest_id = ANY(demo_ids));
  DELETE FROM donor_trees WHERE tree_id IN (SELECT id FROM forest_trees WHERE forest_id = ANY(demo_ids));
  DELETE FROM forest_plant_timeline_assets WHERE timeline_id IN (
    SELECT id FROM forest_plant_timelines WHERE plant_id IN (
      SELECT id FROM forest_trees WHERE forest_id = ANY(demo_ids)));
  DELETE FROM forest_plant_timelines WHERE plant_id IN (SELECT id FROM forest_trees WHERE forest_id = ANY(demo_ids));
  DELETE FROM forest_tree_activities WHERE forest_tree_id IN (SELECT id FROM forest_trees WHERE forest_id = ANY(demo_ids));
  DELETE FROM forest_tree_sponsors WHERE forest_tree_id IN (SELECT id FROM forest_trees WHERE forest_id = ANY(demo_ids));
  DELETE FROM scene_hotspots WHERE tree_id IN (SELECT id FROM forest_trees WHERE forest_id = ANY(demo_ids));
  DELETE FROM tree_asserts WHERE tree_id IN (SELECT id FROM forest_trees WHERE forest_id = ANY(demo_ids));
  DELETE FROM forest_tree_carbon_ledger WHERE forest_id = ANY(demo_ids)
     OR tree_id IN (SELECT id FROM forest_trees WHERE forest_id = ANY(demo_ids));

  DELETE FROM forest_trees WHERE forest_id = ANY(demo_ids);

  -- Forest-level dependents (FK -> forests).
  DELETE FROM forests_reports WHERE forest_id = ANY(demo_ids);
  DELETE FROM reports WHERE forest_id = ANY(demo_ids);
  DELETE FROM forest_sponsors WHERE forest_id = ANY(demo_ids);
  DELETE FROM forests_employees WHERE forest_id = ANY(demo_ids);
  DELETE FROM forest_boxes WHERE forest_id = ANY(demo_ids);
  DELETE FROM forest_clusters WHERE forest_id = ANY(demo_ids);
  DELETE FROM forest_asserts WHERE forest_id = ANY(demo_ids);
  DELETE FROM forest_email_config WHERE forest_id = ANY(demo_ids);
  DELETE FROM forest_panoramas WHERE forest_id = ANY(demo_ids);
  DELETE FROM forest_scenes WHERE forest_id = ANY(demo_ids);
  DELETE FROM scene_images WHERE forest_id = ANY(demo_ids);
  DELETE FROM sapling_stores WHERE forest_id = ANY(demo_ids);
  DELETE FROM user_role_forest_accesses WHERE forest_id = ANY(demo_ids);

  DELETE FROM forests WHERE id = ANY(demo_ids);
END $$;
