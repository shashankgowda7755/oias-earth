## ADDED Requirements

### Requirement: Report photos are uploaded to durable object storage

The system SHALL store report photos in durable object storage (Vercel Blob, or
Supabase when configured) and return a public URL — never rely on the ephemeral
local `/uploads` path in production. An authenticated upload to a named slot MUST
attach the resulting URL to the correct field on the forest. Per-quarter slots
(soil meter, inside, outside, progress, gallery) MUST be keyed by year + quarter.

#### Scenario: Upload a photo to a slot

- **WHEN** an admin POSTs a photo to `/forest/:id/report-image` with a valid slot
- **THEN** the file is written to object storage, a public URL is returned (HTTP
  200), and the URL is attached to the matching report field (e.g. `cover` →
  `report_images[first_slide].image`, `soil_meter` →
  `soil_ph_level[year,quarter].meter_image`)

#### Scenario: Storage not configured

- **WHEN** no storage backend is configured and an upload is attempted
- **THEN** the endpoint returns 503 with a clear message, and the rest of the
  app is unaffected (the report still renders placeholders)

### Requirement: Field staff capture photos from a mobile app

The system SHALL provide a mobile-first admin page (`/pfa`) where a user selects
a forest, sees the report's photo slots grouped into "Site (once)" and "This
quarter", and fills each by taking a photo with the device camera or choosing a
file. Progress MUST reflect already-present photos, and every action MUST be
reachable on a phone (large tap targets, sticky controls).

#### Scenario: Capture and attach a photo on a phone

- **WHEN** a user picks a forest, taps a slot, takes a photo, and confirms upload
- **THEN** the photo uploads, the tile shows it as done, the progress count
  increases, and opening the report shows the photo in that slot

#### Scenario: Existing photos are reflected

- **WHEN** a forest that already has some report photos is selected
- **THEN** those slots show as filled and the progress count includes them
