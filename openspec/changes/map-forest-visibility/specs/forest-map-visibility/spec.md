## ADDED Requirements

### Requirement: Every forest is an individually visible pin
The system SHALL render every active forest that has a centre coordinate as an
individually visible, clickable map marker; forests that share identical
coordinates SHALL be spread so that none is hidden behind another.

#### Scenario: No active, located forest is dropped
- WHEN a forest is active and has a centre coordinate
- THEN it appears on the public map and on the admin map surfaces

#### Scenario: Overlapping forests fan out
- WHEN two or more forests share the same coordinate
- THEN their markers are offset on a small deterministic spiral so each is
  separately visible and clickable, while each popup still shows that forest's
  real (un-offset) data
