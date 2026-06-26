## ADDED Requirements

### Requirement: The report renders every sponsor with its own title

The report SHALL render the initiated-by logo plus EVERY sponsor entry in
`additional_sponsor_logo`, each captioned by its own title (`type.label`, e.g.
"Sponsored by", "Co-sponsor", "Knowledge partner"). It MUST NOT show only the
first sponsor. Entries without a logo image fall back to the sponsor name text.
The cover and thank-you slides MUST both reflect all entries and wrap gracefully
when there are many.

#### Scenario: Multiple sponsors with distinct titles

- **WHEN** a forest has an initiated-by entry and three sponsor entries with
  different titles
- **THEN** the cover and thank-you slides each show four logo cards, each with
  its own title

#### Scenario: Manage logos from the PFA app

- **WHEN** an admin adds a sponsor in the PFA "Sponsors & logos" editor and sets
  its title, name, and logo image
- **THEN** the entry is upserted on the forest and appears on the report; a
  deleted entry is removed

### Requirement: The report includes a per-quarter photo gallery

The report SHALL include a "Photo Gallery" section (a slide before Thank-You,
listed in the Contents) showing one photo per quarter from `gallery_images`,
each captioned with its quarter. The section MUST be empty-safe (placeholders
when no photos exist) and MUST NOT crash on missing data.

#### Scenario: Gallery shows one photo per quarter

- **WHEN** a forest has gallery photos for Q1 and Q2
- **THEN** the Photo Gallery slide shows both, each captioned "Q{n} {year}", and
  the Contents lists "Photo Gallery"

#### Scenario: Empty gallery

- **WHEN** a forest has no gallery photos
- **THEN** the Photo Gallery slide renders neutral placeholders without error
