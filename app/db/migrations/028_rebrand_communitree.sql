-- 028_rebrand_communitree.sql — rebrand display values "OIAS Earth" → COMMUNITREE.
-- Append-only + idempotent (re-runs every cold start). Applied migrations 002/018/023
-- are immutable history; this fixes the live DB values + the column default instead.

-- Global email sender display name (set in 023 with DEFAULT 'OIAS Earth').
UPDATE system_email_config SET display_name = 'COMMUNITREE' WHERE display_name = 'OIAS Earth';
ALTER TABLE system_email_config ALTER COLUMN display_name SET DEFAULT 'COMMUNITREE';

-- Seed admin profile carried the brand as its first name (002_seed).
UPDATE user_profiles SET first_name = 'COMMUNITREE' WHERE first_name = 'OIAS Earth';
