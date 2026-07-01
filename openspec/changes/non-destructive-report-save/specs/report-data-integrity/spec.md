## ADDED Requirements

### Requirement: Report edits never erase data saved by another path

The Report Data editor SHALL persist a keyed jsonb list column by 3-way merging the
baseline it loaded, the operator's current draft, and the LIVE server value fetched
at save time, so that a row added or changed by another path (the PFA uploader, or
another tab) after the editor loaded is preserved, while the operator's own adds,
edits and deletes are applied. Rows are matched by a stable key: `(year, quarter)`
or `slide_type`. When any row in a column lacks a stable key, the editor MUST fall
back to writing the draft value for that column rather than attempt an unsafe merge.

#### Scenario: Row added elsewhere after load is preserved

- **WHEN** the editor loads a forest, another path then appends a new row (a new
  `(year, quarter)` or `slide_type`) to a keyed list column, and the operator saves
  an unrelated edit to that same column
- **THEN** `flush()` re-fetches the live report, `mergeList` seeds the result from the
  live server array, and the row added elsewhere survives the save

#### Scenario: Operator delete is honored

- **WHEN** the operator removes a row that existed in the baseline they loaded and
  then saves
- **THEN** that row is dropped from the merged result (present in baseline, absent
  from draft) even though it still appears in the live server array

#### Scenario: Operator edit is applied by key

- **WHEN** the operator edits a row that exists both in the draft and on the server
  and saves
- **THEN** the operator's version overwrites the server row for that key, and rows
  with other keys on the server are left untouched

#### Scenario: Unkeyed rows fall back to a whole-column write

- **WHEN** a column contains any row that has neither `(year, quarter)` nor
  `slide_type`
- **THEN** `mergeList` returns the draft array unchanged and the column is written
  whole, because it cannot be merged safely

#### Scenario: Baseline advances after each save

- **WHEN** a save succeeds
- **THEN** the editor advances its baseline to the merged columns and reflects them
  into the draft, so the next save diffs against what was actually persisted

### Requirement: Debounced report save never NULL-wipes a column

The debounced report-data write endpoint (`updateForestReportData`,
`POST /forest/:id/report-data`) SHALL skip any jsonb column whose incoming value is
null or undefined rather than writing NULL to that column, so a stale or empty draft
cannot clear stored data. An explicit clear of a list item MUST instead go through
the atomic per-item endpoint `POST /forest/:id/report-data/list-item`.

#### Scenario: Null column value is ignored

- **WHEN** the request body carries a jsonb column key whose value is `null`
- **THEN** the column is left out of the UPDATE (`if (b[c] == null) continue;`) and
  its stored value is unchanged

#### Scenario: Present columns still persist

- **WHEN** the request body carries a jsonb column with a non-null array or object
  value
- **THEN** that column is written as jsonb and the response reports it updated

#### Scenario: Empty body updates nothing

- **WHEN** the request body carries only null jsonb columns (no scalar or non-null
  jsonb sets)
- **THEN** no UPDATE runs and the endpoint returns `updated: 0`

### Requirement: Seed and import migrations never overwrite existing forests on cold start

Bulk seed and import migrations SHALL insert forests only if they do not already
exist, using `ON CONFLICT (forest_internal_id) ... DO NOTHING`, so that re-running
the migration on a cold start never resets an existing forest's editable fields
(name, city, state, address) to seed values.

#### Scenario: Re-run leaves operator edits intact

- **WHEN** migration `027_bulk_import_180_sites.sql` re-runs on a cold start and a
  forest with a matching `forest_internal_id` already exists with operator-edited
  name/city/state/address
- **THEN** the conflicting insert does nothing (`DO NOTHING`) and the operator's
  edited values are preserved

#### Scenario: First run still imports new forests

- **WHEN** the migration runs and no forest with the given `forest_internal_id`
  exists yet
- **THEN** the forest row is inserted normally from the seed values

#### Scenario: No DO UPDATE remains in the import

- **WHEN** the migration file is inspected
- **THEN** it contains no `ON CONFLICT ... DO UPDATE SET` on the forests inserts;
  every forest insert resolves conflicts with `DO NOTHING`
