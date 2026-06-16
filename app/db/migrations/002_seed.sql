-- =====================================================================
-- 002_seed.sql  —  demo data for the CommuniTREE admin rebuild
-- =====================================================================
-- Idempotent where practical (ON CONFLICT DO NOTHING / guarded inserts) so it
-- can be re-run safely during local dev.
--
-- The sample admin user `communitree_admin` has a bcrypt hash for the password
-- "communitree123" (10 rounds). Generated with bcryptjs; replace for any
-- non-local use. NOTE: hash committed here is a LOCAL DEV DEFAULT only.
-- =====================================================================

-- ---- master_roles ---------------------------------------------------
-- Observed live: roleId 3 == "SuperAdmin", roles/list sample id 1 == "Admin".
-- Seed both with those ids so the contract matches.
INSERT INTO master_roles (id, name, is_active) VALUES
  (1, 'Admin', TRUE),
  (3, 'SuperAdmin', TRUE)
ON CONFLICT (id) DO NOTHING;
-- keep the SERIAL sequence ahead of the explicit ids we inserted
SELECT setval(pg_get_serial_sequence('master_roles','id'),
              GREATEST((SELECT MAX(id) FROM master_roles), 1));

-- ---- admin user (profile + role) ------------------------------------
-- Fixed UUIDs so other seed rows can reference created_by deterministically.
INSERT INTO user_profiles (
  id, first_name, last_name, email_id, mobile_no, mobile_country_code,
  user_id, username, password_hash, is_active, is_verified, image_url
) VALUES (
  'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0',
  'CommuniTREE', 'Admin', 'admin@communitree.co.in', 8925834149, '+91',
  1, 'communitree_admin',
  -- bcrypt hash of "communitree123"
  '$2a$10$ceAYDt3bwrQBCOTepXLqseNPHQnJ59S7J1blahNXbx0zYB5iM9FF6',
  TRUE, TRUE, NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_roles (id, profile_id, role_id, is_active, created_by, updated_by)
VALUES (
  '9e60326c-a111-4d87-afda-ef84c106786a',
  'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0',
  3, TRUE,
  'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0',
  'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0'
)
ON CONFLICT (id) DO NOTHING;

-- A second (plain Admin) user to exercise role display / pagination.
INSERT INTO user_profiles (
  id, first_name, last_name, email_id, mobile_no, mobile_country_code,
  username, password_hash, is_active, is_verified
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Anvar', 'Raja', 'anvar@communitree.co.in', 9876543210, '+91',
  'anvar_communitree_admin',
  '$2a$10$ceAYDt3bwrQBCOTepXLqseNPHQnJ59S7J1blahNXbx0zYB5iM9FF6',
  TRUE, TRUE
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_roles (id, profile_id, role_id, is_active, created_by, updated_by)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  1, TRUE,
  'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0',
  'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0'
)
ON CONFLICT (id) DO NOTHING;

-- ---- lookup tables --------------------------------------------------
INSERT INTO tree_status_master (id, status) VALUES
  (1, 'Healthy'), (2, 'Drying'), (3, 'Damaged'), (4, 'Dead')
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('tree_status_master','id'),
              GREATEST((SELECT MAX(id) FROM tree_status_master), 1));

INSERT INTO master_planting_reasons (id, reason) VALUES
  (1, 'Afforestation'), (2, 'CSR Initiative'), (3, 'Memorial')
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('master_planting_reasons','id'),
              GREATEST((SELECT MAX(id) FROM master_planting_reasons), 1));

INSERT INTO planters (id, name, mobile_no) VALUES
  (1, 'Field Team A', 9000000001), (2, 'Field Team B', 9000000002)
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('planters','id'),
              GREATEST((SELECT MAX(id) FROM planters), 1));

INSERT INTO master_plantspecies
  (id, species_category, species_name, common_name, oxygen_per_day, carbon_offset_per_day, rate, is_fruit_bearing)
VALUES
  (31, 'Tree', 'Mangifera Indica', 'Mango', 0.95, 0.52, 120, TRUE),
  (32, 'Tree', 'Azadirachta Indica', 'Neem', 0.88, 0.49, 90, FALSE),
  (33, 'Tree', 'Ficus Religiosa', 'Peepal', 1.10, 0.60, 80, FALSE),
  (34, 'Tree', 'Tectona Grandis', 'Teak', 0.70, 0.45, 150, FALSE)
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('master_plantspecies','id'),
              GREATEST((SELECT MAX(id) FROM master_plantspecies), 1));

