-- Per-quarter photo gallery for the report (one image per quarter).
-- Array of { year, quarter, image, caption? }. Distinct from report_images
-- (fixed slide slots) and dashboard_images (unused).
ALTER TABLE forests ADD COLUMN IF NOT EXISTS gallery_images jsonb;
