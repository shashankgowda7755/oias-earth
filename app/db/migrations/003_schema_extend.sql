-- =====================================================================
-- 003_schema_extend.sql  —  schema completeness for the FULL forest/upsert
-- payload, bulk gift import, and the sponsor/geo read endpoints.
-- =====================================================================
-- Additive + idempotent (ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT
-- EXISTS / CREATE INDEX IF NOT EXISTS). Safe to re-run; never drops data.
--
-- Why a 003 rather than editing 001: 001 already shipped + smoke-tested, and
-- the migration runner applies files in lexical order against persisted PGlite
-- data. Layering the new columns keeps existing seeded rows intact.
--
-- Reconciliation note (forest_boxes): 001 modelled boxes with
-- max_rows/max_columns/unique_id. The forest_and_bulk_contracts.md spec names
-- the box grid columns row/column/prefix/start/row_position/column_position/
-- tree_to_tree_distance. We ADD the spec columns (the 001 ones remain, unused
-- by the new upsert) so both shapes are present.
-- =====================================================================

-- ---------------------------------------------------------------------
-- forests — ensure every scalar/jsonb column the full payload persists.
-- (Most already exist from 001; these guards cover any drift + the columns
-- the brief calls out explicitly: forest_boundary, digipin,
-- last_inspection_date, permission_letter, site_layout, project_site.)
-- ---------------------------------------------------------------------
ALTER TABLE forests ADD COLUMN IF NOT EXISTS forest_boundary                    JSONB;
ALTER TABLE forests ADD COLUMN IF NOT EXISTS site_layout                        TEXT;
ALTER TABLE forests ADD COLUMN IF NOT EXISTS permission_letter                  TEXT;
ALTER TABLE forests ADD COLUMN IF NOT EXISTS digipin                            TEXT;
ALTER TABLE forests ADD COLUMN IF NOT EXISTS last_inspection_date               TIMESTAMPTZ;
ALTER TABLE forests ADD COLUMN IF NOT EXISTS project_site                       TEXT;
ALTER TABLE forests ADD COLUMN IF NOT EXISTS pathway_spacing                    DOUBLE PRECISION;
ALTER TABLE forests ADD COLUMN IF NOT EXISTS soil_ph_level                      JSONB;
ALTER TABLE forests ADD COLUMN IF NOT EXISTS temperature_humidity               JSONB;
ALTER TABLE forests ADD COLUMN IF NOT EXISTS land_ownership                     JSONB;
ALTER TABLE forests ADD COLUMN IF NOT EXISTS land_area                          JSONB;
ALTER TABLE forests ADD COLUMN IF NOT EXISTS authorization_details              JSONB;
ALTER TABLE forests ADD COLUMN IF NOT EXISTS area_population_statistics_details JSONB;
ALTER TABLE forests ADD COLUMN IF NOT EXISTS direct_and_indirect_beneficiaries  JSONB;
ALTER TABLE forests ADD COLUMN IF NOT EXISTS forest_value_flow_impact_report    JSONB;
ALTER TABLE forests ADD COLUMN IF NOT EXISTS species_details                    JSONB;
ALTER TABLE forests ADD COLUMN IF NOT EXISTS maintenance_workforce              JSONB;
ALTER TABLE forests ADD COLUMN IF NOT EXISTS plant_growth_data                  JSONB;
ALTER TABLE forests ADD COLUMN IF NOT EXISTS environmental_need_indicators      JSONB;
ALTER TABLE forests ADD COLUMN IF NOT EXISTS security_and_infrastructure        JSONB;
ALTER TABLE forests ADD COLUMN IF NOT EXISTS plantation_progress                JSONB;
ALTER TABLE forests ADD COLUMN IF NOT EXISTS additional_sponsor_logo            JSONB;
ALTER TABLE forests ADD COLUMN IF NOT EXISTS dashboard_images                   JSONB;
ALTER TABLE forests ADD COLUMN IF NOT EXISTS report_images                      JSONB;
-- enum-backed scalar columns (stored as TEXT; values validated app-side).
ALTER TABLE forests ADD COLUMN IF NOT EXISTS plantation_strategy                TEXT;
ALTER TABLE forests ADD COLUMN IF NOT EXISTS plantation_strategy_other          TEXT;
ALTER TABLE forests ADD COLUMN IF NOT EXISTS irrigation_method                  TEXT;
ALTER TABLE forests ADD COLUMN IF NOT EXISTS irrigation_method_other            TEXT;
ALTER TABLE forests ADD COLUMN IF NOT EXISTS climate                            TEXT;
ALTER TABLE forests ADD COLUMN IF NOT EXISTS climate_other                      TEXT;
ALTER TABLE forests ADD COLUMN IF NOT EXISTS soil_type                          TEXT;
ALTER TABLE forests ADD COLUMN IF NOT EXISTS soil_type_other                    TEXT;

