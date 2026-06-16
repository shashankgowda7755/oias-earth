-- =====================================================================
-- 001_init.sql  —  CommuniTREE / Be The Tree Hugger admin rebuild schema
-- =====================================================================
-- Derived from spec/data_model_full.json (52 PostGraphile entities) and
-- spec/rest_list_shapes.json (live REST snake_case shapes).
--
-- Conventions (faithful to the original Postgres schema):
--   * snake_case column names exactly as the REST layer returns them.
--   * uuid primary keys default gen_random_uuid() (pgcrypto / pg13+ core).
--   * created_at / updated_at timestamptz default now().
--   * Soft delete via is_active boolean (spec: "isActive flag suggests soft
--     delete"). DELETE endpoints set is_active=false, they do not hard-delete.
--   * JSON columns use jsonb (spec lists them as JSON; jsonb is the sane choice).
--   * Lookup/master tables that the original keyed on serial ints keep int ids
--     (master_roles, master_plantspecies, planters, tree_status_master,
--      master_planting_reasons, *_master order tables, etc).
--
-- IMPROVEMENT NOTE: the original mixes id types (uuid for most, serial int for
-- lookups and a legacy integer user_id on user_profiles). We reproduce that
-- faithfully rather than normalising, so the REST shapes match 1:1. A v2 could
-- standardise on uuid everywhere.
--
-- This file creates EVERY admin-relevant table plus all 52 tables from the
-- introspection where feasible, so the schema is a faithful superset. Tables
-- not surfaced in the 6 admin sections (sapling e-commerce, whatsapp/nudge,
-- donor/gift) are included at the end for completeness and marked OUT-OF-SCOPE.
-- =====================================================================

-- gen_random_uuid() is PostgreSQL 15 CORE (and present in PGlite's PG15 build),
-- so no extension is strictly required. We still try to load pgcrypto when the
-- backend has it (older real Postgres), but tolerate its absence (PGlite) so the
-- same migration runs on both backends. Wrapped in a DO block: a failed
-- CREATE EXTENSION is caught instead of aborting the whole migration.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pgcrypto unavailable (% ) — relying on core gen_random_uuid()', SQLERRM;
END $$;

-- ---------------------------------------------------------------------
-- master_roles  (lookup, int pk)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS master_roles (
  id          SERIAL PRIMARY KEY,
  name        TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- user_profiles
-- NOTE: holds the auth credentials for our rebuild (username + password_hash).
-- The original split auth into a separate dev-auth service whose user table we
-- could not introspect; we fold username/password_hash onto user_profiles so a
-- single Postgres is self-contained for local dev. (Documented deviation.)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_profiles (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name           TEXT,
  last_name            TEXT,
  address              TEXT,
  email_id             TEXT,
  mobile_no            BIGINT,
  mobile_country_code  TEXT,
  user_id              INTEGER,            -- legacy numeric auth id
  username             TEXT UNIQUE,        -- rebuild: login identifier
  password_hash        TEXT,               -- rebuild: bcrypt hash (never returned)
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  is_verified          BOOLEAN NOT NULL DEFAULT FALSE,
  otp                  TEXT,
  image_url            TEXT,
  created_by           UUID,
  updated_by           UUID,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- user_roles  (profile <-> role)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID REFERENCES user_profiles(id),
  role_id     INTEGER REFERENCES master_roles(id),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_by  UUID,
  updated_by  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_roles_profile_id ON user_roles(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id    ON user_roles(role_id);

-- ---------------------------------------------------------------------
-- sponsors
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sponsors (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_name          TEXT,
  sponsor_logo          TEXT,
  sponsor_forest_logo   TEXT,
  sponsor_tree_logo     TEXT,
  sponsor_og_image_url  TEXT,
  established_year      TEXT,
  website_url           TEXT,
  industry              TEXT,
  headquarters          TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_by            UUID,
  updated_by            UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sponsors_name ON sponsors(sponsor_name);

-- ---------------------------------------------------------------------
-- employees
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT,
  profile_image TEXT,
  designation   TEXT,
  contact_no    TEXT,
  email_id      TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_by    UUID,
  updated_by    UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(name);

-- ---------------------------------------------------------------------
-- forests  (largest entity; many jsonb columns)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS forests (
  id                                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forest_name                          TEXT,
  forest_desc                          TEXT,
  forest_unique_id                     TEXT,
  forest_internal_id                   TEXT,
  forest_url                           TEXT,
  forest_geo_lat                       TEXT,
  forest_geo_long                      TEXT,
  forest_geo_radius                    TEXT,
  forest_geo_shape                     TEXT,
  forest_boundary                      JSONB,
  forest_oxygen                        NUMERIC,
  forest_carbonoffset                  NUMERIC,
  forest_address                       TEXT,
  forest_city                          TEXT,
  forest_state                         TEXT,
  forest_country                       TEXT,
  is_active                            BOOLEAN NOT NULL DEFAULT TRUE,
  total_trees                          INTEGER,
  average_age                          DOUBLE PRECISION,
  total_species_planted                INTEGER,
  total_drying                         INTEGER,
  total_damaged                        INTEGER,
  total_empty_pits                     INTEGER,
  total_dead                           INTEGER,
  box_rows                             INTEGER,
  box_column                           INTEGER,
  box_to_box_distance                  DOUBLE PRECISION,
  tree_row                             INTEGER,
  tree_column                          INTEGER,
  tree_to_tree_distance                DOUBLE PRECISION,
  direction_angle                      INTEGER,
  boundary_gap                         INTEGER,
  project_site                         TEXT,
  project_details                      JSONB,
  project_period                       INTEGER,
  plantation_date                      DATE,
  plantation_strategy                  TEXT,
  plantation_strategy_other            TEXT,
  irrigation_method                    TEXT,
  irrigation_method_other              TEXT,
  climate                              TEXT,
  climate_other                        TEXT,
  soil_type                            TEXT,
  soil_type_other                      TEXT,
  soil_ph_level                        JSONB,
  temperature_humidity                 JSONB,
  land_ownership                       JSONB,
  land_area                            JSONB,
  authorization_details                JSONB,
  permission_letter                    TEXT,
  area_population_statistics_details   JSONB,
  direct_and_indirect_beneficiaries    JSONB,
  forest_value_flow_impact_report      JSONB,
  species_details                      JSONB,
  maintenance_workforce                JSONB,
  plant_growth_data                    JSONB,
  environmental_need_indicators        JSONB,
  security_and_infrastructure          JSONB,
  plantation_progress                  JSONB,
  additional_sponsor_logo              JSONB,
  dashboard_images                     JSONB,
  report_images                        JSONB,
  site_layout                          TEXT,
  pathway_spacing                      DOUBLE PRECISION,
  digipin                              TEXT,
  last_inspection_date                 TIMESTAMPTZ,
  is_updated                           BOOLEAN NOT NULL DEFAULT FALSE,
  created_by                           UUID,
  updated_by                           UUID,
  created_at                           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_forests_name       ON forests(forest_name);
CREATE INDEX IF NOT EXISTS idx_forests_created_by ON forests(created_by);
CREATE INDEX IF NOT EXISTS idx_forests_unique_id  ON forests(forest_unique_id);

-- ---------------------------------------------------------------------
-- reports
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year            INTEGER,
  quarter         INTEGER,
  report_date     TIMESTAMPTZ,
  plantation_date TIMESTAMPTZ,
  start_date      TIMESTAMPTZ,
  end_date        TIMESTAMPTZ,
  mode            TEXT,
  type            TEXT,
  version         INTEGER,
  report_data     JSONB,
  project_period  INTEGER,
  skip            JSONB DEFAULT '[]'::jsonb,
  forest_id       UUID REFERENCES forests(id),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      UUID,
  updated_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reports_forest_id  ON reports(forest_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_by ON reports(created_by);
CREATE INDEX IF NOT EXISTS idx_reports_year_qtr   ON reports(year, quarter);

-- ---------------------------------------------------------------------
-- jobs  (async job monitor; read-only in admin)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          TEXT NOT NULL,
  job_type        TEXT,
  job_description JSONB,
  status          TEXT NOT NULL,
  payload         JSONB,
  result          JSONB,
  created_by      UUID NOT NULL,
  updated_by      UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_jobs_job_id ON jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

-- ---------------------------------------------------------------------
-- Lookup tables referenced by forest_trees
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tree_status_master (
  id         SERIAL PRIMARY KEY,
  status     TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS master_planting_reasons (
  id         SERIAL PRIMARY KEY,
  reason     TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS planters (
  id         SERIAL PRIMARY KEY,
  name       TEXT,
  mobile_no  BIGINT,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS master_plantspecies (
  id                            SERIAL PRIMARY KEY,
  species_category              TEXT,
  species_name                  TEXT,
  species_desc                  TEXT,
  common_name                   TEXT,
  species_oxygen_level1         TEXT,
  species_oxygen_level2         TEXT,
  species_oxygen_level3         TEXT,
  species_oxygen_level4         TEXT,
  species_oxygen_level5         TEXT,
  oxygen_per_day                DOUBLE PRECISION,
  carbon_offset_per_day         DOUBLE PRECISION,
  rate                          DOUBLE PRECISION,
  sapling_order                 INTEGER,
  is_sapling_order_from_whatsapp BOOLEAN NOT NULL DEFAULT FALSE,
  is_timber_production          BOOLEAN NOT NULL DEFAULT FALSE,
  is_nesting_habitat            BOOLEAN NOT NULL DEFAULT FALSE,
  is_flowering_plant            BOOLEAN NOT NULL DEFAULT FALSE,
  is_fruit_bearing              BOOLEAN NOT NULL DEFAULT FALSE,
  is_active                     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_plantspecies_name ON master_plantspecies(species_name);
CREATE INDEX IF NOT EXISTS idx_plantspecies_common ON master_plantspecies(common_name);

-- ---------------------------------------------------------------------
-- forest_boxes  (referenced by forest_trees.box_id)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS forest_boxes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT,
  forest_id       UUID REFERENCES forests(id),
  box_direction   TEXT,
  box_boundary    JSONB,
  max_rows        INTEGER,
  max_columns     INTEGER,
  min_distance    DOUBLE PRECISION,
  unique_id       TEXT,
  row_position    INTEGER,
  column_position INTEGER,
  box_lat         TEXT,
  box_long        TEXT,
  start           TEXT,
  prefix          TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      UUID,
  updated_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_forest_boxes_forest_id ON forest_boxes(forest_id);

-- ---------------------------------------------------------------------
-- forest_trees
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS forest_trees (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forest_id                UUID REFERENCES forests(id),
  master_plant_species_id  INTEGER REFERENCES master_plantspecies(id),
  forest_tree_name         TEXT,
  forest_tree_petname      TEXT,
  forest_tree_height       TEXT,
  forest_tree_dia          TEXT,
  forest_tree_age          INTEGER,
  forest_tree_oxygen       TEXT,
  forest_tree_carbonoffset TEXT,
  forest_tree_geo_lat      TEXT,
  forest_tree_geo_long     TEXT,
  tree_unique_id           TEXT,
  tree_status_id           INTEGER REFERENCES tree_status_master(id),
  planter_id               INTEGER REFERENCES planters(id),
  planter_reason_id        INTEGER REFERENCES master_planting_reasons(id),
  planting_message         TEXT,
  planted_on               DATE,
  planted_by               TEXT,
  box_id                   UUID REFERENCES forest_boxes(id),
  cluster_ids              UUID[],
  sponsored_by             UUID REFERENCES sponsors(id),
  assigned_to              UUID,
  is_display               BOOLEAN NOT NULL DEFAULT TRUE,
  is_active                BOOLEAN NOT NULL DEFAULT TRUE,
  landmark                 TEXT,
  created_by               UUID,
  updated_by               UUID,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_forest_trees_forest_id ON forest_trees(forest_id);
CREATE INDEX IF NOT EXISTS idx_forest_trees_species   ON forest_trees(master_plant_species_id);
CREATE INDEX IF NOT EXISTS idx_forest_trees_box_id    ON forest_trees(box_id);
CREATE INDEX IF NOT EXISTS idx_forest_trees_sponsor   ON forest_trees(sponsored_by);

-- ---------------------------------------------------------------------
-- forest_clusters  (map clustering)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS forest_clusters (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lat        TEXT NOT NULL,
  lng        TEXT NOT NULL,
  zoom       INTEGER,
  tree_count INTEGER,
  tree       JSONB,
  forest_id  UUID REFERENCES forests(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_forest_clusters_forest_id ON forest_clusters(forest_id);

-- ---------------------------------------------------------------------
-- Join tables
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_role_forest_accesses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_role_id UUID REFERENCES user_roles(id),
  forest_id    UUID REFERENCES forests(id),
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_by   UUID,
  updated_by   UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_urfa_user_role_id ON user_role_forest_accesses(user_role_id);
CREATE INDEX IF NOT EXISTS idx_urfa_forest_id    ON user_role_forest_accesses(forest_id);

CREATE TABLE IF NOT EXISTS forest_sponsors (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forest_id  UUID REFERENCES forests(id),
  sponsor_id UUID REFERENCES sponsors(id),
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_forest_sponsors_forest_id  ON forest_sponsors(forest_id);
CREATE INDEX IF NOT EXISTS idx_forest_sponsors_sponsor_id ON forest_sponsors(sponsor_id);

CREATE TABLE IF NOT EXISTS forests_employees (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forest_id   UUID REFERENCES forests(id),
  employee_id UUID REFERENCES employees(id),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_by  UUID,
  updated_by  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_forests_employees_forest_id   ON forests_employees(forest_id);
CREATE INDEX IF NOT EXISTS idx_forests_employees_employee_id ON forests_employees(employee_id);

CREATE TABLE IF NOT EXISTS forests_reports (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forest_id  UUID REFERENCES forests(id),
  report_id  UUID REFERENCES reports(id),
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_forests_reports_forest_id ON forests_reports(forest_id);
CREATE INDEX IF NOT EXISTS idx_forests_reports_report_id ON forests_reports(report_id);

-- ---------------------------------------------------------------------
-- Forest sub-objects / asset media (admin-reachable supporting tables)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS forest_asserts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forest_id  UUID REFERENCES forests(id),
  type       TEXT,
  url        TEXT,
  "order"    INTEGER,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_forest_asserts_forest_id ON forest_asserts(forest_id);

CREATE TABLE IF NOT EXISTS tree_asserts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id    UUID REFERENCES forest_trees(id),
  type       TEXT,
  url        TEXT,
  "order"    INTEGER,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tree_asserts_tree_id ON tree_asserts(tree_id);

CREATE TABLE IF NOT EXISTS forest_tree_activities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forest_tree_id UUID REFERENCES forest_trees(id),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_by    UUID,
  updated_by    UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fta_tree_id ON forest_tree_activities(forest_tree_id);

CREATE TABLE IF NOT EXISTS forest_tree_sponsors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forest_tree_id UUID REFERENCES forest_trees(id),
  sponsor_id    UUID REFERENCES sponsors(id),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_by    UUID,
  updated_by    UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fts_tree_id    ON forest_tree_sponsors(forest_tree_id);
CREATE INDEX IF NOT EXISTS idx_fts_sponsor_id ON forest_tree_sponsors(sponsor_id);

CREATE TABLE IF NOT EXISTS forest_plant_timelines (
  id            SERIAL PRIMARY KEY,
  plant_id      UUID REFERENCES forest_trees(id),
  species_id    INTEGER REFERENCES master_plantspecies(id),
  status_id     INTEGER REFERENCES tree_status_master(id),
  height        DOUBLE PRECISION,
  diameter      DOUBLE PRECISION,
  age           INTEGER,
  latitude      TEXT,
  longitude     TEXT,
  timeline_date DATE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_by    UUID,
  updated_by    UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fpt_plant_id ON forest_plant_timelines(plant_id);

CREATE TABLE IF NOT EXISTS forest_plant_timeline_assets (
  id          SERIAL PRIMARY KEY,
  timeline_id INTEGER REFERENCES forest_plant_timelines(id),
  type        TEXT,
  url         TEXT,
  "order"     INTEGER,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_by  UUID,
  updated_by  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fpta_timeline_id ON forest_plant_timeline_assets(timeline_id);

-- =====================================================================
-- OUT-OF-SCOPE for this admin UI (donor / gift-plant / sapling e-commerce /
-- whatsapp / nudge). Created for schema completeness per the brief's
-- "full set of 52 tables if feasible". Not exposed by any of the 6 admin
-- sections. (spec openQuestions: confirm these are out of scope.)
-- =====================================================================
CREATE TABLE IF NOT EXISTS donors (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name           TEXT NOT NULL,
  donor_logo          TEXT NOT NULL,
  email               TEXT NOT NULL,
  mobile_country_code INTEGER NOT NULL,
  mobile_no           BIGINT NOT NULL,
  created_by          UUID,
  updated_by          UUID,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS donor_sponsors (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id   UUID REFERENCES donors(id),
  sponsor_id UUID REFERENCES sponsors(id),
  created_by UUID,
  updated_by UUID,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS donor_trees (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id   UUID REFERENCES donors(id),
  tree_id    UUID REFERENCES forest_trees(id),
  donated_on TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gift_forest_plants (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_tree_id        UUID REFERENCES forest_trees(id),
  salutation          TEXT,
  name                TEXT,
  user_asset_url      TEXT,
  designation         TEXT,
  email_id            TEXT,
  mobile_no_std_code  INTEGER,
  mobile_no           BIGINT,
  organization_name   TEXT,
  org_logo_url        TEXT,
  message             TEXT,
  allocating_on       DATE,
  is_email_sent       BOOLEAN NOT NULL DEFAULT FALSE,
  gift_certificate_url TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_by          UUID,
  updated_by          UUID,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_type_master (
  id                SERIAL PRIMARY KEY,
  type              TEXT,
  "order"           INTEGER,
  created_by        UUID,
  updated_by        UUID,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_status_master (
  id                 SERIAL PRIMARY KEY,
  status             TEXT,
  status_arrange_no  INTEGER,
  created_by         UUID,
  updated_by         UUID,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_payment_modes_master (
  id            SERIAL PRIMARY KEY,
  payment_modes TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_activity_type_master (
  id            SERIAL PRIMARY KEY,
  activity_type TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sapling_order_addresses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name           TEXT NOT NULL,
  mobile_country_code INTEGER NOT NULL,
  mobile_no           BIGINT NOT NULL,
  pincode             TEXT NOT NULL,
  door_no             TEXT NOT NULL,
  address1            TEXT NOT NULL,
  address2            TEXT,
  landmark            TEXT NOT NULL,
  city                TEXT NOT NULL,
  state               TEXT NOT NULL,
  country             TEXT NOT NULL,
  created_by          UUID,
  updated_by          UUID,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sapling_orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no              TEXT NOT NULL,
  order_type_id         INTEGER REFERENCES order_type_master(id),
  order_status_id       INTEGER REFERENCES order_status_master(id),
  total_amount          DOUBLE PRECISION,
  ordered_date          TIMESTAMPTZ,
  expected_delivery_date TIMESTAMPTZ,
  shipping_address_id   UUID REFERENCES sapling_order_addresses(id),
  billing_address_id    UUID REFERENCES sapling_order_addresses(id),
  created_by            UUID,
  updated_by            UUID,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sapling_order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sapling_order_id UUID REFERENCES sapling_orders(id),
  species_id      INTEGER REFERENCES master_plantspecies(id),
  count           INTEGER,
  rate            DOUBLE PRECISION,
  created_by      UUID,
  updated_by      UUID,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sapling_stores (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  logo       TEXT,
  contact    TEXT NOT NULL,
  "desc"     TEXT,
  address    JSONB,
  latitude   DOUBLE PRECISION NOT NULL,
  longitude  DOUBLE PRECISION NOT NULL,
  forest_id  UUID REFERENCES forests(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_payments (
  id             SERIAL PRIMARY KEY,
  order_id       UUID NOT NULL REFERENCES sapling_orders(id),
  payment_mode_id INTEGER REFERENCES order_payment_modes_master(id),
  transaction_id TEXT NOT NULL,
  comment        TEXT,
  payment_date   TIMESTAMPTZ,
  amount         DOUBLE PRECISION NOT NULL,
  payment_json   JSONB,
  created_by     UUID,
  updated_by     UUID,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_activity_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES sapling_orders(id),
  activity_type_id INTEGER REFERENCES order_activity_type_master(id),
  comment         TEXT,
  activity_date   TIMESTAMPTZ,
  created_by      UUID,
  updated_by      UUID,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contact_from_whatsapp_orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code     TEXT,
  mobile           TEXT NOT NULL,
  name             TEXT,
  is_user_converted BOOLEAN,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS whatsapp_user_steps (
  id                                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code                      TEXT,
  mobile                            TEXT NOT NULL,
  current_step                      TEXT NOT NULL,
  is_tree_planting_for_special_occasion BOOLEAN,
  occasion                          TEXT,
  name                              TEXT,
  date_of_occasion                  TIMESTAMPTZ,
  number_of_trees                   INTEGER,
  is_dedication_message             BOOLEAN,
  dedication_message                TEXT,
  is_want_to_purchase_tree          BOOLEAN,
  payment_json                      JSONB,
  metadata                          JSONB,
  whatsapp_order_status             TEXT,
  is_active                         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS broadcast_lists (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       UUID REFERENCES user_profiles(id),
  initial_planted_on DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nudge_configurations (
  id            SERIAL PRIMARY KEY,
  name          TEXT,
  specific_date TIMESTAMPTZ,
  days          INTEGER,
  message       TEXT NOT NULL,
  status        BOOLEAN,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nudge_sequence_configurations (
  id                        SERIAL PRIMARY KEY,
  number_of_days_before_notify INTEGER,
  days_frequency            INTEGER,
  is_active                 BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sequelize migration bookkeeping table (present in the original; harmless).
CREATE TABLE IF NOT EXISTS "SequelizeMeta" (
  name TEXT PRIMARY KEY
);

-- =====================================================================
-- updated_at auto-touch trigger (so updates bump updated_at without the
-- app having to set it every time). Applied to the admin entities.
-- =====================================================================
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger to each admin entity. Tolerant: if the backend lacks
-- plpgsql trigger support the migration still completes (routes set updated_by
-- explicitly; updated_at simply won't auto-touch). Both real Postgres and
-- PGlite's PG15 build support this.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'master_roles','user_profiles','user_roles','sponsors','employees',
    'forests','reports','jobs','tree_status_master','master_planting_reasons',
    'planters','master_plantspecies','forest_boxes','forest_trees',
    'forest_clusters','user_role_forest_accesses','forest_sponsors',
    'forests_employees','forests_reports'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_set_updated_at ON %I;
       CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION set_updated_at();', t, t);
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'updated_at trigger setup skipped: %', SQLERRM;
END $$;
