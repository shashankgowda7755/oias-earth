## MODIFIED Requirements

### Requirement: Forest creation requires only a minimal core

The Add/Edit Forest wizard SHALL require only a minimal safe core to advance
(`goNext`) and to save (`handleSave`): `forest_name`, `forest_internal_id`, and a
map location (`forest_geo_lat` and `forest_geo_long`). Every other field on both
steps (city, state, country, site manager, user, sponsors, box/tree grid rows,
columns and distances, direction angle, boundary gap, pathway spacing, total
saplings, project site, project period, plantation date, client code, forest code)
MUST be optional and MUST NOT block Next or Save when left blank. A value that IS
entered SHALL still be format-checked: coordinates stay range-validated
(latitude -90..90, longitude -180..180), a typed grid count must be a positive
integer, and a typed distance, angle, gap or spacing must be a non-negative
number.

#### Scenario: Save with only name, internal ID, and location succeeds

- **WHEN** an operator fills `forest_name`, `forest_internal_id`, and a valid
  `forest_geo_lat` / `forest_geo_long`, leaves every other field blank, and taps
  Save Forest
- **THEN** `validateAll` returns no errors, `handleSave` runs the save mutation,
  and the forest is created

#### Scenario: Blank optional fields do not block advancing or saving

- **WHEN** the core fields are valid but city, state, country, the grid
  configuration, project site, project period, plantation date, and codes are all
  left blank
- **THEN** `goNext` advances past Step 1 and `handleSave` submits, with no
  "This field is required." error raised for any of those optional fields

#### Scenario: Blank name, internal ID, or location still blocks

- **WHEN** any of `forest_name`, `forest_internal_id`, `forest_geo_lat`, or
  `forest_geo_long` is left blank
- **THEN** the wizard blocks: `goNext` refuses to advance (or `handleSave` jumps
  to the first invalid step with a "Please fix the highlighted fields." toast) and
  the offending core field shows "This field is required."

#### Scenario: A typed optional value that is malformed still shows a format error

- **WHEN** an operator enters a non-numeric or non-positive value in a typed
  optional field (for example `box_column = 0` or a `direction_angle` that is not a
  finite number)
- **THEN** that field shows a format error ("Enter a whole number greater than 0."
  or "Enter a valid number (0 or more).") and Next/Save is blocked until it is
  corrected or cleared, while a blank in the same field would have passed

#### Scenario: Out-of-range coordinates are rejected even though other fields are optional

- **WHEN** an operator enters a `forest_geo_lat` outside -90..90 or a
  `forest_geo_long` outside -180..180
- **THEN** the coordinate field shows a range error ("Latitude must be between -90
  and 90." / "Longitude must be between -180 and 180.") and the wizard does not
  advance or save
