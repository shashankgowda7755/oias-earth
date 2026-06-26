## ADDED Requirements

### Requirement: Forest coordinate validity guard
The system SHALL require a centre coordinate when a forest is created, and SHALL
reject invalid coordinates on any write that sets them, so a forest can never be
persisted in a state where it cannot appear on the map.

#### Scenario: Create without coordinates is rejected
- WHEN a forest is created without a latitude and longitude
- THEN the request fails with `400` and the forest is not created

#### Scenario: Garbage coordinates are rejected
- WHEN a write sets coordinates that are blank, `0/0`, `lat == lng`, or out of
  range (`|lat| > 90` or `|lng| > 180`)
- THEN the request fails with `400` and the coordinates are not saved
