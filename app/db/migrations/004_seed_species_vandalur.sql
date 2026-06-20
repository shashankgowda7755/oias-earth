-- =====================================================================
-- 004_seed_species_vandalur.sql  —  full 96-species master catalog +
-- the canonical Vandalur sample forest (from forest_create_payload.jsonc).
-- =====================================================================
-- Idempotent: species use ON CONFLICT (id) DO UPDATE so the authoritative
-- catalog wins over the 4 placeholder species seeded in 002. The Vandalur
-- forest + its boxes/trees/joins/job use ON CONFLICT DO NOTHING (fixed UUIDs).
--
-- Placeholder-id resolution (the payload carried network-tab placeholder ids):
--   employee_id db746f3b-… -> seeded "Arun Kumar" employee (002, exact match)
--   sponsor_id  f5786b29-… -> seeded here as "Arun Forest" sponsor (exact id)
--   user_role_id 4c2d39cd-… -> mapped to the seeded SuperAdmin user_roles row
--                              (002 id 9e60326c-…); we also grant that user_role
--                              forest access to Vandalur so the sponsor portal
--                              scoping (UserRoleForestAccess) has live data.
--   box species_id 31 = Mango / Mangifera Indica (matches catalog id 31).
-- =====================================================================

-- ---- master_plantspecies : the full 96-row catalog --------------------
INSERT INTO master_plantspecies
  (id, oxygen_per_day, carbon_offset_per_day, rate,
   is_timber_production, is_flowering_plant, is_fruit_bearing, is_nesting_habitat,
   species_name, common_name, species_category)
