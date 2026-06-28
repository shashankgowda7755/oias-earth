## MODIFIED Requirements

### Requirement: Quarterly weather can be persisted with estimated provenance

The system SHALL persist auto-filled weather (raining days + outside
temperature/humidity) into the report's (year, quarter) JSONB rows when requested,
stamping each written value with its provenance (`_source: 'open-meteo'`,
`_estimated: true`) so the renderer can show an "Estimated" label and the operator
can override it. On-site (inside) readings MUST never be written by this path. A
not-yet-started quarter MUST still return an "unavailable" result and persist
nothing.

#### Scenario: Persist outside readings for a started quarter

- **WHEN** an admin auto-fills weather with the write flag set for a forest with a
  valid lat/long and a quarter that has begun
- **THEN** `maintenance_workforce.total_raining_days` and
  `temperature_humidity.outside_plantation.{temperature,humidity}` are written for
  that quarter, each stamped estimated, and the inside readings are left untouched

#### Scenario: Estimated values are labelled and overridable

- **WHEN** a report renders a value that was auto-filled from weather
- **THEN** the value carries an "Estimated" label and the operator can replace it
  with a measured value, which clears the estimated flag