-- ---- sponsors -------------------------------------------------------
INSERT INTO sponsors (
  id, sponsor_name, sponsor_logo, sponsor_forest_logo, sponsor_tree_logo,
  sponsor_og_image_url, established_year, website_url, industry, headquarters,
  is_active, created_by, updated_by
) VALUES
  (
    '64904581-84c8-440c-a313-b14b167f480b', 'Acuity',
    'https://example.com/sponsors/acuity_logo.jpeg',
    'https://example.com/sponsors/acuity_forest_logo.jpeg',
    'https://example.com/sponsors/acuity_tree_logo.jpeg',
    'https://example.com/sponsors/acuity_og.jpeg',
    '2010', 'https://www.acuityanalytics.com/', 'Analytics', 'Bengaluru',
    TRUE, 'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0', 'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0'
  ),
  (
    'eaadc2ee-f4d3-49be-8892-e52bdfdaa64b', 'IDFC First Bank',
    'https://www.idfcfirstbank.com/IDFC-logo-website.svg',
    'https://example.com/Idfc-logo.png',
    'https://example.com/Idfc-logo.png',
    'https://example.com/Bethetreehugger-IDFC.png',
    '2015', 'https://www.idfcfirstbank.com/', 'Banking', 'Mumbai',
    TRUE, 'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0', 'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0'
  )
ON CONFLICT (id) DO NOTHING;

-- ---- employees ------------------------------------------------------
INSERT INTO employees (
  id, name, profile_image, designation, contact_no, email_id,
  is_active, created_by, updated_by
) VALUES
  (
    '0ed53c6f-24d1-4235-b761-ff47e298cb60', 'Anvar Raja M',
    'https://example.com/employee/anvar.jpg',
    'Operations Executive - Forest', '8925834149', 'anvar@communitree.co.in',
    TRUE, 'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0', 'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0'
  ),
  (
    'db746f3b-646d-4929-a4ec-5561f389e83d', 'Kishore Kumar',
    'https://example.com/employee/kishore.jpg',
    'Site Manager', '9876543211', 'kishore@communitree.co.in',
    TRUE, 'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0', 'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0'
  )
ON CONFLICT (id) DO NOTHING;

-- ---- forests --------------------------------------------------------
INSERT INTO forests (
  id, forest_name, forest_geo_lat, forest_geo_long, forest_oxygen,
  forest_carbonoffset, forest_address, forest_city, forest_state, forest_country,
  forest_unique_id, forest_internal_id, total_trees, average_age,
  total_species_planted, box_rows, box_column, tree_row, tree_column,
  project_period, plantation_date, is_updated, is_active, created_by, updated_by
) VALUES
  (
    '55ec5786-c1d1-4f72-a403-5b1a9d8e4d34', 'IDFC First Bank',
    '9.934781', '78.000977', 2069100.00, 1149500.00,
    E'Vadapalanji IT Park\nNagamalaipudukottai, Tamil Nadu 625021\nIndia',
    'Madurai', 'Tamil Nadu', 'India',
    'IDFIDF62', '101', 11000, 837, 1, 1, 1, 100, 300,
    3, '2024-03-01', TRUE, TRUE,
    'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0', 'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0'
  ),
  (
    '25b16c3c-595e-4c53-83e9-e5b3b3b9d869', 'Temenos',
    '12.971599', '77.594566', 980000.00, 540000.00,
    'Bengaluru Tech Park, Karnataka 560001, India',
    'Bengaluru', 'Karnataka', 'India',
    'TEMTEM58', '102', 5000, 600, 2, 1, 1, 50, 100,
    3, '2024-01-31', FALSE, TRUE,
    'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0', 'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0'
  )
ON CONFLICT (id) DO NOTHING;

