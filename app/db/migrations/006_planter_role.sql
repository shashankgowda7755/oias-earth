-- =====================================================================
-- 006_planter_role.sql
-- Field-worker (Planter) role + a demo planter scoped to Vandalur, for the
-- offline-first field-capture PWA (/field).
--
-- A Planter is like an Admin but field-only: scoped to assigned forests via
-- user_role_forest_accesses, used by the /field app to capture GPS + photo +
-- visits. assertForestAccess() (routes/forest.ts) treats Planter like Admin.
--
-- Demo login: field_planter / FieldTree2026   (rotate in production).
-- Idempotent (explicit ids + ON CONFLICT DO NOTHING).
-- =====================================================================

INSERT INTO master_roles (id, name, is_active) VALUES
  (4, 'Planter', TRUE)
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('master_roles','id'),
              GREATEST((SELECT MAX(id) FROM master_roles), 4));

-- Demo planter profile (bcrypt hash of "FieldTree2026").
INSERT INTO user_profiles (
  id, first_name, last_name, email_id, mobile_no, mobile_country_code,
  user_id, username, password_hash, is_active, is_verified, image_url
) VALUES (
  'a1a47e00-0000-4000-8000-000000000001',
  'Field', 'Planter', 'planter@communitree.co.in', 9000000001, '+91',
  4, 'field_planter',
  '$2a$10$xB20IY9iBgeiINRXANf3Ee7n8dvLYEZn26FN8G4OAWWt3FhtdKRWC',
  TRUE, TRUE, NULL
) ON CONFLICT (id) DO NOTHING;

-- Planter role row.
INSERT INTO user_roles (id, profile_id, role_id, is_active, created_by, updated_by)
VALUES (
  'a1a47e01-0000-4000-8000-000000000001',
  'a1a47e00-0000-4000-8000-000000000001',
  4, TRUE,
  'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0',
  'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0'
) ON CONFLICT (id) DO NOTHING;

-- Scope this planter to the Vandalur forest.
INSERT INTO user_role_forest_accesses (id, user_role_id, forest_id, is_active, created_by, updated_by)
VALUES (
  'a1a47e02-0000-4000-8000-000000000001',
  'a1a47e01-0000-4000-8000-000000000001',
  '7a11d000-0000-4000-8000-000000000702',
  TRUE,
  'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0',
  'd21cabf2-c06c-4c1e-a9ea-d1ea928727d0'
) ON CONFLICT (id) DO NOTHING;
