## ADDED Requirements

### Requirement: Quarterly forest report renders 22 navigable slides

The platform SHALL render a quarterly forest report as 22 fixed-size slides at
`/report/forest/:id` (and `/report/forest/preview`). The report MUST be driven
by a single `ForestReportData` value (`{ meta, forest, computed }`); the
renderer MUST only read this value and MUST NOT recompute derived figures. The
viewer MUST provide section navigation (previous/next plus a jump-to-section
control) and MUST render a non-crashing loading and error state.

#### Scenario: Report loads for a forest and quarter

- **WHEN** a user opens `/report/forest/:id?year=&quarter=` for an existing
  active forest
- **THEN** all 22 slides render in order, the header shows the forest name and
  `Q{quarter} {year}`, and no derived value is recomputed on the client

#### Scenario: Section navigation jumps between slides

- **WHEN** the user picks a section from the jump-to-section control or presses
  next/previous
- **THEN** the viewport scrolls to that slide, the position counter updates, and
  previous/next are disabled at the first/last slide respectively

#### Scenario: Missing or failed report does not crash the page

- **WHEN** the report data is still loading or the fetch fails
- **THEN** a plain "Loading report…" or error message is shown instead of a
  blank screen or thrown exception

#### Scenario: Admin actions are gated on a public route

- **WHEN** a visitor without an `Admin`/`SuperAdmin` token opens the report
- **THEN** the report itself renders (the route is public) but the admin action
  menu (Back / Edit report data / Send report) is not shown

### Requirement: Server builds the report payload from whitelisted forest data

The server SHALL expose `GET /api/v1/public/forest/:id/report?year=&quarter=`
returning `{ data: { meta, forest, computed } }` in the exact shape the renderer
consumes. The forest object MUST contain only whitelisted scalar columns (no PII
or internal ids) and parse-guarded jsonb, and the DB's singular grid columns
MUST be mapped to the payload's plural names. The id MUST be UUID-validated and
default to the current calendar quarter when `year`/`quarter` are omitted.

#### Scenario: Endpoint returns the renderer-ready payload

- **WHEN** `GET /api/v1/public/forest/:id/report?year=2026&quarter=1` is called
  for an active forest
- **THEN** the response is `{ data: { meta, forest, computed } }` with the
  whitelisted forest fields and the computed block, and no PII or internal id is
  present

#### Scenario: Quarter defaults when parameters are omitted

- **WHEN** the request omits `year`/`quarter` or passes an out-of-range quarter
- **THEN** the builder uses the current year and the calendar quarter derived
  from the current month

#### Scenario: Unknown or inactive forest is rejected

- **WHEN** the id is not a valid UUID or matches no active forest
- **THEN** the endpoint responds Not Found rather than leaking an empty or
  partial payload

### Requirement: Report figures use fiscal quarters

The report SHALL treat quarters as Indian fiscal quarters with an April start:
Q1 = Apr–Jun, Q2 = Jul–Sep, Q3 = Oct–Dec, Q4 = Jan–Mar. For Q4 the calendar
months fall in the fiscal year + 1. Day counts, period labels, and
maintenance/workforce rollups MUST be derived on this basis.

#### Scenario: Q1 maps to April

- **WHEN** the report computes the period for fiscal year `Y`, quarter 1
- **THEN** the period covers April–June of year `Y`

#### Scenario: Q4 spans into the next calendar year

- **WHEN** the report computes the period for fiscal year `Y`, quarter 4
- **THEN** the period covers January–March of calendar year `Y + 1`

### Requirement: Carbon and oxygen are presented as estimates, never credits

The report SHALL present oxygen and carbon figures as estimated /
verification-ready removal and MUST NOT label them as issued carbon credits.
Oxygen/carbon are computed from a per-species rate with only 25% counted, and
this estimation basis MUST be disclosed on the value slide.

#### Scenario: Approximate-value slide discloses the estimate basis