-- ---------------------------------------------------------------------
-- forest_boxes — add the spec grid columns alongside the 001 ones.
-- ---------------------------------------------------------------------
ALTER TABLE forest_boxes ADD COLUMN IF NOT EXISTS "row"                 INTEGER;
ALTER TABLE forest_boxes ADD COLUMN IF NOT EXISTS "column"              INTEGER;
ALTER TABLE forest_boxes ADD COLUMN IF NOT EXISTS tree_to_tree_distance DOUBLE PRECISION;
-- (prefix, start, row_position, column_position already exist from 001.)

-- ---------------------------------------------------------------------
-- forest_trees — ensure the columns the full upsert + bulk import write.
-- 001 already has forest_tree_height/dia/age + geo + oxygen/carbon +
-- is_display + assigned_to. These guards cover drift and the bare-named
-- height/dia/age the contracts.md also lists (kept as the forest_tree_* names).
-- ---------------------------------------------------------------------
ALTER TABLE forest_trees ADD COLUMN IF NOT EXISTS forest_tree_name         TEXT;
ALTER TABLE forest_trees ADD COLUMN IF NOT EXISTS forest_tree_height       TEXT;
ALTER TABLE forest_trees ADD COLUMN IF NOT EXISTS forest_tree_dia          TEXT;
ALTER TABLE forest_trees ADD COLUMN IF NOT EXISTS forest_tree_age          INTEGER;
ALTER TABLE forest_trees ADD COLUMN IF NOT EXISTS forest_tree_oxygen       TEXT;
ALTER TABLE forest_trees ADD COLUMN IF NOT EXISTS forest_tree_carbonoffset TEXT;
ALTER TABLE forest_trees ADD COLUMN IF NOT EXISTS forest_tree_geo_lat      TEXT;
ALTER TABLE forest_trees ADD COLUMN IF NOT EXISTS forest_tree_geo_long     TEXT;
ALTER TABLE forest_trees ADD COLUMN IF NOT EXISTS planted_on               DATE;
ALTER TABLE forest_trees ADD COLUMN IF NOT EXISTS assigned_to              UUID;
ALTER TABLE forest_trees ADD COLUMN IF NOT EXISTS is_display               BOOLEAN NOT NULL DEFAULT TRUE;
-- public certificate URL for gifted/sponsored trees
-- (https://bethetreehugger.co/tree/<forest_unique_id>/<tree_unique_id>).
ALTER TABLE forest_trees ADD COLUMN IF NOT EXISTS tree_url                 TEXT;

-- A tree is unique within its forest by tree_unique_id — the bulk importer
-- upserts on (forest_id, tree_unique_id). Enforce it so ON CONFLICT works.
CREATE UNIQUE INDEX IF NOT EXISTS uq_forest_trees_forest_tree_unique
  ON forest_trees(forest_id, tree_unique_id)
  WHERE tree_unique_id IS NOT NULL;

-- FK + scan indexes called out in the brief.
CREATE INDEX IF NOT EXISTS idx_forest_trees_forest_id_2 ON forest_trees(forest_id);
CREATE INDEX IF NOT EXISTS idx_forest_trees_assigned_to ON forest_trees(assigned_to);
CREATE INDEX IF NOT EXISTS idx_forest_trees_tree_uid     ON forest_trees(tree_unique_id);

-- ---------------------------------------------------------------------
-- gift_forest_plants — the bulk gift importer needs gift_tree_id ->
-- forest_trees, name, email_id, message, gift_certificate_url, allocating_on
-- (all already exist from 001). Add the FK scan index + a uniqueness guard so
-- re-importing the same sheet updates the same gift row rather than duplicating.
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_gift_forest_plants_tree ON gift_forest_plants(gift_tree_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_gift_forest_plants_tree
  ON gift_forest_plants(gift_tree_id)
  WHERE gift_tree_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- donor / donor_trees — exist from 001 (OUT-OF-SCOPE block). Add the FK
-- indexes the brief asks for so donor-tree lookups are indexed.
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_donor_trees_donor ON donor_trees(donor_id);
CREATE INDEX IF NOT EXISTS idx_donor_trees_tree  ON donor_trees(tree_id);

-- ---------------------------------------------------------------------
-- Join tables (forest_sponsors / forests_employees / user_role_forest_accesses)
-- all exist from 001 with FK indexes. Re-assert the access-scope index used by
-- the sponsor (Admin) role gating on the geo/dashboard reads.
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_urfa_user_role_forest
  ON user_role_forest_accesses(user_role_id, forest_id);
