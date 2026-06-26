## ADDED Requirements

### Requirement: Report slides are empty-safe and never show misleading zeros

The report SHALL render a dash ("—") instead of a zero/sentinel for readings
that cannot be zero in a real plantation: soil pH, temperature, and humidity
values that are ≤ 0 (or non-finite) MUST display as "—", and the temperature
"difference" block MUST be hidden when either side is missing. Empty or broken
images MUST fall back to a neutral placeholder, never a misleading stock photo.

#### Scenario: Unset soil/temperature readings

- **WHEN** a forest's soil pH, inside/outside temperature, or humidity for the
  quarter is 0 or unset
- **THEN** those values render as "—" and the temperature-difference block is not
  shown (no "0.0°c" / "0 RH")

#### Scenario: Broken or missing image

- **WHEN** an image field is empty or its URL fails to load
- **THEN** a neutral placeholder is shown (no broken-image artifact, no
  unrelated stock photo)

### Requirement: Computed totals match actual data

The Site-Master-Plan total SHALL equal the actual planted sapling count (the sum
of per-box species counts), not a projected grid capacity, and expected-growth
height ranges SHALL be clamped to plausible values so a data-entry typo cannot
render an absurd height.

#### Scenario: Site-Master-Plan total

- **WHEN** a forest has 700 actual saplings but a larger grid capacity
- **THEN** the Site-Master-Plan slide shows 700, consistent with the cover

#### Scenario: Growth range with a typo

- **WHEN** a target height range contains an out-of-range value (e.g. 84 ft)
- **THEN** the rendered range is clamped to a plausible bound rather than shown
  verbatim
