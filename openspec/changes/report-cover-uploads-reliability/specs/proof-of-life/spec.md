## ADDED Requirements

### Requirement: The quarterly report surfaces every entered forest field

The rendered quarterly report SHALL display the data a user entered for the
forest, not placeholders. Specifically it MUST show: the assigned site
supervisor (from the forest's employee), the sponsor name and logo, the forest
description, the project site, the forest business ID (`forest_unique_id`), the
per-box species breakdown, and dashboard images. When the rich sponsor-logo
block is empty, the sponsor SHALL fall back to the forest's linked sponsor.

#### Scenario: Supervisor and sponsor render from the data

- **WHEN** a forest has an assigned employee and a linked sponsor (no
  `additional_sponsor_logo`)
- **THEN** the report shows the employee's name as the supervisor and the linked
  sponsor's name in the "Sponsored by" card (not `—`)

#### Scenario: Per-box planting layout appears

- **WHEN** a forest has boxes with species
- **THEN** the Site Master Plan shows a box-wise species breakdown

### Requirement: Missing photos render a default image, not an empty box

Any report photo region whose source is missing or fails to load SHALL render a
clear default placeholder image (a non-photographic graphic), never a bare empty
panel. A broken/expired image URL SHALL fall back to the same placeholder.

#### Scenario: Empty photo slot

- **WHEN** a report slide has no image for a slot
- **THEN** the slot shows the default placeholder graphic in the same space a
  photo would occupy

### Requirement: The cover leads with the forest name and description

The cover SHALL NOT display the client/sponsor name as a heading (the sponsor
appears only in the "Sponsored by" card). The forest name SHALL be the larger
title and the description SHALL render at roughly 70% of the name's size; both
SHALL auto-fit to their length so neither overflows the cover.

#### Scenario: Long description does not overflow

- **WHEN** a forest description is long
- **THEN** the title text auto-shrinks so the cover stays within its bounds, with
  the forest name still larger than the description
