# Reporting — spec mined from meetings + Loom product demos

Sources, all pulled 2026-06-20:
- **Monday AI Notetaker** (`tndwwt.monday.com`) — 8 call transcripts.
- **Loom** (shashank@tndwwt.org) — 6 screen-recording transcripts, saved in
  [`docs/transcripts/loom/`](transcripts/loom/). These are narrated walkthroughs of
  the **actual product the incumbent build team is building**, so they are the highest-fidelity source.

> **Big correction over the first draft of this doc.** The team's "report" is NOT a
> carbon table. It is a **~20-slide quarterly plantation-progress deck** (an explicit
> replacement for PowerPoint/Google Slides/Excel). Carbon and oxygen do not live in
> that deck — they live in the **per-sapling geotagging portal**. The buyer-facing
> deliverable is an **ESG / GRI-style impact report**, not a carbon-credit report.
> Everything below is re-grounded on the demo evidence.

---

## 0. Who is building what (context)

- **the incumbent build team** is building the BTH admin platform: forest
  creation, the quarterly report-deck generator, the geotag portal, certificates.
- The incumbent they are replacing is **"communitree" / communitree.co.in** (heard in
  the demos as "BeanTreeListing"). Goal: stop depending on it for tree numbering +
  certificates and own the whole stack.
- Our `communitree-rebuild` overlaps this heavily. So this doc doubles as (a) a build
  spec if we build the report, and (b) an audit checklist against the incumbent's version.

---

## 1. The three real deliverables

### A) Quarterly Forest Report — the ~20-slide deck (the main client/sponsor artifact)
Replaces PPT/Slides/Excel: *"whatever we were doing on PowerPoint, Google Slides, Excel
sheets… this would be our one stop solution"* [Demo 04:55]. Scale: *"180 forests, more
than 100 active, we are sending more than 100 reports every quarter"* [06:08].

