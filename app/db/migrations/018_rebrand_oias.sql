-- 018_rebrand_oias — rebrand "Be The Tree Hugger" → "OIAS Earth".
-- Rewrites any stored tree certificate URL on the retired domain to the new one
-- so existing trees point at the live brand. Idempotent (runner re-applies).

UPDATE forest_trees
   SET tree_url = replace(tree_url, 'bethetreehugger.co', 'oiasearth.com')
 WHERE tree_url LIKE '%bethetreehugger.co%';