- **WHEN** the Approximate Value slide renders
- **THEN** it states that figures are "Estimated, verification-ready removal —
  not an issued carbon credit" and that only 25% of generated oxygen / sequestered
  carbon is counted

#### Scenario: Carbon is never called a credit

- **WHEN** any slide displays a carbon figure
- **THEN** it is described as estimated removal and never as an issued or
  tradable carbon credit

### Requirement: Absent data renders blank, never fabricated

The report SHALL render an em dash (`—`) or blank for any field that is null,
empty, or absent, and MUST NOT substitute a fabricated `0`. Numeric coercion
MUST treat missing/non-finite inputs as 0 only for internal summation, never to
present a derived value where no source data exists.

#### Scenario: Empty field shows an em dash

- **WHEN** a forest has no value for a displayed field (e.g. a spacing distance
  or a value-flow term that is entirely absent)
- **THEN** the slide shows `—` rather than `0` or a placeholder number

#### Scenario: Value-flow net is omitted when all terms are absent

- **WHEN** every term of a value-flow period (land/tree/oxygen/carbon) is null
- **THEN** that period's net renders `—` instead of summing to `0`

### Requirement: Report can be downloaded as a client-rendered PDF

The platform SHALL produce a downloadable PDF of the report entirely in the
browser, with one landscape A4 page per slide, without any server-side
rendering. The PDF generator MUST rasterise the live `.rpt-slide` DOM and MUST
load its rendering libraries only when the user initiates a download. Each
download SHALL be logged to the audit trail.

#### Scenario: Download produces a multi-page PDF

- **WHEN** the user clicks Download PDF
- **THEN** each `.rpt-slide` is rendered to a landscape A4 page and a single
  PDF file is saved, named for the forest, quarter, and year

#### Scenario: PDF libraries load lazily

- **WHEN** the report viewer first renders without a download being requested
- **THEN** `html2canvas` and `jspdf` are not loaded into the main bundle; they
  are imported only on the download action

#### Scenario: Download is recorded in the audit trail

- **WHEN** a PDF download completes for a real forest (not the preview)
- **THEN** a `report.download` audit entry is recorded with the actor name (or
  `anonymous`) and the year/quarter

### Requirement: Editing report data never mutates the tree record

The report-data write path `POST /forest/:id/report-data` SHALL update only
whitelisted report scalars and report jsonb sections present in the request
body, and MUST NOT delete or regenerate `forest_boxes` or `forest_trees`.
Access MUST be authorised against the forest. Empty strings MUST be stored as
`NULL` and jsonb values stringified.

#### Scenario: Report-data save leaves geotagged trees intact

- **WHEN** an authorised user saves report-data sections for a forest
- **THEN** only the submitted report fields are updated and the forest's
  existing `forest_trees`/`forest_boxes` rows are unchanged

#### Scenario: Only present fields are written

- **WHEN** the request body contains a subset of report fields
- **THEN** only those fields are updated, with empty strings stored as `NULL`,
  and absent fields are left as-is

#### Scenario: Unauthorised forest access is rejected

- **WHEN** a user without access to the forest attempts the write
- **THEN** the request is rejected by the forest-access check before any update

### Requirement: Preview renders from a bundled fixture without a server

The platform SHALL render `/report/forest/preview` from a bundled sample JSON
so the field mapping can be verified slide-by-slide with no server or auth. The
sample MUST be selectable via `?src=` (default `vandalur`), and absent fields in
the sample MUST render blank/`—` so mapping mistakes are visible.

#### Scenario: Preview renders the default sample

- **WHEN** a user opens `/report/forest/preview` with no `?src=`
- **THEN** the report renders from `vandalur.sample.json` with no network or
  auth requirement

#### Scenario: Preview selects an alternate sample

- **WHEN** a user opens `/report/forest/preview?src=annasaheb`
- **THEN** the report renders from the corresponding bundled sample at its
  configured fiscal year/quarter
