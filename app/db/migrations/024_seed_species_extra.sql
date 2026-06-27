-- 024_seed_species_extra.sql
-- Merge the second species upload ("Species list.xlsx", Site-1 plant data) into
-- the master_plantspecies catalog. Only species NOT already present (by botanical
-- name, accounting for synonyms/typos in the original 96-row seed) are added:
--
--   Skipped as duplicates of existing rows:
--     Millettia pinnata      = Pongamia Pinnata    (botanical synonym)
--     Polyalthia longifolia  = Polyaltha Longifolia (existing typo, id present)
--     Tectonia grandis       = Tectona grandis / Tectona Gardis (existing, Teak)
--
-- Traits (is_timber_production, is_flowering_plant, is_fruit_bearing,
-- is_nesting_habitat) are researched per-species (the source sheet carried no
-- trait columns) rather than blanket-TRUE, so slide-18 icons reflect reality.
-- Ids 97+ continue after the 96-row catalog; ON CONFLICT keeps this idempotent.

INSERT INTO master_plantspecies
  (id, oxygen_per_day, carbon_offset_per_day, rate,
   is_timber_production, is_flowering_plant, is_fruit_bearing, is_nesting_habitat,
   species_name, common_name, species_category)
VALUES
  (97,  0.225, 0.125, 100, FALSE, TRUE,  TRUE,  TRUE,  'Prunus dulcis',          'Country Almond',   'Tree'),
  (98,  0.225, 0.125, 100, TRUE,  TRUE,  FALSE, TRUE,  'Leucaena leucocephala',  'Subabul',          'Tree'),
  (99,  0.225, 0.125, 100, FALSE, TRUE,  TRUE,  TRUE,  'Annona reticulata',      'Custard Apple',    'Tree'),
  (100, 0.225, 0.125, 100, FALSE, TRUE,  TRUE,  FALSE, 'Citrus limon',           'Lemon',            'Tree'),
  (101, 0.225, 0.125, 100, TRUE,  TRUE,  FALSE, TRUE,  'Swietenia mahagoni',     'West Indian Mahogany', 'Tree'),
  (102, 0.225, 0.125, 100, TRUE,  TRUE,  FALSE, TRUE,  'Piscidia piscipula',     'Jamaica Dogwood',  'Tree')
ON CONFLICT (id) DO NOTHING;

-- Keep the id sequence ahead of the highest seeded id so future API inserts
-- don't collide with these fixed ids.
SELECT setval(pg_get_serial_sequence('master_plantspecies','id'),
              GREATEST((SELECT MAX(id) FROM master_plantspecies), 102));
