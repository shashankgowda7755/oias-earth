-- Recipient mapping for report sending.
-- sponsor_email: the sponsor's contact email (primary send target).
-- forest_contact_email: per-forest fallback when the sponsor has no email.
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS sponsor_email text;
ALTER TABLE forests  ADD COLUMN IF NOT EXISTS forest_contact_email text;
