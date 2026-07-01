## ADDED Requirements

### Requirement: Merged single quarterly photo

The PFA "This quarter" page SHALL capture only the per-quarter measurement photos
(`soil_meter`, `temp_inside`, `temp_outside`) and MUST NOT expose Dashboard,
Impact, or a separate Progress/Gallery pair as capture slots. The single quarter
gallery photo is owned by the bulk "Quarterly photos" block, so the same photo is
never captured twice. The "This quarter" progress count MUST reflect only these
merged slots.

#### Scenario: This-quarter slots

- **WHEN** an operator opens the "This quarter" page
- **THEN** the tiles are Soil meter, Inside and Outside only, with no Dashboard,
  Impact, Progress or Gallery tile

#### Scenario: Progress count excludes removed slots

- **WHEN** the menu shows the "This quarter" completion count
- **THEN** the denominator is the three merged measurement slots, not the old set
  that included the removed capture slots

### Requirement: Bulk backfill of quarterly photos by project year

The PFA uploader SHALL provide a "Quarterly photos" page that lists every fiscal
quarter from the forest's `plantation_date` to now, grouped by PROJECT year (four
consecutive quarters from the plantation quarter = Year 1, then Year 2, ...), each
year headed by its `Year N` label and a filled/total count. Each quarter tile SHALL
add, replace, or delete exactly one `gallery` photo for that quarter's
`(year, quarter)`, so an operator can backfill the entire history from one screen.

#### Scenario: Backfill an old quarter

- **WHEN** an operator opens "Quarterly photos" for a forest planted two years ago
  and taps an empty tile in Year 1
- **THEN** the crop modal opens and, on confirm, the cropped photo uploads as the
  `gallery` photo for that quarter's `(year, quarter)` and the tile fills

#### Scenario: Delete a quarterly photo

- **WHEN** an operator taps the trash overlay on a filled quarterly tile
- **THEN** the tile clears immediately and an Undo toast holds the server delete
  for 5 seconds, matching the shared deferred-delete behaviour

#### Scenario: No plantation date

- **WHEN** the selected forest has no valid `plantation_date`
- **THEN** the "Quarterly photos" page shows an empty-state message asking to set
  the plantation date first rather than an empty grid

### Requirement: Backdated quarter picker with fiscal labels

The pick-page quarter selector SHALL list the fiscal quarters returned by
`quartersFrom(plantation_date, now)` (falling back to roughly the last two years
when no valid plantation date is present) and SHALL default the selection to the
last (current) quarter once a forest loads. Every option label SHALL read
`Year N · Q<fiscalQuarter> · <period>` where the quarter is the Indian fiscal
quarter (Apr-Jun=Q1, Jul-Sep=Q2, Oct-Dec=Q3, Jan-Mar=Q4), not a sequential 1-4.

#### Scenario: Picker lists history from plantation

- **WHEN** a forest planted in 2024 is selected
- **THEN** the quarter dropdown lists every fiscal quarter from the plantation
  quarter through the current quarter, ascending, and defaults to the current one

#### Scenario: Fiscal label for a January-March quarter

- **WHEN** an option represents a quarter in January-March
- **THEN** its label shows `Q4` for that quarter (with the correct period), not `Q1`

### Requirement: Searchable forest picker

The pick page SHALL present a combobox (search input plus a filtered dropdown) in
place of a plain select. Typing SHALL filter the forest list case-insensitively by
name, code (`forest_internal_id`), number (`forest_unique_id`) and label; each
result SHALL show the forest name with its `code · number`; selecting a result
SHALL fill the input and enable Continue. `ForestOption` / `fetchForestOptions`
MUST carry the `name`, `code` and `number` fields used for filtering.

#### Scenario: Filter by code

- **WHEN** an operator types a forest's internal code into the search box
- **THEN** the dropdown narrows to forests whose name, code, number or label
  contains that text, case-insensitive

#### Scenario: Select a forest

- **WHEN** an operator picks a result
- **THEN** the search box shows the chosen forest's label, the dropdown closes, and
  the Continue button becomes enabled

#### Scenario: No matches

- **WHEN** the query matches no forest
- **THEN** the dropdown shows a "No forests match" message instead of options

### Requirement: Interactive crop on every capture

The system SHALL open the interactive crop modal locked to a slot's target aspect
ratio before every PFA capture upload (file pick, camera snap, aerial upload, and
bulk quarterly upload), exporting a JPEG at the box the operator drew. If
Cropper.js cannot load or the crop fails, the system SHALL fall back to a silent
centre-crop (`cropToRatio`) so the operator is never blocked from uploading.

#### Scenario: Capture opens the crop modal

- **WHEN** an operator takes or chooses a photo for any capture slot
- **THEN** the crop modal opens with a crop box locked to that slot's ratio, and
  the uploaded file is the cropped result of what the operator framed

#### Scenario: Cropper unavailable

- **WHEN** Cropper.js fails to load or the crop export throws
- **THEN** the capture still completes using a silent centre-crop to the slot ratio
  and the upload proceeds

### Requirement: Discoverable remove and replace with undo

Every filled Site and This-quarter tile SHALL show a trash overlay, and the
filled-photo preview SHALL offer Replace and Delete. All photo removals (report
slot, quarterly, aerial, sponsor) SHALL run through the shared `deferWithUndo`
helper: the UI clears optimistically, an Undo toast holds the server delete for 5
seconds, tapping Undo cancels and restores, and a failed server delete rolls the
UI back.

#### Scenario: Remove with undo

- **WHEN** an operator deletes a filled photo and then taps Undo within 5 seconds
- **THEN** the server delete is cancelled and the photo is restored in the UI

#### Scenario: Undo lapses

- **WHEN** an operator deletes a filled photo and does not tap Undo
- **THEN** after 5 seconds the real server delete fires, and if it fails the UI is
  rolled back with an error toast

#### Scenario: Replace a filled tile

- **WHEN** an operator opens a filled tile's preview and taps Replace
- **THEN** the capture action sheet opens for that same slot so a new photo can be
  captured and cropped into it
