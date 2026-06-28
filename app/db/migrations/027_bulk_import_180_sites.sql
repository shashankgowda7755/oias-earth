-- 027_bulk_import_180_sites.sql
-- Auto-generated from Forest_Data_Complete_Consolidated_180_Sites.xlsx
-- 52 sponsors + 107 active forests

-- Add unique constraints (idempotent) so ON CONFLICT works
CREATE UNIQUE INDEX IF NOT EXISTS uq_sponsors_name ON sponsors (upper(trim(sponsor_name)));
CREATE UNIQUE INDEX IF NOT EXISTS uq_forests_internal_id ON forests (forest_internal_id) WHERE forest_internal_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_forest_sponsors ON forest_sponsors (forest_id, sponsor_id);

-- ============================================================
-- SPONSORS (52 unique clients)
-- ============================================================
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('Acuity', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('Apollo', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('Athena Health', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('Balmer & lawrie', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('Barclays', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('Bosch', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('CGI', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('Children Forest #3', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('Children Forest #4', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('Children Forest #5', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('Children Forest #6', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('Concern India', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('Connect for', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('Coronis', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('Decathlon', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('GBT', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('GenPact', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('HDFC', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('HDFC Bank Ltd - Chennai', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('HDFC Bank Ltd - Kovai', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('HDFC Bank Ltd - Madurai', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('HSBC', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('Honda', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('Honeywell', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('IDFC - Madurai', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('Inchcape', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('Infosys', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('JPMC - Bangalore', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('KVB', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('Kaleesuwari', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('Kenvue', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('L&T', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('Lenovo', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('Mira Tech', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('Myntra', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('PNB', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('Rotary', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('Rotary RCME', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('SMFG', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('SMFG Bangalore', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('SMFG Chennai', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('SMFG Hyderabad', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('SUZLON', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('Severn', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('Tata Elxi', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('Tata Elxsi', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('Team Everest', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('Temenos', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('United Way', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('Veolia', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('Visit.Org', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;
INSERT INTO sponsors (sponsor_name, is_active) VALUES ('Zura', TRUE) ON CONFLICT (upper(trim(sponsor_name))) DO NOTHING;

-- ============================================================
-- FORESTS (107 active sites)
-- ============================================================
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Severn – Sipcot,Orgadam', 'SEVCHE091', 'SEVCHE091',
  'Sipcot,Orgadam', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  10000, '2023-06-29', 3, 'Sipcot,Orgadam',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'SMFG Chennai – Lady willingdon college, Triplicane', 'SMFCHE092', 'SMFCHE092',
  'Lady willingdon college, Triplicane', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  700, '2023-07-01', 3, 'Lady willingdon college, Triplicane',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'SMFG Hyderabad – HafezPet, Railway Station, Hyderabad', 'SMFHYD093', 'SMFHYD093',
  'HafezPet, Railway Station, Hyderabad', 'Hyderabad', 'Telangana', 'India',
  NULL, NULL,
  1500, '2023-07-04', 3, 'HafezPet, Railway Station, Hyderabad',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'JPMC - Bangalore – Bangalore University', 'JPMBAN094', 'JPMBAN094',
  'Bangalore University', 'Bangalore', 'Karnataka', 'India',
  NULL, NULL,
  1000, '2023-07-12', 3, 'Bangalore University',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Veolia – Chakaravana, Bangalore University', 'VEOBAN095', 'VEOBAN095',
  'Chakaravana, Bangalore University', 'Bangalore', 'Karnataka', 'India',
  NULL, NULL,
  300, '2023-10-28', 3, 'Chakaravana, Bangalore University',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Children Forest #3 – Elcot , sholinganallur', 'CHICHE096', 'CHICHE096',
  'Elcot , sholinganallur', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  5000, '2023-11-18', 3, 'Elcot , sholinganallur',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'HDFC Bank Ltd - Chennai – Elcot , sholinganallur', 'HDFCHE097', 'HDFCHE097',
  'Elcot , sholinganallur', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  NULL, '2023-12-16', 3, 'Elcot , sholinganallur',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'HDFC Bank Ltd - Kovai – Elcot, Vilankurichi', 'HDFCHE098', 'HDFCHE098',
  'Elcot, Vilankurichi', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  45000, '2023-12-16', 3, 'Elcot, Vilankurichi',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'HDFC Bank Ltd - Madurai – ELcot, Vadapalanji', 'HDFCHE099', 'HDFCHE099',
  'ELcot, Vadapalanji', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  25000, '2023-12-16', 3, 'ELcot, Vadapalanji',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Temenos – Elcot , sholinganallur', 'TEMCHE100', 'TEMCHE100',
  'Elcot , sholinganallur', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  25000, '2024-02-17', 3, 'Elcot , sholinganallur',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'IDFC - Madurai – ELcot, Vadapalanji', 'IDFCHE101', 'IDFCHE101',
  'ELcot, Vadapalanji', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  25000, '2024-03-14', 3, 'ELcot, Vadapalanji',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'PNB – Elcot , sholinganallur', 'PNBCHE102', 'PNBCHE102',
  'Elcot , sholinganallur', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  1500, '2024-04-15', 3, 'Elcot , sholinganallur',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Rotary RCME – Kandigai', 'ROTCHE103', 'ROTCHE103',
  'Kandigai', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  30000, '2024-04-25', 3, 'Kandigai',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Rotary RCME – Chithalapakkam', 'ROTCHE104', 'ROTCHE104',
  'Chithalapakkam', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  6500, '2024-04-25', 3, 'Chithalapakkam',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'SMFG Chennai – University Of Madras', 'SMFCHE105', 'SMFCHE105',
  'University Of Madras', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  12000, '2024-07-13', 3, 'University Of Madras',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'SMFG Bangalore – Law college, Bangalore University', 'SMFBAN106', 'SMFBAN106',
  'Law college, Bangalore University', 'Bangalore', 'Karnataka', 'India',
  NULL, NULL,
  500, '2024-07-13', 3, 'Law college, Bangalore University',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'SMFG Hyderabad – Hafez Pet Railway Station', 'SMFHYD107', 'SMFHYD107',
  'Hafez Pet Railway Station', 'Hyderabad', 'Telangana', 'India',
  NULL, NULL,
  500, '2024-07-13', 3, 'Hafez Pet Railway Station',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'SUZLON – Devarkulam', 'SUZTIR108', 'SUZTIR108',
  'Devarkulam', 'Tirunelveli', 'Tamil Nadu', 'India',
  NULL, NULL,
  250, '2024-08-01', 3, 'Devarkulam',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'SUZLON – Gangaikondan', 'SUZTIR109', 'SUZTIR109',
  'Gangaikondan', 'Tirunelveli', 'Tamil Nadu', 'India',
  NULL, NULL,
  2000, '2024-08-01', 3, 'Gangaikondan',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'SUZLON – Radhapuram', 'SUZTIR110', 'SUZTIR110',
  'Radhapuram', 'Tirunelveli', 'Tamil Nadu', 'India',
  NULL, NULL,
  3570, '2024-08-01', 3, 'Radhapuram',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Miratech – Matrimony Site', 'MIRCHE111', 'MIRCHE111',
  'Matrimony Site', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  1000, '2024-09-16', 3, 'Matrimony Site',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'HSBC – Elcot', 'HSBCHE112', 'HSBCHE112',
  'Elcot', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  1000, '2024-09-21', 3, 'Elcot',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'HSBC – Bangalore University', 'HSBBAN113', 'HSBBAN113',
  'Bangalore University', 'Bangalore', 'Karnataka', 'India',
  NULL, NULL,
  NULL, '2024-09-21', 3, 'Bangalore University',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'HSBC – HafezPet, Railway Station, Hyderabad', 'HSBHYD114', 'HSBHYD114',
  'HafezPet, Railway Station, Hyderabad', 'Hyderabad', 'Telangana', 'India',
  NULL, NULL,
  NULL, '2024-09-21', 3, 'HafezPet, Railway Station, Hyderabad',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'HSBC – Gurgon', 'HSBGUR115', 'HSBGUR115',
  'Gurgon', 'Gurgaon', 'Gurugram', 'India',
  NULL, NULL,
  1000, '2024-09-21', 3, 'Gurgon',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'tata elxsi – Paranur', 'TATCHE116', 'TATCHE116',
  'Paranur', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  1000, '2024-10-05', 3, 'Paranur',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Children Forest #6 – Kolathur, Chennai', 'CHICHE117', 'CHICHE117',
  'Kolathur, Chennai', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  1000, '2024-11-16', 3, 'Kolathur, Chennai',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Children Forest #5 – ELCOT, Kovai', 'CHICHE118', 'CHICHE118',
  'ELCOT, Kovai', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  4000, '2024-11-16', 3, 'ELCOT, Kovai',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Children Forest #4 – Matrimony Site, Chennai', 'CHICHE119', 'CHICHE119',
  'Matrimony Site, Chennai', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  2000, '2024-12-07', 3, 'Matrimony Site, Chennai',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'HDFC – Tirunelveli', 'HDFTIR120', 'HDFTIR120',
  'Tirunelveli', 'Tirunelveli', 'Tamil Nadu', 'India',
  NULL, NULL,
  2000, '2024-12-12', 3, 'Tirunelveli',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'HDFC – Anjur Village', 'HDFCHE121', 'HDFCHE121',
  'Anjur Village', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  200, '2024-12-20', 3, 'Anjur Village',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Inchcape – Matrimony Site', 'INCCHE122', 'INCCHE122',
  'Matrimony Site', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  5000, '2025-01-04', 3, 'Matrimony Site',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Kaleesuwari – Elcot solingnallur', 'KALCHE123', 'KALCHE123',
  'Elcot solingnallur', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  5000, '2025-01-05', 3, 'Elcot solingnallur',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Honeywell – Kondamangalam', 'HONCHE124', 'HONCHE124',
  'Kondamangalam', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  5000, '2025-01-10', 3, 'Kondamangalam',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Rotary – Sitalapakkam Govt School', 'ROTCHE125', 'ROTCHE125',
  'Sitalapakkam Govt School', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  5000, '2025-12-02', 3, 'Sitalapakkam Govt School',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Rotary – Gurukulam Trust children school Kovalam', 'ROTCHE126', 'ROTCHE126',
  'Gurukulam Trust children school Kovalam', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  500, '2025-03-24', 3, 'Gurukulam Trust children school Kovalam',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Rotary – Hope foundation school kalpakkam', 'ROTCHE127', 'ROTCHE127',
  'Hope foundation school kalpakkam', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  NULL, '2025-03-24', 3, 'Hope foundation school kalpakkam',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Rotary – vilvarayanallur vkm high school', 'ROTTIR128', 'ROTTIR128',
  'vilvarayanallur vkm high school', 'Tirunelveli', 'Tamil Nadu', 'India',
  NULL, NULL,
  200, '2025-03-24', 3, 'vilvarayanallur vkm high school',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Rotary – gurkulam boys high school Mahuradhagam', 'ROTGUR129', 'ROTGUR129',
  'gurkulam boys high school Mahuradhagam', 'Tirunelveli', 'Tamil Nadu', 'India',
  NULL, NULL,
  250, '2025-03-24', 3, 'gurkulam boys high school Mahuradhagam',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Rotary – cheyyar aringnar anna govt arts college', 'ROTCHE130', 'ROTCHE130',
  'cheyyar aringnar anna govt arts college', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  1600, '2025-03-24', 3, 'cheyyar aringnar anna govt arts college',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'CGI – Chennai - 2.0 Park', 'CGICHE131', 'CGICHE131',
  'Chennai - 2.0 Park', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  NULL, '2025-05-31', 3, 'Chennai - 2.0 Park',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'CGI – Hyderabad - Risala Bazar', 'CGIHYD132', 'CGIHYD132',
  'Hyderabad - Risala Bazar', 'Hyderabad', 'Telangana', 'India',
  NULL, NULL,
  NULL, '2025-05-31', 3, 'Hyderabad - Risala Bazar',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'CGI – Pune - Krushnaji Khanduji Ghule Vidyalaya', 'CGIPUN133', 'CGIPUN133',
  'Pune - Krushnaji Khanduji Ghule Vidyalaya', 'Pune', 'Maharashtra', 'India',
  NULL, NULL,
  120, '2025-05-31', 3, 'Pune - Krushnaji Khanduji Ghule Vidyalaya',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'KVB – Madras University', 'KVBMAD134', 'KVBMAD134',
  'Madras University', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  5000, '2025-06-05', 3, 'Madras University',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Apollo – ELCOT', 'APOCHE135', 'APOCHE135',
  'ELCOT', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  30000, '2025-06-05', 3, 'ELCOT',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Zura – Elcot', 'ZURCHE136', 'ZURCHE136',
  'Elcot', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  30000, '2025-06-24', 3, 'Elcot',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'CGI – Mumbai - RA Colony', 'CGIMUM137', 'CGIMUM137',
  'Mumbai - RA Colony', 'Mumbai', 'Maharashtra', 'India',
  NULL, NULL,
  15, '2025-06-28', 3, 'Mumbai - RA Colony',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'CGi', 'CGI138', 'CGI138',
  NULL, 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  NULL, '2025-06-28', 3, NULL,
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Coronis – Elcot', 'CORCHE139', 'CORCHE139',
  'Elcot', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  1000, '2025-07-05', 3, 'Elcot',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Coronis – Hyderabad', 'CORHYD140', 'CORHYD140',
  'Hyderabad', 'Hyderabad', 'Telangana', 'India',
  NULL, NULL,
  NULL, '2025-07-05', 3, 'Hyderabad',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'SMFG – Victoria Hospital', 'SMFBAN141', 'SMFBAN141',
  'Victoria Hospital', 'Bangalore', 'Karnataka', 'India',
  NULL, NULL,
  1000, '2025-07-12', 3, 'Victoria Hospital',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Athena Health – Elcot, Chennai', 'ATHCHE142', 'ATHCHE142',
  'Elcot, Chennai', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  1000, '2025-07-06', 3, 'Elcot, Chennai',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Athena Health', 'ATH143', 'ATH143',
  NULL, 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  242, '2025-07-06', 3, NULL,
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Athena Health', 'ATH144', 'ATH144',
  NULL, 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  910, '2025-07-06', 3, NULL,
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Miratech', 'MIR145', 'MIR145',
  NULL, 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  242, '2025-07-23', 3, NULL,
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Barclays – Madras University', 'BARMAD146', 'BARMAD146',
  'Madras University', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  242, '2025-07-25', 3, 'Madras University',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'United Way – Elcot', 'UNICHE147', 'UNICHE147',
  'Elcot', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  242, '2025-07-29', 3, 'Elcot',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'United Way – Elcot', 'UNICHE148', 'UNICHE148',
  'Elcot', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  242, '2025-07-30', 3, 'Elcot',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Concern India – Pu College', 'CONPUC149', 'CONPUC149',
  'Pu College', 'Bangalore', 'Karnataka', 'India',
  NULL, NULL,
  242, '2025-08-01', 3, 'Pu College',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'United Way – Elcot', 'UNICHE150', 'UNICHE150',
  'Elcot', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  75, '2025-08-05', 3, 'Elcot',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'United Way – Elcot', 'UNICHE151', 'UNICHE151',
  'Elcot', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  100, '2025-08-06', 3, 'Elcot',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Myntra – Pu College', 'MYNPUC152', 'MYNPUC152',
  'Pu College', 'Bangalore', 'Karnataka', 'India',
  NULL, NULL,
  500, '2025-08-09', 3, 'Pu College',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Team Everest – Matrimony Park', 'TEACHE153', 'TEACHE153',
  'Matrimony Park', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  500, '2025-08-09', 3, 'Matrimony Park',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Visit.Org – Astronomy College', 'VISAST154', 'VISAST154',
  'Astronomy College', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  500, '2025-08-12', 3, 'Astronomy College',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Mira Tech – Devanahalli', 'MIRBAN155', 'MIRBAN155',
  'Devanahalli', 'Bangalore', 'Karnataka', 'India',
  NULL, NULL,
  200, '2025-08-23', 3, 'Devanahalli',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Team Everest – Matrimony Park', 'TEACHE156', 'TEACHE156',
  'Matrimony Park', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  10000, '2025-08-23', 3, 'Matrimony Park',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'CGI – Devanahalli', 'CGIBAN157', 'CGIBAN157',
  'Devanahalli', 'Bangalore', 'Karnataka', 'India',
  NULL, NULL,
  2000, '2025-08-23', 3, 'Devanahalli',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Visit.org – Madras University, Guindy', 'VISMAD158', 'VISMAD158',
  'Madras University, Guindy', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  300, '2025-08-30', 3, 'Madras University, Guindy',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Visit.org – Pu College', 'VISPUC159', 'VISPUC159',
  'Pu College', 'Bangalore', 'Karnataka', 'India',
  NULL, NULL,
  500, '2025-09-03', 3, 'Pu College',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Visit.org – Gurugram', 'VISGUR160', 'VISGUR160',
  'Gurugram', 'Gurugram', NULL, 'India',
  NULL, NULL,
  1000, '2025-09-05', 3, 'Gurugram',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Tata Elxi', 'TAT161', 'TAT161',
  NULL, 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  400, '2025-09-05', 3, NULL,
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Tata Elxsi – Kondamangalam', 'TATCHE162', 'TATCHE162',
  'Kondamangalam', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  100, '2025-09-06', 3, 'Kondamangalam',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Visit.org – Pu College', 'VISPUC163', 'VISPUC163',
  'Pu College', 'Bangalore', 'Karnataka', 'India',
  NULL, NULL,
  200, '2025-09-06', 3, 'Pu College',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Balmer & lawrie – Manali', 'BALMAN164', 'BALMAN164',
  'Manali', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  10000, '2025-09-09', 3, 'Manali',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Team Everest – K.R. Garden', 'TEAKRG165', 'TEAKRG165',
  'K.R. Garden', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  50, '2025-09-13', 3, 'K.R. Garden',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Tata Elxi – Kondamangalam', 'TATCHE166', 'TATCHE166',
  'Kondamangalam', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  50, '2025-09-13', 3, 'Kondamangalam',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Visit.org – Gurugram', 'VISGUR167', 'VISGUR167',
  'Gurugram', 'Gurugram', NULL, 'India',
  NULL, NULL,
  200, '2025-09-13', 3, 'Gurugram',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'CGI – KR Garden - Hyderabad', 'CGIHYD168', 'CGIHYD168',
  'KR Garden - Hyderabad', 'Hyderabad', 'Telangana', 'India',
  NULL, NULL,
  500, '2025-09-13', 3, 'KR Garden - Hyderabad',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Connect for – Pu College', 'CONPUC169', 'CONPUC169',
  'Pu College', 'Bangalore', 'Karnataka', 'India',
  NULL, NULL,
  200, '2025-09-17', 3, 'Pu College',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'GBT – Mauli', 'GBTMAU170', 'GBTMAU170',
  'Mauli', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  100, '2025-09-25', 3, 'Mauli',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Tata Elxi', 'TAT171', 'TAT171',
  NULL, 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  NULL, '2025-10-09', 3, NULL,
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Team Everest – Matrimony Park', 'TEACHE172', 'TEACHE172',
  'Matrimony Park', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  5000, '2025-10-11', 3, 'Matrimony Park',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Tata Elxi', 'TAT173', 'TAT173',
  NULL, 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  2000, '2025-10-17', 3, NULL,
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Team Everest – KR Garden', 'TEAHYD174', 'TEAHYD174',
  'KR Garden', 'Hyderabad', 'Telangana', 'India',
  NULL, NULL,
  5000, '2025-10-25', 3, 'KR Garden',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Bosch – Manur', 'BOSMAN175', 'BOSMAN175',
  'Manur', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  50, '2025-11-01', 3, 'Manur',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Tata Elxi', 'TAT176', 'TAT176',
  NULL, 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  NULL, '2025-11-13', 3, NULL,
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'L&T', 'LT177', 'LT177',
  NULL, 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  200, '2025-11-15', 3, NULL,
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Infosys – Vaiyapuri Park', 'INFVAI178', 'INFVAI178',
  'Vaiyapuri Park', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  100, '2025-11-17', 3, 'Vaiyapuri Park',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Visit.org – Govt School', 'VISGOV179', 'VISGOV179',
  'Govt School', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  NULL, '2025-11-26', 3, 'Govt School',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'GenPact', 'GEN180', 'GEN180',
  NULL, 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  1000, '2025-11-27', 3, NULL,
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Decathlon – Bangalore', 'DECBAN181', 'DECBAN181',
  'Bangalore', 'Bangalore', 'Karnataka', 'India',
  NULL, NULL,
  300, '2025-12-01', 3, 'Bangalore',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'CGI – Bangalore - Devanahalli', 'CGIBAN182', 'CGIBAN182',
  'Bangalore - Devanahalli', 'Bangalore', 'Karnataka', 'India',
  NULL, NULL,
  NULL, '2025-12-14', 3, 'Bangalore - Devanahalli',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'CGI – Chennai', 'CGICHE183', 'CGICHE183',
  'Chennai', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  NULL, '2026-01-24', 3, 'Chennai',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'CGI – Bangalore', 'CGIBAN184', 'CGIBAN184',
  'Bangalore', 'Bangalore', 'Karnataka', 'India',
  NULL, NULL,
  NULL, '2026-01-24', 3, 'Bangalore',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'CGI – Hyderabad', 'CGIHYD185', 'CGIHYD185',
  'Hyderabad', 'Hyderabad', 'Telangana', 'India',
  NULL, NULL,
  NULL, '2026-01-24', 3, 'Hyderabad',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'CGI – Pune', 'CGIPUN186', 'CGIPUN186',
  'Pune', 'Pune', 'Maharashtra', 'India',
  NULL, NULL,
  NULL, '2026-01-17', 3, 'Pune',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'CGI – Mumbai', 'CGIMUM187', 'CGIMUM187',
  'Mumbai', 'Mumbai', 'Maharashtra', 'India',
  NULL, NULL,
  NULL, '2026-01-24', 3, 'Mumbai',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Infosys – Trivandrum', 'INFTRI188', 'INFTRI188',
  'Trivandrum', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  NULL, '2025-12-20', 3, 'Trivandrum',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Temenos – Chennai', 'TEMCHE189', 'TEMCHE189',
  'Chennai', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  NULL, '2026-01-31', 3, 'Chennai',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Honda – Chennai', 'HONCHE190', 'HONCHE190',
  'Chennai', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  NULL, '2026-01-25', 3, 'Chennai',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'CGI – Chennai', 'CGICHE191', 'CGICHE191',
  'Chennai', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  NULL, '2026-03-14', 3, 'Chennai',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Kenvue – Bangalore', 'KENBAN192', 'KENBAN192',
  'Bangalore', 'Bangalore', 'Karnataka', 'India',
  NULL, NULL,
  NULL, '2026-01-28', 3, 'Bangalore',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Acuity – Bangalore', 'ACUBAN193', 'ACUBAN193',
  'Bangalore', 'Bangalore', 'Karnataka', 'India',
  NULL, NULL,
  NULL, '2026-03-17', 3, 'Bangalore',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Acuity – Gurugram', 'ACUGUR194', 'ACUGUR194',
  'Gurugram', 'Gurugram', NULL, 'India',
  NULL, NULL,
  NULL, '2026-03-30', 3, 'Gurugram',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Lenovo – Bangalore', 'LENBAN195', 'LENBAN195',
  'Bangalore', 'Bangalore', 'Karnataka', 'India',
  NULL, NULL,
  NULL, '2026-03-27', 3, 'Bangalore',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Honda – Mumbai', 'HONMUM196', 'HONMUM196',
  'Mumbai', 'Mumbai', 'Maharashtra', 'India',
  NULL, NULL,
  NULL, '2026-03-14', 3, 'Mumbai',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();
INSERT INTO forests (
  forest_name, forest_internal_id, forest_unique_id,
  forest_address, forest_city, forest_state, forest_country,
  forest_geo_lat, forest_geo_long,
  total_trees, plantation_date, project_period, project_site,
  irrigation_method, soil_type, is_active, is_updated
) VALUES (
  'Honda – Rajasthan', 'HONRAJ197', 'HONRAJ197',
  'Rajasthan', 'Chennai', 'Tamil Nadu', 'India',
  NULL, NULL,
  NULL, '2026-03-28', 3, 'Rajasthan',
  NULL, NULL,
  TRUE, FALSE
) ON CONFLICT (forest_internal_id) WHERE forest_internal_id IS NOT NULL DO UPDATE SET
  forest_name     = EXCLUDED.forest_name,
  forest_city     = EXCLUDED.forest_city,
  forest_state    = EXCLUDED.forest_state,
  forest_address  = EXCLUDED.forest_address,
  total_trees     = COALESCE(EXCLUDED.total_trees, forests.total_trees),
  plantation_date = COALESCE(EXCLUDED.plantation_date, forests.plantation_date),
  updated_at      = now();

-- ============================================================
-- FOREST ↔ SPONSOR LINKS
-- ============================================================
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Severn')
  WHERE f.forest_internal_id='SEVCHE091'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('SMFG Chennai')
  WHERE f.forest_internal_id='SMFCHE092'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('SMFG Hyderabad')
  WHERE f.forest_internal_id='SMFHYD093'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('JPMC - Bangalore')
  WHERE f.forest_internal_id='JPMBAN094'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Veolia')
  WHERE f.forest_internal_id='VEOBAN095'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Children Forest #3')
  WHERE f.forest_internal_id='CHICHE096'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('HDFC Bank Ltd - Chennai')
  WHERE f.forest_internal_id='HDFCHE097'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('HDFC Bank Ltd - Kovai')
  WHERE f.forest_internal_id='HDFCHE098'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('HDFC Bank Ltd - Madurai')
  WHERE f.forest_internal_id='HDFCHE099'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Temenos')
  WHERE f.forest_internal_id='TEMCHE100'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('IDFC - Madurai')
  WHERE f.forest_internal_id='IDFCHE101'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('PNB')
  WHERE f.forest_internal_id='PNBCHE102'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Rotary RCME')
  WHERE f.forest_internal_id='ROTCHE103'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Rotary RCME')
  WHERE f.forest_internal_id='ROTCHE104'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('SMFG Chennai')
  WHERE f.forest_internal_id='SMFCHE105'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('SMFG Bangalore')
  WHERE f.forest_internal_id='SMFBAN106'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('SMFG Hyderabad')
  WHERE f.forest_internal_id='SMFHYD107'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('SUZLON')
  WHERE f.forest_internal_id='SUZTIR108'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('SUZLON')
  WHERE f.forest_internal_id='SUZTIR109'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('SUZLON')
  WHERE f.forest_internal_id='SUZTIR110'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Mira Tech')
  WHERE f.forest_internal_id='MIRCHE111'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('HSBC')
  WHERE f.forest_internal_id='HSBCHE112'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('HSBC')
  WHERE f.forest_internal_id='HSBBAN113'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('HSBC')
  WHERE f.forest_internal_id='HSBHYD114'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('HSBC')
  WHERE f.forest_internal_id='HSBGUR115'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Tata Elxsi')
  WHERE f.forest_internal_id='TATCHE116'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Children Forest #6')
  WHERE f.forest_internal_id='CHICHE117'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Children Forest #5')
  WHERE f.forest_internal_id='CHICHE118'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Children Forest #4')
  WHERE f.forest_internal_id='CHICHE119'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('HDFC')
  WHERE f.forest_internal_id='HDFTIR120'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('HDFC')
  WHERE f.forest_internal_id='HDFCHE121'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Inchcape')
  WHERE f.forest_internal_id='INCCHE122'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Kaleesuwari')
  WHERE f.forest_internal_id='KALCHE123'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Honeywell')
  WHERE f.forest_internal_id='HONCHE124'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Rotary')
  WHERE f.forest_internal_id='ROTCHE125'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Rotary')
  WHERE f.forest_internal_id='ROTCHE126'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Rotary')
  WHERE f.forest_internal_id='ROTCHE127'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Rotary')
  WHERE f.forest_internal_id='ROTTIR128'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Rotary')
  WHERE f.forest_internal_id='ROTGUR129'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Rotary')
  WHERE f.forest_internal_id='ROTCHE130'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('CGI')
  WHERE f.forest_internal_id='CGICHE131'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('CGI')
  WHERE f.forest_internal_id='CGIHYD132'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('CGI')
  WHERE f.forest_internal_id='CGIPUN133'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('KVB')
  WHERE f.forest_internal_id='KVBMAD134'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Apollo')
  WHERE f.forest_internal_id='APOCHE135'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Zura')
  WHERE f.forest_internal_id='ZURCHE136'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('CGI')
  WHERE f.forest_internal_id='CGIMUM137'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('CGI')
  WHERE f.forest_internal_id='CGI138'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Coronis')
  WHERE f.forest_internal_id='CORCHE139'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Coronis')
  WHERE f.forest_internal_id='CORHYD140'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('SMFG')
  WHERE f.forest_internal_id='SMFBAN141'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Athena Health')
  WHERE f.forest_internal_id='ATHCHE142'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Athena Health')
  WHERE f.forest_internal_id='ATH143'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Athena Health')
  WHERE f.forest_internal_id='ATH144'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Mira Tech')
  WHERE f.forest_internal_id='MIR145'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Barclays')
  WHERE f.forest_internal_id='BARMAD146'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('United Way')
  WHERE f.forest_internal_id='UNICHE147'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('United Way')
  WHERE f.forest_internal_id='UNICHE148'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Concern India')
  WHERE f.forest_internal_id='CONPUC149'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('United Way')
  WHERE f.forest_internal_id='UNICHE150'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('United Way')
  WHERE f.forest_internal_id='UNICHE151'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Myntra')
  WHERE f.forest_internal_id='MYNPUC152'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Team Everest')
  WHERE f.forest_internal_id='TEACHE153'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Visit.Org')
  WHERE f.forest_internal_id='VISAST154'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Mira Tech')
  WHERE f.forest_internal_id='MIRBAN155'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Team Everest')
  WHERE f.forest_internal_id='TEACHE156'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('CGI')
  WHERE f.forest_internal_id='CGIBAN157'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Visit.Org')
  WHERE f.forest_internal_id='VISMAD158'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Visit.Org')
  WHERE f.forest_internal_id='VISPUC159'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Visit.Org')
  WHERE f.forest_internal_id='VISGUR160'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Tata Elxi')
  WHERE f.forest_internal_id='TAT161'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Tata Elxsi')
  WHERE f.forest_internal_id='TATCHE162'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Visit.Org')
  WHERE f.forest_internal_id='VISPUC163'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Balmer & lawrie')
  WHERE f.forest_internal_id='BALMAN164'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Team Everest')
  WHERE f.forest_internal_id='TEAKRG165'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Tata Elxi')
  WHERE f.forest_internal_id='TATCHE166'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Visit.Org')
  WHERE f.forest_internal_id='VISGUR167'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('CGI')
  WHERE f.forest_internal_id='CGIHYD168'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Connect for')
  WHERE f.forest_internal_id='CONPUC169'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('GBT')
  WHERE f.forest_internal_id='GBTMAU170'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Tata Elxi')
  WHERE f.forest_internal_id='TAT171'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Team Everest')
  WHERE f.forest_internal_id='TEACHE172'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Tata Elxi')
  WHERE f.forest_internal_id='TAT173'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Team Everest')
  WHERE f.forest_internal_id='TEAHYD174'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Bosch')
  WHERE f.forest_internal_id='BOSMAN175'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Tata Elxi')
  WHERE f.forest_internal_id='TAT176'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('L&T')
  WHERE f.forest_internal_id='LT177'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Infosys')
  WHERE f.forest_internal_id='INFVAI178'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Visit.Org')
  WHERE f.forest_internal_id='VISGOV179'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('GenPact')
  WHERE f.forest_internal_id='GEN180'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Decathlon')
  WHERE f.forest_internal_id='DECBAN181'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('CGI')
  WHERE f.forest_internal_id='CGIBAN182'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('CGI')
  WHERE f.forest_internal_id='CGICHE183'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('CGI')
  WHERE f.forest_internal_id='CGIBAN184'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('CGI')
  WHERE f.forest_internal_id='CGIHYD185'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('CGI')
  WHERE f.forest_internal_id='CGIPUN186'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('CGI')
  WHERE f.forest_internal_id='CGIMUM187'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Infosys')
  WHERE f.forest_internal_id='INFTRI188'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Temenos')
  WHERE f.forest_internal_id='TEMCHE189'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Honda')
  WHERE f.forest_internal_id='HONCHE190'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('CGI')
  WHERE f.forest_internal_id='CGICHE191'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Kenvue')
  WHERE f.forest_internal_id='KENBAN192'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Acuity')
  WHERE f.forest_internal_id='ACUBAN193'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Acuity')
  WHERE f.forest_internal_id='ACUGUR194'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Lenovo')
  WHERE f.forest_internal_id='LENBAN195'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Honda')
  WHERE f.forest_internal_id='HONMUM196'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;
INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active)
  SELECT f.id, s.id, TRUE FROM forests f JOIN sponsors s ON upper(trim(s.sponsor_name))=upper('Honda')
  WHERE f.forest_internal_id='HONRAJ197'
  ON CONFLICT (forest_id, sponsor_id) DO NOTHING;