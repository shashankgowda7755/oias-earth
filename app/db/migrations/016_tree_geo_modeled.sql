-- 016_tree_geo_modeled — flag trees whose lat/lng is an INDICATIVE estimate
-- (e.g. back-projected from a 360 tap) rather than a surveyed field GPS fix.
-- Council-reviewed: modeled positions must be labelled at the DATA layer so the
-- flag survives CSV/API export and these points are never anchored on-chain.
-- Idempotent: the migrate runner re-applies every file on each run.

ALTER TABLE forest_trees
  ADD COLUMN IF NOT EXISTS geo_is_modeled BOOLEAN NOT NULL DEFAULT FALSE;
