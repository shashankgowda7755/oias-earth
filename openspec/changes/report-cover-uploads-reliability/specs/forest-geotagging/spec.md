## ADDED Requirements

### Requirement: Editing a forest hydrates the full record

Opening a forest for edit SHALL load the full record via `GET /forest/:id`
(every scalar + jsonb column, joined sponsors/employees, and a reconstructed
`box_data`) and prefill the form from it, so no field opens blank and validation
passes. The wizard payload SHALL match the server contract (`box_data` with
`column` + `species_data`, `employee_id`, `user_role_id`).

#### Scenario: Open an existing forest for edit

- **WHEN** an admin clicks Edit on a forest
- **THEN** the form is prefilled with the forest's saved values (name, location,
  sponsors, manager, grid), not blank

### Requirement: Forest update is non-destructive

A forest upsert UPDATE SHALL rebuild a child section (boxes/trees, sponsors,
employees) ONLY when that section is supplied in the payload. Omitting a section
MUST leave the existing rows and cached totals intact — editing basic info MUST
NOT delete forest_trees or their living-proof timelines.

#### Scenario: Edit basic info only

- **WHEN** an admin changes a forest's name and saves (no grid in the payload)
- **THEN** the forest's trees, totals, and sponsors are unchanged

### Requirement: Uploaded media is stored durably

Sponsor, employee, and user image uploads SHALL be written to durable object
storage (Supabase/Vercel Blob) when a backend is configured, persisting the
durable URL — not the ephemeral local `/uploads` path that is wiped on redeploy.
When no backend is configured the upload SHALL fall back to the local URL.

#### Scenario: Upload a sponsor logo in production

- **WHEN** an admin uploads a sponsor logo and storage is configured
- **THEN** the stored URL points at durable storage and survives a redeploy
