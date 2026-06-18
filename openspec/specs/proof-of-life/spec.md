# Proof-of-Life Specification

## Purpose
Turn each tree into a longitudinal, public life record — not a day-zero
certificate — so anyone can verify it is still alive and growing.

## Requirements

### Requirement: Visit timeline
The system SHALL record dated visits per tree (status, height, diameter, age,
coordinates, optional photos) and expose the full timeline publicly.

#### Scenario: Logging a visit
- WHEN a planter logs a visit for a tree
- THEN a dated timeline row is appended and the tree's latest values update

#### Scenario: Public life record
- WHEN anyone opens `/tree/:id`
- THEN they see the survival verdict, growth chart, visit timeline and an
  estimated CO₂e, with no login

### Requirement: Survival verdict
The system SHALL derive survival from the latest status (status_id 4 = dead) and
display it honestly, including lost trees.

#### Scenario: Dead tree shown openly
- WHEN a tree's latest status is Dead
- THEN the page shows a "Lost" badge and freezes carbon stock at its last living value

### Requirement: Honest trust signals
The system SHALL only show a positive verification badge when the underlying
evidence exists.

#### Scenario: No false photo badge
- WHEN a tree has zero photos
- THEN the "Photos verified unique" badge is NOT shown as satisfied
