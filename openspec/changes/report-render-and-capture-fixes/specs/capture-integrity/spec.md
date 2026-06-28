## ADDED Requirements

### Requirement: Numeric field measurements are validated at capture

The system SHALL treat the field-visit height and diameter as numbers and SHALL
reject a non-empty value that is not a finite number at capture time, with operator
feedback, rather than transmitting it to be silently coerced to null. A blank
measurement remains optional; only a present-but-invalid value is blocked.

#### Scenario: Non-numeric measurement blocked before save

- **WHEN** a planter enters a non-numeric height or diameter (e.g. `2..4`) and taps
  Save
- **THEN** the save is aborted and a message identifies the offending field, so no
  visit is logged with the measurement silently dropped

#### Scenario: Valid measurement submitted as a number

- **WHEN** a planter enters a finite decimal height or diameter and saves
- **THEN** the value is submitted as a parsed number and recorded on the visit

#### Scenario: Queued offline measurement coerced on replay

- **WHEN** a queued offline visit is replayed after reconnecting
- **THEN** its stored height/diameter are coerced to finite numbers and only finite
  values are sent, matching the online path
