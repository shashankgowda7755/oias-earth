-- =====================================================================
-- 005_seed_tree_timeline.sql
-- Longitudinal proof-of-life demo data for the OIAS Earth dMRV moat.
--
-- forest_plant_timelines is the per-tree VISIT LOG (already in the schema,
-- previously unused). Each row = one revisit: date, status, height, diameter,
-- age, coordinates. forest_plant_timeline_assets holds the photo(s) per visit.
--
-- We seed the Vandalur "AA1" Mango (tree 7a11c0e0-…001) with four visits across
-- two years so the public /tree/:id page shows a real growth timeline, not a
-- day-zero snapshot. Idempotent (explicit ids + ON CONFLICT DO NOTHING).
--
-- NOTE: sample photos are Unsplash tree images for demonstration; replace with
-- real field captures via the admin "Log visit" flow.
-- =====================================================================

INSERT INTO forest_plant_timelines
  (id, plant_id, species_id, status_id, height, diameter, age, latitude, longitude, timeline_date)
VALUES
  (5001, '7a11c0e0-0000-4000-8000-000000000001', 31, 1, 0.60, 1.0,   0, '12.891256', '80.081001', '2023-06-30'),
  (5002, '7a11c0e0-0000-4000-8000-000000000001', 31, 1, 1.10, 2.0,  92, '12.891256', '80.081001', '2023-09-30'),
  (5003, '7a11c0e0-0000-4000-8000-000000000001', 31, 1, 2.40, 4.0, 366, '12.891256', '80.081001', '2024-06-30'),
  (5004, '7a11c0e0-0000-4000-8000-000000000001', 31, 1, 4.00, 6.5, 731, '12.891256', '80.081001', '2025-06-30')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('forest_plant_timelines','id'),
              GREATEST((SELECT MAX(id) FROM forest_plant_timelines), 5004));

INSERT INTO forest_plant_timeline_assets (id, timeline_id, type, url, "order")
VALUES
  (5001, 5001, 'image', 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=900&q=70', 0),
  (5002, 5002, 'image', 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=900&q=70', 0),
  (5003, 5003, 'image', 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=900&q=70', 0),
  (5004, 5004, 'image', 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=900&q=70', 0)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('forest_plant_timeline_assets','id'),
              GREATEST((SELECT MAX(id) FROM forest_plant_timeline_assets), 5004));