-- forest <-> sponsor links
INSERT INTO forest_sponsors (id, forest_id, sponsor_id, is_active, created_by, updated_by) VALUES
  ('aaaa1111-0000-0000-0000-000000000001',
   '55ec5786-c1d1-4f72-a403-5b1a9d8e4d34', 'eaadc2ee-f4d3-49be-8892-e52bdfdaa64b',
   TRUE, 'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0', 'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0'),
  ('aaaa1111-0000-0000-0000-000000000002',
   '25b16c3c-595e-4c53-83e9-e5b3b3b9d869', '64904581-84c8-440c-a313-b14b167f480b',
   TRUE, 'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0', 'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0')
ON CONFLICT (id) DO NOTHING;

-- forest <-> employee (site managers)
INSERT INTO forests_employees (id, forest_id, employee_id, is_active, created_by, updated_by) VALUES
  ('bbbb2222-0000-0000-0000-000000000001',
   '55ec5786-c1d1-4f72-a403-5b1a9d8e4d34', '0ed53c6f-24d1-4235-b761-ff47e298cb60',
   TRUE, 'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0', 'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0'),
  ('bbbb2222-0000-0000-0000-000000000002',
   '25b16c3c-595e-4c53-83e9-e5b3b3b9d869', 'db746f3b-646d-4929-a4ec-5561f389e83d',
   TRUE, 'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0', 'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0')
ON CONFLICT (id) DO NOTHING;

-- ---- reports --------------------------------------------------------
INSERT INTO reports (
  id, year, quarter, report_date, plantation_date, start_date, end_date,
  mode, type, version, project_period, forest_id, skip, is_active,
  created_by, updated_by
) VALUES
  (
    '0f602c89-bbd0-4d5d-a039-bf4d5068070e', 2026, 2,
    '2026-06-09T00:00:00.000Z', '2026-01-31T00:00:00.000Z',
    '2026-04-01T00:00:00.000Z', '2026-06-30T00:00:00.000Z',
    'automatic', 'quarterly', 1, 3,
    '25b16c3c-595e-4c53-83e9-e5b3b3b9d869', '[]'::jsonb, TRUE,
    'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0', 'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0'
  ),
  (
    '1a702d90-ccd1-4e6e-b140-cf6179691f1f', 2026, 1,
    '2026-03-10T00:00:00.000Z', '2024-03-01T00:00:00.000Z',
    '2026-01-01T00:00:00.000Z', '2026-03-31T00:00:00.000Z',
    'manual', 'quarterly', 1, 3,
    '55ec5786-c1d1-4f72-a403-5b1a9d8e4d34', '[]'::jsonb, TRUE,
    'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0', 'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO forests_reports (id, forest_id, report_id, is_active, created_by, updated_by) VALUES
  ('cccc3333-0000-0000-0000-000000000001',
   '25b16c3c-595e-4c53-83e9-e5b3b3b9d869', '0f602c89-bbd0-4d5d-a039-bf4d5068070e',
   TRUE, 'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0', 'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0'),
  ('cccc3333-0000-0000-0000-000000000002',
   '55ec5786-c1d1-4f72-a403-5b1a9d8e4d34', '1a702d90-ccd1-4e6e-b140-cf6179691f1f',
   TRUE, 'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0', 'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0')
ON CONFLICT (id) DO NOTHING;

-- ---- jobs -----------------------------------------------------------
INSERT INTO jobs (
  id, job_id, job_type, job_description, status, payload, result,
  created_by, updated_by
) VALUES
  (
    '5a20e581-7da3-4c0e-a143-f3ba1192d68c',
    'JOB_20260612202031770_6NMSZSC6', 'forest_upsert_v1',
    '{"forest_id":"KISVAN63 - Vandalur Forest","total_number_of_boxes":1,"total_number_of_trees":1}'::jsonb,
    'completed',
    '{"url":"http://localhost:4000/api/v1/forest/create","method":"POST"}'::jsonb,
    '{"success":true,"message":"Forest created successfully"}'::jsonb,
    'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0', 'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0'
  ),
  (
    '6b31f692-8eb4-5d1f-b254-04cb22a37e9d',
    'JOB_20260613090000000_AB12CD34', 'report_generation_v1',
    '{"report_id":"0f602c89","forest":"Temenos"}'::jsonb,
    'pending',
    '{"url":"http://localhost:4000/api/v1/reports/generate","method":"POST"}'::jsonb,
    NULL,
    'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0', 'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0'
  )
ON CONFLICT (id) DO NOTHING;
