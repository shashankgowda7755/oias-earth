# Forests module — notes, divergences & open questions

Faithful rebuild of the COMMUNITREE "Forests" section, reconciled to the
**confirmed** contracts (`spec/write_contracts.md`,
`spec/communitree_admin_spec.json` screens.Forests + flows "Create Forest
(2-step wizard)", and `client/CONTRACTS.md`). Everything marked **inferred** is
tagged with a `TODO(spec openQuestions[n])` in code.

## Files in this module
- `index.tsx` — Forests list (DataTable) + search + Add button. Row **kebab
  (⋮) menu: View / Edit / Delete** via the shared DataTable `onView/onEdit/
  onDelete` props. Delete is a **HARD** delete behind `ConfirmDialog
  variant="danger"`.
- `AddForestWizard.tsx` — **2-step** wizard orchestrator (Basic Info → Grid
  Config) + `buildForestValues()` payload assembly. Save → `upsertEntity(
  'forest', values)` (no `id` = INSERT, `id` = UPDATE).
- `Steps.tsx` — Step 1 (Basic Info) + Step 2 (Grid Config) bodies.
- `Stepper.tsx` — numbered steps + green progress bar (2-step).
- `BoxGrid.tsx` — grid of Box cards (box_rows × box_column); each card opens…
- `EditBoxDialog.tsx` — sub-modal: Prefix / Start Digits / Start (auto-calc) +
  species rows (capacity = tree_row × tree_column). Cancel / Done.
- `LocationPicker.tsx` — keyless map placeholder + lat/long inputs.
- `MultiAutocompleteField.tsx` — async multi-select (chips) wrapping the shared
  single-select `AutocompleteField` (used for Sponsor*).
- `ForestDetailView.tsx` — read-only TABBED rich detail (row "View"). 13 tabs
  over the jsonb sections; each degrades gracefully when its data is absent.
  Replaces the old single-pane `ForestDetailDialog.tsx` (removed).
- `detail/primitives.tsx` — read-only render primitives (Field/FieldGrid, Stat,
  Thumb, DataGrid, fmt/quarterLabel/humanize helpers).
- `detail/sections.tsx` — the 13 tab bodies (Overview … Report Images).
- `CreateFromJsonDialog.tsx` — "Create from JSON" action: JsonImportField +
  live parse + summary (name/#boxes/#species/#trees) + Create.
- `JsonImportField.tsx` — local paste/upload-JSON field (see GAP below).
- `BoundaryMap.tsx` — local keyless SVG map: boundary polygon + center pin +
  "View on Google Maps" deep-link (see GAP below).
- `fullTypes.ts` — FULL forest/upsert payload types + all enums + helpers
  (`parseBoundary`, `summarizePayload`, `rowToFullPayload`).
- `forestApi.ts` — `forestUpsertFull(payload)` (flattens nested jsonb to
  JSON-string fields, wraps shared `upsertEntity`) + `parseForestJson` (JSONC
  tolerant).
- `api.ts` — `AutocompleteField` loaders (employees / sponsors / users /
  species via `speciesSearch`).
- `validation.ts`, `types.ts` — per-step validators, form/box types.

## Forests-rich additions (this pass) + GAPS
- **Create from JSON**: toolbar button beside "+ Add Forest" → dialog accepting
  the full `forest_create_payload.jsonc` shape. Parses (JSONC comments ok),
  shows a summary, then `forestUpsertFull(parsed)`.
- **Rich tabbed DETAIL view** for row "View" rendering every jsonb section.
- **Forest Edit**: from the detail view footer "Edit" → reopens the 2-step
  wizard prefilled (`id` ⇒ upsert UPDATE). (Quick wizard unchanged.)
- **GAP — missing client-core deps**: the brief said `api.forestUpsertFull`,
  `MapView`, `JsonImportField`, `KpiCard` already exist in client core. They do
  NOT in the current tree (grep clean). I own only `pages/Forests/**`, so I
  implemented self-contained local equivalents (`forestApi.forestUpsertFull`,
  `BoundaryMap`, `JsonImportField`, `detail/primitives.Stat`). Swap to the
  shared versions when they land and delete the local copies.
- **GAP — read-one hydration**: the forest LIST row carries only scalar columns
  + sponsor summaries, NOT the jsonb report columns. So row→View shows a
  populated Overview but the rich tabs read "No data" until a per-forest
  read-one GET hydrates the full jsonb record. `ForestDetailView` already takes
  a ready `FullForestPayload`, so wiring that loader is a one-line parent
  change. (openQuestions[2].)
- **GAP — upsert nested-field keys**: `forestUpsertFull` sends nested jsonb as
  JSON-string fields (mirroring the wizard's `boxes` serialization). The exact
  server field names/parse for the full payload weren't captured from a live
  trace — confirm against a real `/forest/upsert` capture.

## Confirmed
- **2-step wizard** (was 6) — Step 1 'Basic Info', Step 2 'Grid Config'. The
  earlier "1–6" was the forest LIST pagination behind the modal.
- **Grid Config fields**: Box Rows*, Box Column*, Box to Box Distance(ft)*,
  Tree Rows*, Tree Column*, Tree to Tree Distance(ft)*, Direction Angle*,
  Boundary Gap(ft)*, Pathway Spacing(ft)*, Project Site*, Project Period(years)*,
  Plantation Date* — all required.
- **Box grid + EditBoxDialog** — `Row R • Column C`, Capacity/Planted/Remaining,
  Prefix / Start Digits (default 1) / Start (auto-calc = prev box + 1) + species
  rows. Final action **Save Forest**.
- **upsert** write (`POST /forest/upsert`; no id = insert, id = update) running
  as the async `forest_upsert_v1` job. **Hard delete** (`POST /forest/delete
  {id, forest_id}`).
- Row actions **View / Edit / Delete**.
- Step footers: step 1 Cancel / Reset / Next →; step 2 ← Previous / Cancel /
  Reset / Save Forest.

## Open questions / TODOs (cited inline)
1. **Box payload + relation field NAMES** (`buildForestValues`,
   openQuestions[2]). We serialize `boxes` and `sponsor_ids` as JSON strings and
   send `site_manager_id` / `user_id` scalars — the most likely keys, but the
   live `/forest/upsert` body keys for these were not captured. Confirm against
   a real upsert network trace.
2. **Edit hydration** (`index.tsx rowToForm`, openQuestions[2]). The list
   endpoint returns scalars + sponsor summaries but NOT `site_manager_id`,
   `user_id`, or the per-box layout. Edit prefills only what the list exposes;
   wire a per-forest read-one fetch to fully hydrate those when its shape is
   confirmed.
3. **File uploads** (`AddForestWizard`, write_contracts.md). `/forest/upsert` is
   multipart when it carries file fields (dashboard/report images, permission
   letter). The confirmed 2-step wizard captures no file inputs, so we send the
   JSON body. Add `FileField`(s) + a `files` arg to `upsertEntity` when those
   uploads are in scope.
4. **Map is a keyless placeholder** (`LocationPicker`,
   components.MapLocationPicker). The live picker is a Google Maps embed with
   "Search location" autocomplete + draggable pin. We render a placeholder
   surface + required Latitude/Longitude inputs as the source of truth (offline,
   keyless, keyboard/SR-accessible). Drop in the Maps JS SDK + a `VITE_*` key to
   wire the real map; the manual inputs stay as a fallback.
5. **Oxygen/Carbon units** — column headers say "KT" but stored values look like
   raw numeric strings. We display the raw value with thousands separators; no
   unit conversion invented. Confirm the intended scale before adding a divisor.
6. **Role-scoped access** (flows "Role-scoped forest access", openQuestions[8]).
   SuperAdmin sees all forests; non-super Admin scoped via UserRoleForestAccess —
   inferred; not enforced in the UI here.

## Accessibility
- Stepper: ordered list; active step `aria-current="step"`; progress bar
  `role="progressbar"` with value/min/max.
- AutocompleteField (shared) implements the WAI-ARIA combobox pattern; species
  rows + pickers reuse it.
- EditBoxDialog is `role="dialog" aria-modal`, Escape-to-cancel, backdrop click
  cancels; box cards are real `<button>`s with descriptive aria-labels.
- All inputs use the shared labelled field components (error text via
  `aria-describedby`, `aria-invalid` on error).
- Responsive: list scrolls horizontally (DataTable); wizard grids collapse to
  one column; box grid uses `repeat(box_column, …)`; footers stack on mobile.
