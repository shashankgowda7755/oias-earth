-- =====================================================================
-- 007_carbon_engine.sql
-- Credit-grade carbon: species allometry params + per-tree carbon ledger.
--
-- Replaces the indefensible linear carbon_offset_per_day model for credit-facing
-- numbers. CO2 is computed from MEASURED DBH/height per visit via an allometric
-- equation (Chave 2014 pantropical: AGB = 0.0673*(WD*DBH^2*H)^0.976), + roots
-- (BGB = 0.24*AGB), * 0.47 carbon fraction * 3.667 = kg CO2e STOCK. Sequestration
-- = stock DELTA between visits. See docs/carbon-credit-strategy.md.
--
-- DBH NOTE: forest_plant_timelines.diameter has no breast-height convention yet,
-- so dbh_unverified defaults TRUE. Set FALSE once measured as true DBH @1.3m.
-- =====================================================================

-- Species allometry parameters.
ALTER TABLE master_plantspecies ADD COLUMN IF NOT EXISTS wood_density     DOUBLE PRECISION;
ALTER TABLE master_plantspecies ADD COLUMN IF NOT EXISTS allometry_form   TEXT;
ALTER TABLE master_plantspecies ADD COLUMN IF NOT EXISTS allometry_a      DOUBLE PRECISION;
ALTER TABLE master_plantspecies ADD COLUMN IF NOT EXISTS allometry_b      DOUBLE PRECISION;
ALTER TABLE master_plantspecies ADD COLUMN IF NOT EXISTS allometry_source TEXT;

-- DBH provenance on each visit.
ALTER TABLE forest_plant_timelines ADD COLUMN IF NOT EXISTS dbh_unverified BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE forest_plant_timelines ADD COLUMN IF NOT EXISTS dbh_method     TEXT;

-- Default every species to the Chave-2014 pantropical form + a generic wood
-- density; refine per species below. WD in g/cm3.
UPDATE master_plantspecies
   SET allometry_form = COALESCE(allometry_form, 'chave2014'),
       allometry_source = COALESCE(allometry_source, 'Chave et al. 2014 pantropical; WD from Global Wood Density DB'),
       wood_density = COALESCE(wood_density, 0.60);

-- Known Indian species wood densities (g/cm3) — refine as the catalog is mapped.
UPDATE master_plantspecies SET wood_density = 0.51 WHERE wood_density = 0.60 AND (species_name ILIKE '%mangifera%' OR common_name ILIKE '%mango%');
UPDATE master_plantspecies SET wood_density = 0.68 WHERE wood_density = 0.60 AND (species_name ILIKE '%azadirachta%' OR common_name ILIKE '%neem%');
UPDATE master_plantspecies SET wood_density = 0.62 WHERE wood_density = 0.60 AND (species_name ILIKE '%tectona%' OR common_name ILIKE '%teak%');
UPDATE master_plantspecies SET wood_density = 0.59 WHERE wood_density = 0.60 AND (species_name ILIKE '%pongamia%' OR species_name ILIKE '%millettia%' OR common_name ILIKE '%pongam%');
UPDATE master_plantspecies SET wood_density = 0.70 WHERE wood_density = 0.60 AND (species_name ILIKE '%tamarindus%' OR common_name ILIKE '%tamarind%');
UPDATE master_plantspecies SET wood_density = 0.74 WHERE wood_density = 0.60 AND (species_name ILIKE '%syzygium%' OR common_name ILIKE '%jamun%' OR common_name ILIKE '%naval%');

-- Per-tree carbon ledger: one append-only row per visit. tCO2e stock + delta,
-- vintage-tagged. Dead visits freeze stock (delta 0). This is the auditable,
-- registry-ingestible record.
CREATE TABLE IF NOT EXISTS forest_tree_carbon_ledger (
  id             SERIAL PRIMARY KEY,
  tree_id        UUID REFERENCES forest_trees(id),
  timeline_id    INTEGER REFERENCES forest_plant_timelines(id),
  forest_id      UUID REFERENCES forests(id),
  species_id     INTEGER,
  measured_at    DATE,
  dbh_cm         DOUBLE PRECISION,
  height_m       DOUBLE PRECISION,
  status_id      INTEGER,
  wood_density   DOUBLE PRECISION,
  agb_kg         DOUBLE PRECISION,
  bgb_kg         DOUBLE PRECISION,
  carbon_kg      DOUBLE PRECISION,
  co2e_kg        DOUBLE PRECISION,        -- stock at this visit
  co2e_delta_kg  DOUBLE PRECISION,        -- sequestered since previous visit
  vintage_year   INTEGER,
  method_version TEXT,
  dbh_unverified BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ctl_tree_id ON forest_tree_carbon_ledger(tree_id);
CREATE INDEX IF NOT EXISTS idx_ctl_timeline ON forest_tree_carbon_ledger(timeline_id);
CREATE INDEX IF NOT EXISTS idx_ctl_vintage ON forest_tree_carbon_ledger(vintage_year);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ctl_timeline ON forest_tree_carbon_ledger(timeline_id);
