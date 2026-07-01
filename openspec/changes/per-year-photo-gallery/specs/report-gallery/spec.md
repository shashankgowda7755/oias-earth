## ADDED Requirements

### Requirement: Photo Gallery is one page per project year

The report SHALL render the Photo Gallery as one slide per PROJECT year rather than
a single static slide. A project year is the plantation quarter (the fiscal quarter
containing `plantation_date`, or the earliest photo's quarter when no plantation
date is set) plus the next three consecutive fiscal quarters; every following block
of four quarters is the next project year, numbered from 1. Each project year that
has at least one photo MUST produce exactly one gallery page titled
`Photo Gallery — Year N`, ordered ascending by project year, and each page's photos
MUST appear in quarter order.

#### Scenario: Photos span two project years

- **WHEN** a report is built for a forest with gallery photos in quarters that fall
  into project Year 1 and project Year 2
- **THEN** `buildSlides` emits two gallery pages, `Photo Gallery — Year 1` and
  `Photo Gallery — Year 2`, in that order, each carrying only its own year's photos
  in quarter order

#### Scenario: Single static gallery slide is gone

- **WHEN** a report is built
- **THEN** there is no standalone "Plantation Progress" slide and no single static
  "Photo Gallery" slide; the gallery section is only the data-driven per-year pages

#### Scenario: No photos anywhere

- **WHEN** a report is built for a forest with no gallery or plantation-progress
  photos
- **THEN** exactly one empty-state gallery page is kept (so the section never
  disappears) showing "No photos for this year yet"

### Requirement: Legacy plantation progress folds into the gallery

The report SHALL fold `plantation_progress` photos into the per-year gallery,
using a plantation-progress photo for a given `(year, quarter)` only when the
`gallery_images` array has no photo for that same cell. Gallery photos take
precedence per cell.

#### Scenario: Gallery already has the cell

- **WHEN** both `gallery_images` and `plantation_progress` have a photo for the
  same `(year, quarter)`
- **THEN** the gallery page shows the `gallery_images` photo for that cell and
  ignores the plantation-progress one

#### Scenario: Only plantation progress has the cell

- **WHEN** `plantation_progress` has a photo for a `(year, quarter)` that
  `gallery_images` does not
- **THEN** that plantation-progress photo appears in the gallery page for its
  project year

### Requirement: Gallery layout auto-fits the photo count

Each gallery page SHALL adapt its grid to the number of photos (capped at 4 per
page) so cells always fill the slide with no empty placeholders: 1 photo = one
full-bleed cell; 2 = two equal full-height columns; 3 = a wide top cell spanning
both columns plus two cells below; 4 = a 2x2 grid. Each cell MUST crop-to-fill.

#### Scenario: Three photos in a year

- **WHEN** a project year's gallery page has exactly three photos
- **THEN** the first cell spans both columns across the top and the remaining two
  render side by side below it

#### Scenario: Four or more photos in a year

- **WHEN** a project year has four or more photos
- **THEN** the page renders the first four in a 2x2 grid and does not overflow the
  slide

### Requirement: Gallery captions use the real fiscal quarter

Each gallery photo caption SHALL use the operator-entered caption when present,
otherwise a generated `Q<fiscalQuarter> · <period>` label where the quarter is the
Indian fiscal quarter (Apr-Jun=Q1, Jul-Sep=Q2, Oct-Dec=Q3, Jan-Mar=Q4), not a
sequential 1-4 counted from the plantation date.

#### Scenario: Auto caption for a January-March photo

- **WHEN** a gallery photo has no caption and its quarter is fiscal Q4 (Jan-Mar)
- **THEN** the caption reads `Q4 · <period>` (e.g. `Q4 · Jan – Mar 25`), not `Q1`

#### Scenario: Entered caption preserved

- **WHEN** a gallery photo carries a non-empty caption
- **THEN** that caption is shown verbatim instead of the generated label
