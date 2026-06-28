## ADDED Requirements

### Requirement: One guided entry point per quarter

The system SHALL provide a single guided surface for producing a quarterly report,
launched from the Reports tab for a chosen forest, fiscal year, and quarter. The
operator MUST NOT be required to read or write raw JSON, nor to understand the
`mode` / `type` / `version` / `skip` fields, to produce a report. Those fields MAY
remain available behind an explicit "Advanced" disclosure. The `reports` table row
serves only as a lightweight index/status record; the forest JSONB remains the
single source of truth the renderer reads.

#### Scenario: Start a report from the Reports tab

- **WHEN** an operator clicks "Start / Open report" for a forest and picks a year
  and quarter
- **THEN** the guided quarter-aware editor opens for that forest+year+quarter, no
  raw JSON textarea is shown, and an index `reports` row exists for that quarter

#### Scenario: Advanced fields are opt-in

- **WHEN** an operator does not open the "Advanced" disclosure
- **THEN** they never see `report_data`, `mode`, `type`, `version`, or `skip`, and
  the report still renders correctly from forest JSONB

### Requirement: Q1 captures the full report; Q2–Q4 show only what changes

The editor SHALL adapt to the selected quarter. For **Q1** it MUST present the
complete set of sections (one-time setup plus quarterly). For **Q2, Q3, and Q4** it
MUST present only the fields that change quarter-to-quarter — photos, workforce
contribution, and growth stage — together with auto-filled weather and the on-site
measurements; all other content MUST be shown as carried forward from the prior
quarter (read-only with an explicit edit affordance), never as blank inputs to
re-enter.

#### Scenario: Second-quarter delta entry

- **WHEN** an operator opens Q2 for a forest that already has a Q1 report
- **THEN** the editor shows only photos, workforce contribution, growth stage,
  auto weather, and on-site measurements; the setup data (land, area, population,
  beneficiaries, value-flow, species) is shown carried-forward and read-only

#### Scenario: Generated Q2 report includes carried-forward setup

- **WHEN** the Q2 report is rendered (`?year=&quarter=2`)
- **THEN** it shows the Q2 deltas plus the Q1 setup data without the operator
  having re-entered the setup data