VALUES
  (1, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Phyllanthus Emblica', 'Indian Gooseberry', 'Tree'),
  (2, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Phyllanthus Acidus', 'Otaheite Gooseberry', 'Tree'),
  (3, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Grevillea Robusta', 'Silky Oak', 'Tree'),
  (4, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Murraya Koenigii', 'Curry Tree', 'Tree'),
  (5, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Psidium Guajava', 'Guava', 'Tree'),
  (6, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Artocarpus Heterophyllus', 'Jackfruit', 'Tree'),
  (7, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Punica Granatum', 'Pomegranate', 'Tree'),
  (8, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Swietenia Macrophylla', 'Mahogany', 'Tree'),
  (9, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Madhuca Longifolia', 'Moha', 'Tree'),
  (10, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Mangolia', 'Southern Magnolia', 'Tree'),
  (11, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Pithecellobium Dulce ', 'Manila Tamarind', 'Tree'),
  (12, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Lawsonia Inermis', 'Henna', 'Tree'),
  (13, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Syzygium Cumini', 'Jamun', 'Tree'),
  (14, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Azadirachta Indica', 'Neem', 'Tree'),
  (15, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Polyaltha Longifolia', 'False Ashoka', 'Tree'),
  (16, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Vitex Negundo', 'Chaste Tree', 'Tree'),
  (17, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Pongamia Pinnata', 'Indian Beech', 'Tree'),
  (18, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Senna Tora', 'Sickle Senna', 'Tree'),
  (19, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Albizia Lebbeck', 'Sirish', 'Tree'),
  (20, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Pterocarpus Marsupiium', 'Indian Kino Tree', 'Tree'),
  (21, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Diospyros Ebenum', 'Ceylon Ebony', 'Tree'),
  (22, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Limonia Acidissima', 'Wood Apple', 'Tree'),
  (23, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Tectona Gardis', 'Teak', 'Tree'),
  (24, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Alstonia Scholaris', 'Saptaparni', 'Tree'),
  (25, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Annona Muricata', 'Soursop', 'Tree'),
  (26, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Bauhinia Purpurea', 'Orchid Tree', 'Tree'),
  (27, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Cassia Siamea', 'Thai Copperpod', 'Tree'),
  (28, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Delonix Regia', 'Flamboyant Tree', 'Tree'),
  (29, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Ficus Racemosa', 'Umar', 'Tree'),
  (30, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Lagerstroemia Speciosa', 'Jarul', 'Tree'),
  (31, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Mangifera Indica', 'Mango', 'Tree'),
  (32, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Mimusops Elengi', 'Bakul', 'Tree'),
  (33, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Neolamarckia Cadamba', 'Kadamb', 'Tree'),
  (34, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Sterculia Foetida', 'Jangli Badam', 'Tree'),
  (35, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Terminalia Arjuna', 'Arjun', 'Tree'),
  (36, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Terminalia Catappa', 'Indian Almond', 'Tree'),
  (37, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Thespesia Populnea', 'Portia Tree', 'Tree'),
  (38, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Acacia nilotica', 'Karuvelai', 'Tree'),
  (39, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Acacia leucophloea', 'Velvaelam', 'Tree'),
  (40, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Aegle marmelos', 'Maredu', 'Tree'),
  (41, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Ailanthus excelsa', 'Marukh', 'Tree'),
  (42, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Bauhinia racemosa', 'Atti', 'Tree'),
  (43, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Bombax ceiba', 'Red Silk Cotton', 'Tree'),
  (44, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Butea monosperma', 'Palash', 'Tree'),
  (45, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Cassia fistula', 'Amaltas', 'Tree'),
  (46, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Cochlospermum religiosum', 'Galgal', 'Tree'),
  (47, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Dalbargia lanceolaria', 'Bastard Rose Wood', 'Tree'),
  (48, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Dalbergia sissoo', 'Shisham', 'Tree'),
  (49, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Dillenia indica', 'Uvaa / Uvaay / Uvaa Theakku', 'Tree'),
  (50, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Dysoxylum malabaricum', 'Vellagil', 'Tree'),
  (51, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Erythrina variegata', 'Indian Coral Tree', 'Tree'),
  (52, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Eucalyptus tereticornis', 'Safeda', 'Tree'),
  (53, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Ficus amplissima', 'Piparee', 'Tree'),
  (54, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Ficus bengalensis', 'Banyan Tree', 'Tree'),
  (55, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Ficus hispida', 'Kala Umber', 'Tree'),
  (56, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Ficus mysorensis', 'Alada Mara', 'Tree'),
  (57, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Ficus religiosa', 'Peepal', 'Tree'),
  (58, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Garcinia indica', 'Kokum', 'Tree'),
  (59, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Gmelina arborea', 'Ashwatha', 'Tree'),
  (60, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Haldina cordifolia', 'Haldu', 'Tree'),
  (61, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Holoptelea integrifolia', 'Avil Thol', 'Tree'),
  (62, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Lannea cooromandelica', 'Anaikarai', 'Tree'),
  (63, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Melia dubia', 'Malabar Neem', 'Tree'),
  (64, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Mesua ferrea', 'Naga Kesaralu', 'Tree'),
  (65, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Pogamia pinnata', 'Karanj', 'Tree'),
  (66, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Pterocarpus marsupium', 'Bijasal', 'Tree'),
  (67, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Pterospermum acerifolium', 'Matsakanda', 'Tree'),
  (68, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Saraca indica', 'Sita Ashok', 'Tree'),
  (69, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Schleichera oleosa', 'Kumbadiri', 'Tree'),
  (70, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Tectona grandis', 'Sagwan', 'Tree'),
  (71, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Syzigium cumini', 'Jamun', 'Tree'),
  (72, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Terminalia bellirica', 'Behada', 'Tree'),
  (73, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Acacia ferruginea', 'Chimaivelvel', 'Tree'),
  (74, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Bauhinia racemosa', 'Bauhinia', 'Tree'),
  (75, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Samanea saman', 'Rain Tree', 'Tree'),
  (76, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Simarouba glauca', 'Soorgam', 'Tree'),
  (77, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Lagerstroemia indica', 'Crape Myrtle', 'Tree'),
  (78, 0.255, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Thespesia populnea', 'Indian Tulip', 'Tree'),
  (79, 0.255, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Euphorbia tirucalli', 'Pencil Tree', 'Tree'),
  (80, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Dimocarpus longan', 'Ilaangan', 'Tree'),
  (81, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Pterocarpus santalinus', 'Semmaram', 'Tree'),
  (82, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Dalbergia latifolia', 'Indian Rosewood', 'Tree'),
  (83, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Pongamia Pinnata', 'Indian Beech', 'Tree'),
  (84, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Millingtonia Hortensis', 'Indian Cork Tree', 'Tree'),
  (85, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Bambusoideae', 'Moongil', 'Tree'),
  (86, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Salix Tetrasperma', 'Indian willow', 'Tree'),
  (87, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Ocimum Tenuiflorum', 'Holy Basil', 'Tree'),
  (88, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Saraca Asoca', 'Ashoka', 'Tree'),
  (89, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Wrightia Tinctoria', 'Pala Indigo', 'Tree'),
  (90, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Annona Squamosa', 'Sitafal', 'Tree'),
  (91, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Gliricidia', 'Gliricidia', 'Tree'),
  (92, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Duranta Erecta', 'Golden Dewdrop', 'Tree'),
  (93, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Tamarindus Indica', 'Tamarind', 'Tree'),
  (94, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Bauhinia Purpurea', 'Orchid Tree', 'Tree'),
  (95, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Prosopis Cineraria', 'Shami Tree', 'Tree'),
  (96, 0.225, 0.125, 100, TRUE, TRUE, TRUE, TRUE, 'Couroupita guianensis', 'Nagalingam', 'Tree')
ON CONFLICT (id) DO UPDATE SET
  oxygen_per_day        = EXCLUDED.oxygen_per_day,
  carbon_offset_per_day = EXCLUDED.carbon_offset_per_day,
  rate                  = EXCLUDED.rate,
  is_timber_production  = EXCLUDED.is_timber_production,
  is_flowering_plant    = EXCLUDED.is_flowering_plant,
  is_fruit_bearing      = EXCLUDED.is_fruit_bearing,
  is_nesting_habitat    = EXCLUDED.is_nesting_habitat,
  species_name          = EXCLUDED.species_name,
  common_name           = EXCLUDED.common_name,
  species_category      = EXCLUDED.species_category;
-- keep the SERIAL sequence ahead of the explicit ids.
SELECT setval(pg_get_serial_sequence('master_plantspecies','id'),
              GREATEST((SELECT MAX(id) FROM master_plantspecies), 96));


-- ---- sponsor referenced by the Vandalur payload (placeholder id) ------
INSERT INTO sponsors (
  id, sponsor_name, sponsor_logo, established_year, website_url, industry,
  headquarters, is_active, created_by, updated_by
) VALUES (
  'f5786b29-cd96-40aa-abc4-3628cfd99f5e', 'Arun Forest',
  'https://bethetreehugger-staging.objectstore.e2enetworks.net/bth_files/forest/1781294003132_0_logo.png',
  '2020', 'https://arunforest.example.com', 'Environmental', 'Chennai',
  TRUE, 'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0', 'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0'
) ON CONFLICT (id) DO NOTHING;

-- ---- Vandalur forest (full payload -> every scalar + jsonb column) -----
INSERT INTO forests (
  id, forest_name, forest_desc, forest_unique_id, forest_internal_id,
  forest_geo_lat, forest_geo_long, forest_address, forest_city, forest_state, forest_country,
  box_rows, box_column, box_to_box_distance, tree_row, tree_column, tree_to_tree_distance,
  direction_angle, boundary_gap, pathway_spacing,
  project_site, project_period, plantation_date,
  plantation_strategy, plantation_strategy_other, irrigation_method, irrigation_method_other,
  climate, climate_other, soil_type, soil_type_other,
  digipin, last_inspection_date, permission_letter, site_layout,
  total_trees, average_age, total_species_planted,
  forest_oxygen, forest_carbonoffset,
  land_ownership, land_area, authorization_details,
  area_population_statistics_details, direct_and_indirect_beneficiaries,
  forest_value_flow_impact_report, species_details, maintenance_workforce,
  plant_growth_data, soil_ph_level, temperature_humidity,
  environmental_need_indicators, security_and_infrastructure, plantation_progress,
  additional_sponsor_logo, dashboard_images, report_images,
  is_updated, is_active, created_by, updated_by
) VALUES (
  '7a11d000-0000-4000-8000-000000000702',
  'Vandalur Forest', 'This is Vandalur Forest', 'KISVAN63', '702',
  '12.891256', '80.081001', 'Vandalur, Tamil Nadu 600048, India', 'Chennai', 'Tamil Nadu', 'India',
  1, 1, 1, 1, 1, 1,
  90, 1, 1,
  'Vandalur Forest Site', 3, '2023-06-30',
  'mixed_species', '', 'borewell', '',
  'summer', '', 'red_soil', '',
  'DIGIPIN12345', '2026-06-01T00:00:00.000Z',
  'https://bethetreehugger-staging.objectstore.e2enetworks.net/bth_files/forest/1781294129078_0_permission.png',
  'https://bethetreehugger-staging.objectstore.e2enetworks.net/bth_files/forest/1781294125465_0_layout.png',
  1, 2.96, 1,
  243.45, 135.25,
  '{"name":"Arun","agreement_status":"agreement_confirmed"}'::jsonb,
  '{"total_area":2000,"planted_area":1000}'::jsonb,
  '{"authorized_by_name":"Arun","authorized_by_designation":"Software Engineer","authorized_date":"2023-06-01","authorized_period":"3","project_context":"This is Vandalur Forest"}'::jsonb,
  '{"total_jurisdiction_area":2000,"population":200000,"population_density":15000,"green_cover":"Green Cover","environmental_need":"Environmental Need","google_earth_image":[{"image":"https://bethetreehugger-staging.objectstore.e2enetworks.net/bth_files/forest/1781295708089_0.png","year":2010,"population":10000},{"image":"https://bethetreehugger-staging.objectstore.e2enetworks.net/bth_files/forest/1781295723198_0.png","year":2012,"population":14000},{"image":"https://bethetreehugger-staging.objectstore.e2enetworks.net/bth_files/forest/1781295739175_0.png","year":2016,"population":16000}]}'::jsonb,
  '{"site_supervisor":1,"watering_team":1,"de_weeding_crew":1,"plant_health_specialist":1,"people_visiting":"1","people_living_near":"1","schools_colleges":1}'::jsonb,
  '{"short_term":{"land_value":1,"tree_value":1,"oxygen_generated":1,"carbon_sequestration":1},"medium_term":{"land_value":1,"tree_value":1,"oxygen_generated":1,"carbon_sequestration":1},"long_term":{"land_value":1,"tree_value":1,"oxygen_generated":1,"carbon_sequestration":1}}'::jsonb,
  '{"health":"good","health_other":"","mortality_rate":1,"other_issues":"Other Issues","additional_scope":"Additional Scope"}'::jsonb,
  '[{"year":2023,"quarter":2,"total_holidays_weekly_off":1,"total_holidays_festival":1,"total_watering_days":1,"total_raining_days":1,"full_time_gardeners":1,"part_time_gardeners":1,"total_part_time_labour_days":1}]'::jsonb,
  '{"target_height_range":[{"year":0,"min":1,"max":1.5},{"year":1,"min":1.5,"max":2},{"year":2,"min":2,"max":2.5},{"year":3,"min":2.5,"max":3}],"actual_height_range":[{"year":2023,"quarter":2,"min":1,"max":1.5}]}'::jsonb,
  '[{"year":2023,"quarter":2,"reading_date":"2023-06-01","meter_image":"https://bethetreehugger-staging.objectstore.e2enetworks.net/bth_files/forest/1781294642269_0.png","meter_reading":0.1}]'::jsonb,
  '[{"year":2023,"quarter":2,"reading_date":"2023-06-01","inside_plantation":{"image":"https://bethetreehugger-staging.objectstore.e2enetworks.net/bth_files/forest/1781294696393_0.png","humidity":1,"temperature":0.5},"outside_plantation":{"image":"https://bethetreehugger-staging.objectstore.e2enetworks.net/bth_files/forest/1781294698913_0.png","humidity":1,"temperature":0.5}}]'::jsonb,
  '[{"heading":"Heading","description":"Description"}]'::jsonb,
  '{"description":"Security & Infrastructure Description","image_data":[{"name":"Security","description":"Security Description","image":"https://bethetreehugger-staging.objectstore.e2enetworks.net/bth_files/forest/1781294250450_0.png"}]}'::jsonb,
  '[{"year":2023,"quarter":2,"image":"https://bethetreehugger-staging.objectstore.e2enetworks.net/bth_files/forest/1781294439719_0.png"}]'::jsonb,
  '[{"type":{"label":"Initiated By","value":"initiated_by"},"name":"Arun Forest","logo":"https://bethetreehugger-staging.objectstore.e2enetworks.net/bth_files/forest/1781294003132_0.png"},{"type":{"label":"Sponsored By","value":"sponsored_by"},"name":"Arun Forest","logo":"https://bethetreehugger-staging.objectstore.e2enetworks.net/bth_files/forest/1781294027370_0.png"}]'::jsonb,
  '[{"name":"Dashboard Image 1","description":"Dashboard Image 1","image":"https://bethetreehugger-staging.objectstore.e2enetworks.net/bth_files/forest/1781294271079_0.png"}]'::jsonb,
  '[{"slide_type":"first_slide","image":"https://bethetreehugger-staging.objectstore.e2enetworks.net/bth_files/forest/1781294282059_0.png"},{"slide_type":"content_slide","image":"https://bethetreehugger-staging.objectstore.e2enetworks.net/bth_files/forest/1781294290630_0.png"},{"slide_type":"project_impact_slide","image":"https://bethetreehugger-staging.objectstore.e2enetworks.net/bth_files/forest/1781294298743_0.png"}]'::jsonb,
  TRUE, TRUE, 'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0', 'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0'
) ON CONFLICT (id) DO NOTHING;

-- ---- box from box_data[0] (prefix AA, start 1) ------------------------
INSERT INTO forest_boxes (
  id, forest_id, "row", "column", row_position, column_position,
  prefix, start, tree_to_tree_distance, is_active, created_by, updated_by
) VALUES (
  '7a11b0c0-0000-4000-8000-000000000001',
  '7a11d000-0000-4000-8000-000000000702',
  1, 1, 1, 1, 'AA', '1', 1, TRUE,
  'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0', 'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0'
) ON CONFLICT (id) DO NOTHING;

-- ---- the single generated tree AA1 (species 31 Mango, age 1082d) ------
INSERT INTO forest_trees (
  id, forest_id, box_id, master_plant_species_id, tree_unique_id,
  forest_tree_name, forest_tree_height, forest_tree_dia, forest_tree_age,
  forest_tree_oxygen, forest_tree_carbonoffset,
  forest_tree_geo_lat, forest_tree_geo_long, planted_on,
  tree_url, is_display, is_active, created_by, updated_by
) VALUES (
  '7a11c0e0-0000-4000-8000-000000000001',
  '7a11d000-0000-4000-8000-000000000702',
  '7a11b0c0-0000-4000-8000-000000000001',
  31, 'AA1', 'Mango', '4', '1', 1082,
  '243.45', '135.25',
  '12.891256', '80.081001', '2023-06-30',
  'https://bethetreehugger.co/tree/KISVAN63/AA1', TRUE, TRUE,
  'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0', 'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0'
) ON CONFLICT (id) DO NOTHING;

-- ---- join rows: sponsor + employee (site manager) ---------------------
INSERT INTO forest_sponsors (id, forest_id, sponsor_id, is_active, created_by, updated_by) VALUES
  ('7a11f50a-0000-4000-8000-000000000001',
   '7a11d000-0000-4000-8000-000000000702', 'f5786b29-cd96-40aa-abc4-3628cfd99f5e',
   TRUE, 'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0', 'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0')
ON CONFLICT (id) DO NOTHING;

INSERT INTO forests_employees (id, forest_id, employee_id, is_active, created_by, updated_by) VALUES
  ('7a11e30b-0000-4000-8000-000000000001',
   '7a11d000-0000-4000-8000-000000000702', 'db746f3b-646d-4929-a4ec-5561f389e83d',
   TRUE, 'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0', 'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0')
ON CONFLICT (id) DO NOTHING;

-- ---- user_role_forest_access: grant the seeded SuperAdmin role access to
-- Vandalur (resolves payload user_role_id placeholder 4c2d39cd-… to the real
-- SuperAdmin user_roles row 9e60326c-…). Also lets the sponsor-portal scoping
-- middleware be exercised against a real access row.
INSERT INTO user_role_forest_accesses (id, user_role_id, forest_id, is_active, created_by, updated_by) VALUES
  ('7a11a00e-0000-4000-8000-000000000001',
   '9e60326c-a111-4d87-afda-ef84c106786a', '7a11d000-0000-4000-8000-000000000702',
   TRUE, 'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0', 'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0')
ON CONFLICT (id) DO NOTHING;

-- ---- mirror the live forest_upsert_v1 job (status completed) ----------
INSERT INTO jobs (id, job_id, job_type, job_description, status, payload, result, created_by, updated_by) VALUES
  ('7a11b0b0-0000-4000-8000-000000000099'::uuid,
   'JOB_VANDALUR_SEED_0001', 'forest_upsert_v1',
   '{"forest_id":"KISVAN63 - Vandalur Forest","total_number_of_boxes":1,"total_number_of_trees":1}'::jsonb,
   'completed',
   '{"url":"/api/v1/forest/upsert","method":"POST"}'::jsonb,
   '{"success":true,"message":"Forest created successfully"}'::jsonb,
   'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0', 'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0')
ON CONFLICT (id) DO NOTHING;
