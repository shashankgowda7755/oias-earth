-- 015: redact vendor/person names (Kishore) from seeded LIVE data.
-- Seeds 002/004 use ON CONFLICT DO NOTHING, so editing them only affects fresh DBs;
-- this migration updates the rows that already exist. Idempotent (ILIKE-guarded),
-- safe to re-run every cold start. Pure data scrub, no schema change.

UPDATE sponsors SET
  sponsor_name = replace(sponsor_name, 'Kishore', 'Arun'),
  website_url  = replace(COALESCE(website_url, ''), 'kishore', 'arun')
WHERE sponsor_name ILIKE '%kishore%' OR website_url ILIKE '%kishore%';

UPDATE employees SET
  name          = replace(name, 'Kishore', 'Arun'),
  email_id      = replace(COALESCE(email_id, ''), 'kishore', 'arun'),
  profile_image = replace(COALESCE(profile_image, ''), 'kishore', 'arun')
WHERE name ILIKE '%kishore%' OR email_id ILIKE '%kishore%';

UPDATE forests SET
  land_ownership          = replace(land_ownership::text, 'Kishore', 'Arun')::jsonb,
  authorization_details   = replace(authorization_details::text, 'Kishore', 'Arun')::jsonb,
  additional_sponsor_logo = replace(additional_sponsor_logo::text, 'Kishore', 'Arun')::jsonb
WHERE land_ownership::text ILIKE '%kishore%'
   OR authorization_details::text ILIKE '%kishore%'
   OR additional_sponsor_logo::text ILIKE '%kishore%';
