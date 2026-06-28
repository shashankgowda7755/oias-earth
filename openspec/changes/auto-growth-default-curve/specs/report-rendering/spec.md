## MODIFIED Requirements

### Requirement: Growth heights are shown as entered, not capped

The system SHALL display tree growth-milestone heights and the current-height label
as entered, floored at 0, with no artificial upper ceiling. A height greater than a
previously enforced display cap MUST render its real value rather than the cap.

Additionally, when a forest has **no** manually-entered growth targets, the system
SHALL render the growth slide from a **default 3-year curve** anchored to the
plantation date, so the slide is never blank. Each year's height band SHALL be
divided equally across its four quarters (linear interpolation by month), and the
report period (fiscal year + quarter) SHALL select the interpolated current height.
A manually-entered curve MUST override the default.

#### Scenario: Tree taller than the old 30 ft cap

- **WHEN** a growth milestone or actual height records a value above 30 ft
- **THEN** the report renders the entered value (e.g. `34 Feet`), not a clamped `30`

#### Scenario: Negative height floored

- **WHEN** a height value is negative
- **THEN** it is floored at 0 rather than rendered as a negative number

#### Scenario: No targets entered → auto-render from plantation date

- **WHEN** a report is built for a forest with a plantation date but no
  `target_height_range`
- **THEN** Slide 13 renders the default curve (Year 0 2–3, End of Year 1 7–8, End of
  Year 2 8–9, End of Year 3 10–14 ft) with the year the report has reached
  highlighted and a current-height readout interpolated to the report quarter

#### Scenario: Manual curve overrides the default

- **WHEN** a forest has its own `target_height_range`
- **THEN** that curve is used and the default is not applied
