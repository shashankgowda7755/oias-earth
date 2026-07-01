# Tasks — per-year-photo-gallery

> Status: all shipped across commits cd878de, d0423b0, d18c67f (labels), 960df42
> (searchable picker), a4315c1 (crop + remove/replace). Every item below is done.

## 1. Shared fiscal / project-year helpers (lib/fiscal.ts)

- [x] 1.1 `fiscalQuarterOf(Date)` — Indian FY, Apr-Jun=Q1, Jul-Sep=Q2, Oct-Dec=Q3,
  Jan-Mar=Q4 with Q4's calendar months in the next year (`fiscal.ts:20`)
- [x] 1.2 `quarterPeriodLabel(year, q)` — e.g. `Apr – Jun 25`, Q4 uses `year + 1`
  for the calendar suffix (`fiscal.ts:29`)
- [x] 1.3 `quartersFrom(from, to)` — ascending fiscal quarters, iteration-capped
  guard against a bad date (`fiscal.ts:36`)
- [x] 1.4 `fiscalYearLabel(year)` — `FY 2024–25` (`fiscal.ts:56`)
- [x] 1.5 `quarterOrdinal(fq)` = `year*4 + (quarter-1)` for diffing / project-year
  math (`fiscal.ts:64`)
- [x] 1.6 `projectYearOf(plantation, fq)` — quarter containing the plantation date
  is Year 1; every 4 quarters after = next year; `>= 1` (`fiscal.ts:73`)
- [x] 1.7 `projectYearLabel(py)` — `Year N` (`fiscal.ts:79`)

## 2. PFA — merge quarter photo, drop dead slots

- [x] 2.1 `QUARTER_SLOTS` = `soil_meter`, `temp_inside`, `temp_outside` only; the
  single gallery tile is removed from "This quarter" (`PfaUploader.tsx:32`)
- [x] 2.2 Dashboard + Impact capture slots removed; `SITE_SLOTS` is cover /
  content / permission / layout / security (`PfaUploader.tsx:25`)
- [x] 2.3 `seedFromForest` no longer seeds the removed slots; still seeds
  `gallery` per quarter for the bulk block (`PfaUploader.tsx:53`)
- [x] 2.4 Menu "This quarter" progress counts only the merged `QUARTER_SLOTS`
  (`PfaUploader.tsx:559`)

## 3. PFA — bulk "Quarterly photos" block (backfill by project year)

- [x] 3.1 New `qphotos` page; menu row "Quarterly photos · All quarters · one
  each" (`PfaUploader.tsx:560`, `:648`)
- [x] 3.2 Load full `gallery_images` into `galleryByQ` keyed `${year}-${quarter}`
  when a forest loads (`PfaUploader.tsx:138`)
- [x] 3.3 Group `quartersFrom(plantation, now)` into project years, 4 quarters per
  year, `projectYearLabel(yi+1)` header + `filled/total` per year
  (`PfaUploader.tsx:655`)
- [x] 3.4 Each tile add/replace/delete a `gallery` photo for its `(year,quarter)`
  via `bulkGalleryUpload` / `bulkGalleryDelete` (`PfaUploader.tsx:370`, `:385`)
- [x] 3.5 Empty-state copy when there are no quarters (plantation date unset)
  (`PfaUploader.tsx:654`)

## 4. PFA — backdated, fiscal-labelled quarter picker

- [x] 4.1 Picker options from `quartersFrom(plantationDate ?? now-2y, now)`
  (`PfaUploader.tsx:174`)
- [x] 4.2 Default the selection to the last (current) quarter once a forest's
  `plantation_date` loads (`PfaUploader.tsx:182`)
- [x] 4.3 Label each option `Year N · Q<fiscalQ> · <period>`; the tile captions in
  the bulk block use `Q<fiscalQ> · <period>` (`PfaUploader.tsx:539`, `:679`)
- [x] 4.4 Fix: show the real FISCAL quarter (`fq.quarter`), not a sequential 1-4
  (commit d18c67f — `PfaUploader.tsx:539`, `:679`)

## 5. Report — per-project-year Photo Gallery

- [x] 5.1 `galleryByProjectYear` groups `gallery_images` by project year from the
  plantation quarter (`slides/index.tsx:26`)
- [x] 5.2 Fold `plantation_progress` into any `(year,quarter)` cell the gallery
  does not already fill (`slides/index.tsx:38`)
- [x] 5.3 Captions default to `Q<fiscalQ> · <period>` from `quarterPeriodLabel`,
  or the entered caption (`slides/index.tsx:62`; FQ fix in d18c67f `:62`)
- [x] 5.4 `buildSlides` emits one `GalleryYearPage` per project year with photos,
  stable id `gallery-y<py>`, title `Photo Gallery — Year N`
  (`slides/index.tsx:106`)
- [x] 5.5 Old single "Plantation Progress" and static "Photo Gallery" slides
  removed; one empty-state page kept when no photos exist (`slides/index.tsx:112`)
- [x] 5.6 `GalleryYearPage` auto-fits layout to photo count: 1=full, 2=split,
  3=wide-top + two, 4=2x2, crop-to-fill cells (`slides3.tsx:303`)

## 6. PFA — searchable forest picker

- [x] 6.1 Replace the `<select>` with a combobox: search input + filtered dropdown
  (`PfaUploader.tsx:500`)
- [x] 6.2 Filter by name / code / number / label, case-insensitive, cap 50 rows
  (`PfaUploader.tsx:468`)
- [x] 6.3 Each result shows the name + `code · number`; picking fills the box and
  enables Continue (`PfaUploader.tsx:523`)
- [x] 6.4 `ForestOption` + `fetchForestOptions` carry `name` /
  `code` (forest_internal_id) / `number` (forest_unique_id)
  (`Reports/reportApi.ts`)

## 7. PFA — interactive crop + discoverable remove/replace

- [x] 7.1 `CropModal` (Cropper.js v2, lazy-loaded, cached) locked to each slot's
  target ratio; export at the drawn box; silent `cropToRatio` fallback
  (`components/CropModal.tsx`)
- [x] 7.2 `lib/cropImage.ts` shared `cropToRatio` / `outSize` / `canvasToJpegFile`
- [x] 7.3 Every capture (file / camera / aerial / bulk quarterly) routes through
  `openCrop` before upload (`PfaUploader.tsx:234`, `:239`, `:315`, `:370`)
- [x] 7.4 Trash overlay on every filled Site / This-quarter tile; Replace + Delete
  in the filled-photo preview (`PfaUploader.tsx:445`, `:723`)
- [x] 7.5 `deferWithUndo` — optimistic clear + 5s Undo toast holding the server
  call; report / quarterly / aerial / sponsor removes all route through it
  (`PfaUploader.tsx:272`)
- [x] 7.6 `Toast` supports an optional inline action button (Undo)

## 8. Verify

- [x] 8.1 Typecheck + local build green
- [x] 8.2 Crop modal degrades to silent centre-crop when Cropper cannot load, so
  uploads are never blocked
