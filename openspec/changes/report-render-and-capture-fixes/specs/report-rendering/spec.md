## ADDED Requirements

### Requirement: Site master plan tolerates the grid-name split

The system SHALL read the grid dimensions for the Site Master Plan from either the
singular DB/list names (`box_column`, `tree_row`, `tree_column`) or their plural
payload aliases (`box_columns`, `tree_rows`, `tree_columns`), preferring the
singular name when both are present. Both the server report builder and the client
report compute MUST apply this tolerance so the slide renders identically
regardless of which shape the forest payload carries.

#### Scenario: Forest carries singular grid names

- **WHEN** a report is rendered for a forest whose payload has `box_column`,
  `tree_row` and `tree_column` set (the DB/list shape)
- **THEN** the Site Master Plan grid label and per-matrix label are populated from
  those values and the slide is not blank

#### Scenario: Forest carries plural grid aliases

- **WHEN** a report is rendered for a forest whose payload has `box_columns`,
  `tree_rows` and `tree_columns` set (the full-payload shape)
- **THEN** the Site Master Plan grid renders the same as for the singular shape

### Requirement: Growth heights are shown as entered, not capped

The system SHALL display tree growth-milestone heights and the current-height label
as entered, floored at 0, with no artificial upper ceiling. A height greater than a
previously enforced display cap MUST render its real value rather than the cap.

#### Scenario: Tree taller than the old 30 ft cap

- **WHEN** a growth milestone or actual height records a value above 30 ft
- **THEN** the report renders the entered value (e.g. `34 Feet`), not a clamped `30`

#### Scenario: Negative height floored

- **WHEN** a height value is negative
- **THEN** it is floored at 0 rather than rendered as a negative number
