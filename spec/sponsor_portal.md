# Sponsor Portal (role = Admin, forest-scoped) — live inspection (read-only)

Same app + URL as the SuperAdmin admin (`admin.bethetreehugger.co`), but the UI is **completely different per role**. Inspected as `pnb_admin` (Punjab National Bank sponsor). NO edits made — navigation + screenshots only.

## Role & scope
- `role` = **Admin** (not SuperAdmin). Profile id `c2b4db01-…`, userId 203.
- Scoped via `UserRoleForestAccess` to a SINGLE forest: forestName **PNB**, forestUniqueId `PNBPNB36`, forestId `7e214f4f-…`. This confirms the role-based forest scoping inferred in the main spec (resolves that openQuestion). A sponsor only sees their own forest(s); a forest selector ("PNB ▾") in the header switches between them if more than one.
- Data layer: this portal is **GraphQL-driven** (PostGraphile `/graphql`), unlike the SuperAdmin portal which uses the REST `/api/v1/<entity>/list` endpoints. On load it pulls a large (~1.6MB) GraphQL response (all trees + geo for the map).

## Shell
- Header: COMMUNITREE leaf + "Be The Tree Hugger" (left), forest selector "PNB ▾" (center), sponsor logo avatar w/ dropdown (right).
- Tabs: only **Dashboard** and **Trees** (vs 6 tabs for SuperAdmin). No management tabs (no Users/Sponsors/Employees/Reports/Jobs).
- Co-branded: PNB sponsor logo shown alongside COMMUNITREE.

## Screen: Dashboard (geo + impact reporting)
- KPI cards row: **Oxygen generated** (1,678.75 KT), **Carbon offset** (928.30 KT), **Trees planted** (10,800), **Species planted** (8), **Average age** (1.9 yrs), **Tree alive** (10,800), **Trees drying** (0). Each with an icon.
- Left panel: forest name "PNB", a hero image (here "No Data" placeholder), "Sponsored by" + sponsor logo.
- Right panel: **Google Map** (the keyed Maps JS API) centered on the forest (Perumbakkam/Sholinganallur, Chennai) with the forest/tree marker(s); "Open this area in Google Maps" link; camera controls.

## Screen: Trees (geo-tagging register)
- Toolbar: **Search** + **Download Data** (export — report download; client-side via xlsx/jsPDF or an export endpoint).
- Table columns: **Plant ID** (e.g. AA001), **Plant Name** (Arjun), **Pet Name**, **Plant Species** (Terminalia Arjuna), **Planted By**, **Planted On** (14/03/2024), **Height (ft)**, **Tree Dia (In)**, **Age (Days)** (823), **Oxygen Generated (Kgs)** (185.18), **Carbon Offset (Kgs)** (102.88), **Lat and Long** (12.908741, 80.21537…).
- Footer: Total Count 10800, Rows per page 10, pagination 1 … 1080 (server-side via GraphQL connection, scoped to the forest's trees).
- Read-only: no Add/Edit/Delete; the only actions are Search, Download, paginate. (Matches the user's note: "mainly geo tagging and reporting, no edit.")

## Implication for the rebuild
This is a second, role-gated front-end on the same backend:
- Route by `role`: SuperAdmin -> 6-tab management portal; Admin/sponsor -> Dashboard+Trees portal scoped by UserRoleForestAccess.
- New pieces vs current rebuild: KPI cards, a Google-Map forest/tree view, a forest selector, the geo-tagged Trees register (GraphQL `forestTrees` connection filtered by forestId, with oxygen/carbon/age/lat-long), and a Download/export action.
- The Trees data shape maps to the `forest_trees` table (treeUniqueId, forestTreeName, species, plantedOn, height/dia/age, oxygen/carbon, geo lat/long) already in the data model.