Slide order, as demoed (`BTH-Product-Demo.txt`):
1. **Cover** — total saplings · quarter · location · "Initiated by community" (default) · sponsor logo [16:44]
2. **Logos** — up to **4** logos: initiated-by, sponsored-by, NGO/other, land-partner; headings editable [17:10]
3. **Contents** — auto-generated; skipped slides are excluded automatically [17:54]
4. **Land description** — location · landowner · total project area · status [18:35]
5. **Climate / conditions** — climate (per the report's quarter/season) · irrigation method · soil type [19:17]
6. **Permission letter** — mandatory upload · authorized-by · date · period [20:03]
7. **Area + population, satellite imagery** — total area · population density · 3 historical satellite images (drag-drop, e.g. 2020/2024/2026) [20:18]
8. **Population detail** — population in area · male · female · number of women · public vehicles [21:49] *(flagged too vague — must become zone/panchayat-wise [24:46])*
9. **Forest value / species** — auto-calculated forest value from species×counts · native species list [26:25]
10. **Summary (days)** — total days · working days · watering days (shown as "quarter" and "till-date") [27:10]
11. **Workforce contribution** — full-time gardeners/laborers · effort hours, colour-coded [29:13] *(currently mock numbers [30:51])*
12–13. **Plant growth** — height projection by year; split "till-date" + "quarterly" across 2 slides [31:57] *(currently mock; derive from sapling data later [57:12])*
14. **Soil pH** — image updated every quarter [35:00]
15. **Temperature inside plantation** — auto-captured at report time [35:36]
16. **Saplings phenology** — nesting · flowering · fruiting; tied to **GRI framework** [37:04]
17. **Site / infrastructure images** — 2 or 4 (the "4 walls") [37:04]
18. **Quarterly plantation photos Y1–Y3** — Q1=1, Q2=2, Q3=3, Q4=4 images; one slide per year; **36 images over 3 years** [38:31]
19. **Plantation progress / height** — photos · current height · site-layout image · pH · temp/humidity in+out · indicators · security [54:18]
20. **Dashboard** — hero image, swappable per quarter [55:07]

Authoring model: one-time setup (grid, species, fixed fields) by the projects team, then
**only one recurring page is entered each quarter** (the "Advanced Settings" page, to be
renamed) [56:18]. ~**30 min to fill one report** [Asim 459]. Partial/async entry via cron
so data can be added until complete [51:21]. Page-skip toggles include/exclude any slide [17:54].

### B) Geotagging portal — where carbon + oxygen actually live (per-client login)
Per-client portal (PNB, CGI, …): a map with a marker per forest; click a sapling pin →
**oxygen generated · carbon sequestered · total plants · age of plant · tree number ·
tree photo · lat/long** [66:11–68:32]. Photo refreshed every 3–6 months [65:07].
**Methodology caveat:** geotag uses **one box-centre point for all plants in a box**, not
a per-tree GPS fix [review 47:43] — carbon is effectively per-box, not per-tree.

### C) Tree certificates + gifting
Per-sapling certificate generated in-house (no incumbent dependency) [45:17]. Gifting via
**Excel bulk upload** (tree ID + recipient); **an empty recipient row deactivates that
certificate** [review 09:29]. Emailing the certificate is pending; provider chosen =
**Resend**, need the API key [review 42:11].

---

## 2. Time logic — quarterly, 3-year, but the quarter definition is UNSETTLED

- **3-year maintenance window** from plantation; a forest is **Active** while under
  maintenance and flips **Inactive** after 3 years (drop-down per forest with a start
  year) [Strategies 19:21]. Reports are produced **only for active/maintained clients** —
  one-time plantation (volunteering) clients get none [22:58].
- **Quarterly cadence**, 3-year span, e.g. `Q3'26 → Q4'26 → Q1'27 → … → Q4'27 → 28/29`
  [Monday BTH + quarter-logic 14:48].
- **OPEN DECISION (the team is still arguing this in the recordings):** what defines a
  quarter?
  - Indian **financial-year** quarters: *"starting of every quarter is from financial
    year starting… April is the first quarter"* [quarter-logic 11:54].
  - vs **plantation-date anchored**: *"it is not based on the plantation data — a
    corporate planted June 30th gets their first quarter report"* [12:16].
  - vs **calendar**: *"Jan to March will be considered as first quarter"* [Strategies 00:19].
  These three conflict across calls. **This is the #1 thing to pin down before building
  the quarter engine.**
- First report period legitimately has gaps (no growth/imagery yet) — handle empty states,
  never fake [quarter-logic 14:30; Asim 401].

---

## 3. The box-grid model (confirmed in detail)

Matches our existing box-grid memory. Forest → boxes (rows×cols) → trees per box
(rows×cols) → distance in feet · angle (default 90°, 45° later) · boundary gap. Example:
20×20 = **400 trees/box max** [42:05]. Per-species counts capped per box; species get ID
prefixes (AA/BB) today but that prefix is **being removed** for auto-count [Asim 22:29].
Open issue: boxes of mixed sizes (300 vs 400) and per-species coordinates need real box
data, not dummy values [Demo 14:55; Asim 248].

---

## 4. Audience + branding

- Audience named in practice = **sponsor / client** (CGI, Lenovo, HSBC, Goodera, PNB,
  IDFC, HCL, Legrand, Atlassian, Tata, WaterTech) and the **land partner**. HSBC/Goodera/
  Lenovo specifically asked for **population/social-impact** data [23:32]. No ESG-auditor
  or carbon-registry audience appears in any recording — the report is **CSR/ESG impact**,
  not credit issuance.
- Branding: up to 4 logos + editable headings; "Initiated by community" default; one extra
  unlabelled flexible logo slot [Strategies 12:25]. Every drop-down should have an
  **"Other" + free-text** so clients never wait on the team to add an option [Strategies 24:25].

---

## 5. Map to OUR `communitree-rebuild` build

| Their deliverable | Our status | Gap |
|---|---|---|
| **B) Geotag portal** — per-tree carbon/oxygen/age/photo on a map | ✅ `/map` + tree records, per-tree CO₂e **and** oxygen (we're per-tree, better than their per-box-centre) | none material; we're ahead |
| **C) Certificates + gifting** — per-tree cert, Excel bulk, empty-row deactivate, Resend email | ✅ `ReportTree.tsx` + gift recipient + Resend single/bulk | wire the **empty-row→deactivate** rule; set `RESEND_API_KEY` |
| **A) Quarterly 20-slide deck** | ❌ not built (we have snapshot `ReportSponsor`/`ReportForest`, carbon-centric) | **the whole deck generator** |
| Box-grid model | ✅ modelled (centimetre-exact placement) | matches |
| 3-year quarterly engine | ❌ | needs the quarter-definition decision first |

**Headline gap:** we built carbon-centric snapshot reports; the team's real artifact is a
quarterly **ESG plantation-progress deck**. Different shape, different data (workforce,
phenology, population, permission letters, satellite imagery, soil pH, photo grids).

---

## 6. Methodology / integrity notes (carry forward)

- Carbon stays **estimated / verification-ready**, never "credit." No Verra/Plan Vivo/
  registry language appeared; do not invent it.
- Geotag carbon is **per-box-centre**, not per-tree GPS — if we claim per-tree, we are
  more precise than the incumbent flow; keep that honest.
- "Forest value", workforce, and plant-growth in the demo are **mock numbers** today —
  whatever we surface must be real or labelled.

---

## 7. Recommended next step (decision needed — see chat)

Three ways to use this, pick one:
1. **Build the quarterly 20-slide deck generator** in `communitree-rebuild` (match/beat
   the incumbent build team). Big, but it's the actual money artifact.
2. **Stay in our lane** (per-tree carbon + public living-proof + certificates) and use this
   spec to **audit** the incumbent's deck instead of rebuilding it.
3. **Pin the quarter-definition decision first** (FY vs plantation vs calendar), wire the
   two quick wins we already 90% have (empty-row→deactivate, Resend key), then decide on 1 vs 2.

Two transcripts had no captions server-side (`045e51e0` "bth"; `2a4e627f` "BTH product
demo v1" — superseded by the full demo). Nothing else outstanding from Loom.
