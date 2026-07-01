## Why

The quarterly report and the PFA capture flow both treated photos as a flat,
single-quarter concern. That did not match how an urban forest is actually
tracked (multi-year, four fiscal quarters per project year), so operators could
not backfill history and readers saw the wrong quarter labels.

1. **No way to backfill old quarters.** The PFA "This quarter" page only wrote
   the currently selected quarter, and the report's single static "Photo Gallery"
   slide showed whatever was on the payload. A forest planted two years ago had no
   place to enter the eight past quarters of photos, so most of the timeline was
   simply missing from the report.

2. **Two overlapping capture slots for the same photo.** "This quarter" carried a
   Progress tile and a separate Gallery tile plus dead Dashboard and Impact slots,
   all feeding the same report imagery. The operator had to guess which one the
   report used, and the redundant slots inflated the "photos remaining" count with
   fields the report no longer renders.

3. **Quarter labels were wrong.** The picker, the capture tiles and the report
   captions numbered quarters 1-4 sequentially from the plantation date. The
   organisation runs on the Indian fiscal year (April start), so a photo taken in
   February is fiscal Q4, not "Q1 of the project". Sequential numbering mislabeled
   every quarter that did not start in April.

4. **Forest picking did not scale.** The PFA pick page used a plain `<select>` of
   every forest. With a long list an operator could not find a forest by its code
   (`forest_internal_id`) or number (`forest_unique_id`), only by scrolling.

5. **Capture cropped silently and hid remove/replace.** Every capture was
   centre-cropped to the slot ratio with no operator control, and filled Site /
   This-quarter tiles had no visible way to remove or replace a photo, so a
   mis-framed or wrong photo was hard to fix.

## What Changes

- **Shared fiscal helpers.** New `lib/fiscal.ts` centralises the Indian-FY math so
  client, PFA and report labels agree: `fiscalQuarterOf`, `quartersFrom`,
  `quarterPeriodLabel`, `fiscalYearLabel`, `quarterOrdinal`, `projectYearOf`,
  `projectYearLabel`. April-start quarters: Apr-Jun=Q1, Jul-Sep=Q2, Oct-Dec=Q3,
  Jan-Mar=Q4 (Q4's calendar months fall in the next calendar year).

- **Merged "Quarterly photo".** PFA "This quarter" (`QUARTER_SLOTS`) is now
  `soil_meter`, `temp_inside`, `temp_outside` only. The Dashboard and Impact
  capture slots are removed and the Progress/Gallery pair is collapsed into the
  single gallery photo now owned by the bulk block below. `seedFromForest` no
  longer seeds the removed slots.

- **Bulk "Quarterly photos" block.** A fourth PFA page (`page === 'qphotos'`)
  lists every fiscal quarter from the forest's `plantation_date` to now
  (`quartersFrom`), grouped by PROJECT year (four consecutive quarters from the
  plantation quarter = Year 1, Year 2 ...). Each tile adds / replaces / deletes
  one `gallery` photo for its `(year, quarter)` via `bulkGalleryUpload` /
  `bulkGalleryDelete`, so an operator backfills the whole history in one place.

- **Backdated, fiscal-labelled quarter picker.** The pick-page `<select>` lists
  `quartersFrom(plantationDate, now)` and defaults to the last (current) quarter.
  Every quarter label reads `Year N · Q<fiscalQ> · <period>` where `fiscalQ` is
  the real fiscal quarter, not a sequential 1-4.

- **Report Photo Gallery per project year.** `buildSlides` is data-driven:
  `galleryByProjectYear` groups photos into project years (four quarters from the
  plantation quarter) and emits one `GalleryYearPage` per year that has photos
  (`Photo Gallery — Year N`). Legacy `plantation_progress` folds into any cell the
  gallery does not fill. The old single "Plantation Progress" and static "Photo
  Gallery" slides are gone. When no photos exist anywhere, one empty-state gallery
  page is kept. `GalleryYearPage` auto-fits the layout to the photo count
  (1=full, 2=split columns, 3=wide-top + two, 4=2x2) with crop-to-fill cells.

- **Searchable forest picker.** The pick page is a combobox: a search input plus a
  filtered dropdown matching forest name, code (`forest_internal_id`), number
  (`forest_unique_id`) and label, case-insensitive. `fetchForestOptions` /
  `ForestOption` now carry `name`, `code`, `number` for filtering.

- **Interactive crop + discoverable remove/replace.** Every capture (file, camera,
  aerial, bulk quarterly) opens `CropModal` (Cropper.js v2, lazy-loaded) locked to
  the slot's target ratio, with a graceful fallback to the silent `cropToRatio`.
  Filled Site and This-quarter tiles show a trash overlay, and removes across
  report / quarterly / aerial / sponsor slots run through the shared
  `deferWithUndo` helper (optimistic clear + a 5s Undo toast before the server
  delete).

## Capabilities

### New Capabilities
- `report-gallery`: the rendered report emits one Photo Gallery page per project
  year (four fiscal quarters from the plantation quarter), auto-fits the layout to
  the photo count, labels captions by the real fiscal quarter, and folds legacy
  `plantation_progress` in behind the gallery.

### Modified Capabilities
- `pfa-capture`: the PFA uploader merges the quarter photo into a single gallery
  slot, adds a bulk per-project-year "Quarterly photos" backfill block, lists
  backdated fiscal quarters in the picker, offers a searchable forest picker, and
  crops every capture through an interactive modal with discoverable
  remove/replace.

## Impact

- Client (new): `lib/fiscal.ts` (fiscal + project-year helpers),
  `components/CropModal.tsx` (interactive crop), `lib/cropImage.ts` (shared
  `cropToRatio` / `outSize` / `canvasToJpegFile`).
- Client (changed): `pages/Pfa/PfaUploader.tsx` (merged slot, `qphotos` page,
  backdated picker, searchable combobox, `openCrop` / `deferWithUndo`,
  `galleryByQ`, `seedFromForest`), `pages/report/slides/index.tsx`
  (`buildSlides` + `galleryByProjectYear`), `pages/report/slides/slides3.tsx`
  (`GalleryYearPage` auto-layout), `pages/report/slides/slides1.tsx` (Project
  Impact image removed; cover no longer falls back to dashboard images),
  `pages/report/ReportForestQuarterly.tsx` and
  `pages/report/reportForm/sections/QuarterlyAutoSection.tsx` (data-driven slide
  list), `pages/Reports/reportApi.ts` (`ForestOption.name/code/number`).
- Dependency: `cropperjs@2.1.1` added (lazy-loaded, own chunk — kept out of the
  main bundle).
- Server / API / DB: none. Upload endpoints (`uploadReportImage` with
  `slide_type: 'gallery'` and `{ year, quarter }`, `clearReportImage`) are
  unchanged; the bulk block and per-year gallery reuse the existing per-quarter
  `gallery_images` shape.
- Verification: local build + typecheck; the crop tool falls back silently if
  Cropper cannot load so uploads are never blocked.
