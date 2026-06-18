# Capture Integrity Specification

## Purpose
Make fabrication detectable and demonstration data clearly labelled, so no
viewer mistakes simulated or recycled evidence for a verified record.

## Requirements

### Requirement: Photo de-duplication
The system SHALL hash every uploaded visit photo (SHA-256) and flag a recycled
photo as a duplicate.

#### Scenario: Recycled photo flagged
- WHEN a visit photo's hash matches a previously seen photo
- THEN the asset is marked `is_duplicate` and surfaced in the admin integrity queue

### Requirement: GPS plausibility
The system SHALL flag a visit whose GPS is implausibly far from the forest centre.

#### Scenario: Off-site capture flagged
- WHEN a visit's coordinates are more than 5 km from the forest centre
- THEN the visit is marked `geo_suspect` with the distance recorded

### Requirement: Demonstration data disclosure
The system SHALL flag demonstration/seeded forests and disclose simulated data on
public surfaces.

#### Scenario: Demo banner on proof page
- WHEN a tree belongs to a forest with `is_demo = true`
- THEN its life-record page shows a "demonstration / simulated" banner and avoids
  asserting field verification

#### Scenario: Imported legacy data labelled
- WHEN third-party data is imported (e.g. a legacy export)
- THEN the forest description records its provenance and that it is unverified
