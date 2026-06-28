## ADDED Requirements

### Requirement: Calendar-derivable maintenance counts are not typed

The system SHALL derive the weekly-off count for a fiscal quarter (the number of
Sundays in the quarter window) and SHALL surface the resulting `working_days`
(days-in-quarter minus weekly-off minus festival holidays) as a computed,
read-only value. The operator MUST NOT be required to type the weekly-off count.

#### Scenario: Sundays auto-counted

- **WHEN** a quarter is opened for entry
- **THEN** `total_holidays_weekly_off` is pre-filled with the Sunday count for that
  fiscal-quarter window and `working_days` is shown read-only, both overridable

### Requirement: Festival holidays from an operator-supplied calendar

The system SHALL auto-count festival/public holidays for the quarter from an
operator-supplied per-state calendar (`lib/holidays.ts`), keyed on the forest's
state. The count MUST remain editable, and a state with no calendar entry MUST
fall back to an empty count rather than a fabricated number.

#### Scenario: Festival count pre-filled for a known state

- **WHEN** a quarter is opened for a forest whose state has a holiday calendar
- **THEN** `total_holidays_festival` is pre-filled from that calendar and is
  editable

### Requirement: Species health and mortality are derived from tree status

The system SHALL derive each forest's mortality rate and a suggested health bucket
from `forest_trees.tree_status_id` (1=Healthy, 2=Drying, 3=Damaged, 4=Dead; alive
= status `<> 4`) rather than requiring manual entry, and MUST present them as a
suggestion the operator can override.

#### Scenario: Mortality derived from status counts

- **WHEN** a report is built for a forest with tagged tree statuses
- **THEN** mortality rate = dead / total and a suggested health bucket are computed
  and shown as overridable values

### Requirement: Growth targets from per-species curves

The system SHALL auto-fill `plant_growth_data.target_height_range` from an
operator-supplied per-species growth curve (expected min/max height by year) so
target heights are not hand-typed. Actual measured heights remain manual.

#### Scenario: Targets filled from species curve

- **WHEN** a forest's species have growth-curve data
- **THEN** the target height ranges by year are pre-filled, leaving only the actual
  measured height for the operator
