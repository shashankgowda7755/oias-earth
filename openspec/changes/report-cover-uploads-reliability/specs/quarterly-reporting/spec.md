## ADDED Requirements

### Requirement: The report-data editor autosaves per field

The report-data editor SHALL persist changes automatically, sending ONLY the
columns the user edited (debounced), never the whole payload. It SHALL show a
save status (saving / saved / failed) and re-queue failed columns for retry, and
flush pending edits when the user navigates away. Two people editing different
sections of the same report MUST NOT overwrite each other.

#### Scenario: Two editors, different sections

- **WHEN** editor A saves only the report images and editor B saves only the
  sponsor logos on the same forest
- **THEN** both changes persist (neither column is clobbered)

### Requirement: List items are edited atomically

The editor SHALL be able to add, update, or delete a single item in a report
list column (gallery, maintenance, soil pH, temperature, progress, environmental
indicators, sponsor/dashboard/report images) via `POST /forest/:id/report-data/list-item`,
which mutates just that item under a row lock so concurrent edits to the same
list do not clobber each other. The column comes from a fixed whitelist.

#### Scenario: Concurrent adds to the same list

- **WHEN** two editors each add a different item to the same gallery
- **THEN** both items survive

### Requirement: Images upload natively throughout the editor

Every image field in the report-data editor SHALL upload a picked file to
durable storage (no paste-URL requirement), including the sponsor logo. The
Quarterly tab SHALL offer per-quarter photo uploads (soil meter, inside/outside
plantation, progress, gallery) for the selected year/quarter, matching the PFA
field app, writing the returned URL into that quarter's row.

#### Scenario: Add a quarter photo from the editor

- **WHEN** an admin picks a year/quarter on the Quarterly tab and uploads a
  progress photo
- **THEN** the photo is stored and saved to that (year, quarter) row and appears
  on the report

### Requirement: Report list returns report_data for edit prefill

`reports/list` SHALL return the `report_data` column so the Reports edit form
prefills it on the first open.

#### Scenario: Edit an existing report

- **WHEN** an admin opens an existing report for edit
- **THEN** the previously saved `report_data` is shown without reopening
