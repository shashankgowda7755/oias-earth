-- 026_forest_tree_id_codes.sql
-- Store client_code + forest_code on the forests row so the Add/Edit wizard
-- can recover the prefix pattern (e.g. "TCS" + "VND" -> "TCS-VND-A-001").
ALTER TABLE forests
  ADD COLUMN IF NOT EXISTS client_code TEXT,
  ADD COLUMN IF NOT EXISTS forest_code TEXT;
