## ADDED Requirements

### Requirement: Quarterly weather is derived, not typed

The system SHALL derive a forest's weather for a fiscal quarter from the
forest's coordinates rather than requiring manual entry. Given a forest id, a
fiscal year, and a quarter (Q1=Apr–Jun, Q2=Jul–Sep, Q3=Oct–Dec, Q4=Jan–Mar of
the next calendar year), the server MUST return raining days, total rainfall,
dry-spell length, and outside temperature (avg/min/max) and humidity (avg) from
a no-key weather source (Open-Meteo) at the forest's lat/long. The query window
MUST be capped at five days before today to respect the archive's lag, and a
not-yet-started quarter MUST return an explicit "unavailable" result rather than
fabricated numbers.

#### Scenario: Auto-fill outside readings for a started quarter

- **WHEN** an admin requests weather for a forest with a valid lat/long and a
  quarter that has begun
- **THEN** the response contains raining_days, rainfall_mm, dry_spell_days,
  outside temperature (avg/min/max) and outside humidity (avg) for that quarter,
  and the report form fills `maintenance_workforce.total_raining_days` and
  `temperature_humidity.outside_plantation.{temperature,humidity}`

#### Scenario: On-site (inside) readings are never overwritten

- **WHEN** weather auto-fill runs for a quarter
- **THEN** only the OUTSIDE readings + raining days are written; the inside
  plantation temperature/humidity (the on-site differentiator) are left for a
  human to measure

#### Scenario: Forest without coordinates

- **WHEN** weather is requested for a forest that has no latitude/longitude
- **THEN** the request returns a 422 and no weather fields are changed
