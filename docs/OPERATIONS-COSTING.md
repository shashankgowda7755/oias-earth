# Field Operations & Unit Economics — geo-tagging 100k trees (Chennai / Bangalore / Hyderabad)

Decoded 2026-06-20 from 4 parallel research passes (sourced). Goal: a deliverable + a
cost-per-tree that beats the incumbent (₹3–5/tree) while we profit. Client resells at ₹50.

## 0. The reframes that matter
1. **360 is PER PLOT, not per tree.** You cannot 360-capture 100k trees. Two capture streams:
   per-tree = 1 phone photo + GPS; per-plot = a handful of 360 spheres that link into a tour.
2. **₹3–7 is PER CYCLE (per revisit), not per year.** Incumbent ₹3–5 = one light pass (GPS + 1
   photo + a manual PDF; no 360, no live platform). Quarterly = bill it 4×.
3. **Labour ÷ throughput ≈ 70% of cost.** It is the whole game. Everything else is rounding.

## 1. Capture kit (one-time, trivial vs labour)
- **Per-tree photo (~100k/cycle):** cheap dual-band-GNSS Android (₹12–18k) + **GPS Map Camera**
  app (EXIF GPS, 2–3 s lock, ~3–5 m). The workhorse. 1 phone per field person.
- **Per-plot 360:** **Ricoh Theta X (~₹38k)** — the only consumer 360 with **built-in GPS +
  true in-camera auto-stitch** → one tap = geotagged, stitched sphere, **no laptop**. One camera
  shared across the project (not per person). ~30–60 s/sphere, ~8–12 spheres/site.
- **Drone: SKIP.** It makes aerial orthomosaics (wrong deliverable), and DGCA type-cert +
  per-flight airspace permission in all 3 metros (airport yellow zones) is a poison pill. Offer
  only as a paid add-on, outsourced to a licensed local operator.
- Kit total ≈ **₹38k (Theta) + ₹16k × #phones** — amortizes to **<₹0.30/tree/cycle**. Irrelevant.

## 2. Edit → stitch → pointer → render
- **Stitching: none.** Camera auto-stitches. PTGui/Hugin not needed (only DSLR rigs need them).
- **The "pointer" (hotspot): AUTOMATE it from GPS.** We already have `grid-geo.js` (`dest()` +
  `haversine()`) + per-tree GPS + the `{tree_id, yaw, pitch}` hotspot shape (`TourEditor` writes
  it, `ForestTour` renders it). Compute `bearing(cameraGPS→treeGPS) → yaw`, `atan2(Δheight,
  dist) → pitch`. ~30 lines reusing existing code. One **drag-to-calibrate heading** per sphere
  fixes the only accuracy gap. → manual ~30 min/plot becomes **~6 min/plot**; a 100k cycle's
  editing drops **~250 hr → ~50 hr**, and **quarterly re-shoots are near-free** (recompute from
  GPS; tree UUIDs are stable).
- **"Delete/edit" = version per cycle.** Add `cycle`/`captured_on` to scenes (soft-delete already
  exists). Keep old cycles → the "walk the same plot across 3 years" timeline = the moat.
- **Ingest at scale:** `exifr` (auto-match photo→nearest tree by EXIF GPS) + `sharp` (→WebP,
  <100 KB). 100k images compress in minutes.
- **Storage: move to Cloudflare R2** (zero egress) from Vercel Blob (egress kills you at 100k
  served images). Real cost ≈ **₹100–500/month**, not lakhs. R2 is S3-compatible → thin swap.
- **MCP / off-the-shelf: none for hotspot auto-place** (domain-specific — we build the ~30-line
  bulk endpoint). WebODM (free) only if drone ortho is ever needed.

## 3. Operating model — LOCAL CREWS, never a travelling crew
Throughput planning number: **~250 trees/person/day** (band 200–300) → **~400 person-days /
100k cycle**. (DERIVED, not measured — validate with a 1-day pilot before bidding.)

| Per 100k cycle | A · one travelling crew | **B · local crews per city** |
|---|--:|--:|
| Travel + lodging/per-diem | ₹5.36 L (mostly lodging) | ₹0.76 L |
| **Cost / tree / cycle (direct hire)** | **₹11.82** | **₹6.11** ✅ |

Local crews win by **~₹4.6 L/cycle** (lodging is paying people to live away ~6 weeks) AND enable
**parallel capture across 3 cities** — the only way to finish inside a quarter. Quarterly (4×/yr)
is feasible **only** with parallel local crews; semi-annual is easy.

## 4. Unit economics — cost/tree/cycle (full deliverable)
| Driver | LOW (bad) | MID (real) | HIGH (at-scale) |
|---|--:|--:|--:|
| Labour (wage ÷ throughput) | 15.00 | 5.71 | 2.40 |
| Travel | 3.00 | 1.00 | 0.30 |
| Gear + storage + edit + overhead | 6.30 | 2.25 | 0.68 |
| **TOTAL ₹/tree/cycle** | **24.30** | **8.96** | **3.38** |

- Full package (GPS+photo+360+platform) fits ₹3–7 **only at HIGH efficiency (~₹3.38)**.
- **Biggest lever = census vs sample.** CRISIL-style 15–25% sample → field cost ÷4–6 → **₹1.5–2/
  tree/cycle**. Decide this first.
- Cadence: cost/tree/yr ≈ cost/cycle × cycles. ₹3–7 **per year** at quarterly = structural loss.

## 5. The wedge + pricing
Incumbent ₹3–5 hides a **manual ₹3–8/tree report cost**. Our platform auto-generates hotspots,
reports, certificates, carbon, sharing at **~₹0** → **same price, ~5× the product.**

3 levers to reach HIGH efficiency: **(1) automation** (platform kills manual cost), **(2) local
crews** (kill travel), **(3) batch dense plots** (max throughput).

| Tier | Per-cycle deliverable | Cadence | Cost | **Price** | Margin | ₹/tree/yr |
|---|---|---|--:|--:|--:|--:|
| Basic | GPS + photo + live platform listing | annual | 3.10 | **₹4** | 22% | 4 |
| **Standard ⭐** | + quarterly + dashboard + auto-carbon + certificate + sharing | quarterly | 3.38 | **₹6** | 44% | 24 |
| Premium | + 360 tour + audit-grade carbon + branded certs + sponsor proof | quarterly | 5.20 | **₹7** | 26% | 28 |

**Recommendation:** lead **Standard @ ₹6/tree/cycle quarterly** (matchable price, 5× value; client
keeps ~₹26/tree ≈ 52% on their ₹50 resale). Fall back to **Basic @ ₹4** if hard-anchored to
incumbent pricing (still beats them — even Basic has the live platform they lack). Make 360 a
**Premium** add (stitch labour blows the ₹7 ceiling on scattered sites). **Protect:** price ₹6/7
conditional on **clustered-plot routing + full 100k volume**; scattered/low-volume = MID (≥₹12) or decline.

## 6. Validate before bidding (one number rules everything)
Run a **1-day pilot in one dense Chennai plot**: count trees/worker/day. Every figure above
scales linearly off that. Then lock census-vs-sample + cadence.

## 7. Platform build actions (small, high-leverage)
1. `computeHotspots(cameraGPS, heading, trees[])` + bulk "auto-place" button in TourEditor (reuse `grid-geo.js`).
2. `scene.lat/lng/heading` + `cycle/captured_on` columns; cycle dropdown in the tour viewer.
3. `exifr` ingest (photo→tree GPS match) + `sharp` compression.
4. Migrate object storage → Cloudflare R2 (the storage helper already abstracts this).

---

## LOCKED CONFIG (client brief 2026-06-20): census · quarterly · hire crews
User chose the rigorous setup: **every tree captured every cycle · every 3 months (4×/yr) · no
existing field presence → recruit local crews per city** (storage handled by user). This is the
*premium* tier — cost it honestly, then price.

### The operation, end to end (per city)
1. **Recruit + train (one-time per city, ~1 wk):** hire 4–8 local field staff via a manpower
   agency (no inter-city travel — they live there). Half-day training: the capture app, GPS lock,
   framing, the waypoint walk. Cost amortized over cycles.
2. **Capture (the field cycle):** 2-role teams —
   - **Tree photographer:** walks rows, 1 GPS-stamped photo/tree (~250 trees/day).
   - **360 walker:** walks each site path, one Theta-X sphere every ~100 m → a continuous
     waypoint chain (1 km ≈ 10 spheres). ~100–150 spheres/day. (~5–10% of total labour.)
3. **Upload:** end of day over WiFi/4G → cloud (your storage).
4. **Process (office, automated):** ingest → EXIF-GPS auto-matches each photo to its tree →
   auto-place all hotspots from GPS → 1 person drags-to-set-north per sphere + spot-QA.
5. **Publish:** new cycle goes live on the platform; previous cycle retained (the timeline).
6. **Repeat** every 3 months. Re-shoots reuse the same GPS → hotspots recompute free.

### Stitching / processing pipeline (what tool does what)
- **Stitch:** NONE manually. Theta-X auto-stitches in-camera → finished equirectangular JPG. (No
  PTGui/Hugin — those are only for DSLR rigs.)
- **Per-tree photos:** `exifr` reads GPS from each photo → match to nearest tree; `sharp`
  compresses to WebP (<100 KB).
- **The "pointer" (hotspot):** computed, not clicked. `bearing(sphereGPS→treeGPS)→yaw`,
  `atan2(Δheight,dist)→pitch` (reuse `grid-geo.js`). The "→ next waypoint" arrow = bearing to the
  next sphere's GPS. One drag-to-set-north per sphere fixes orientation. → ~50 hrs/100k cycle, not 250.
- **Render:** the platform (Leaflet aerial hub + Pannellum/PSV 360 walk + tree cards) — built.

### Cost for THIS config (census 100k, quarterly, hired local crews)
Throughput **250 trees/day** (validate first — see below) → **~400 field person-days + ~40 for
360 = ~440 pd/cycle**.

| Line / cycle | Ramp (agency labour ₹1,200/day) | Steady-state (direct ₹800/day) |
|---|--:|--:|
| Field + 360 labour | ₹5,28,000 | ₹3,52,000 |
| Local transport to sites | ₹66,000 | ₹66,000 |
| Equipment (amortized) | ₹20,000 | ₹20,000 |
| Edit/QA (automated) | ₹25,000 | ₹25,000 |
| Recruit/train (amortized) | ₹30,000 | ₹15,000 |
| + spoilage 8% + management 15% | → | → |
| **TOTAL / cycle** | **~₹8.3 L** | **~₹5.9 L** |
| **₹ per tree per cycle** | **~₹8** | **~₹6** |
| **× 4 (quarterly) = ₹/tree/YEAR** | **~₹33** | **~₹24** |

- **No inter-city travel** because crews are hired local (the ₹11.82 travelling-crew model is
  avoided even though there's no prior presence — you recruit, not commute).
- Year-1 sits near the **agency (₹8)** end during ramp; converts toward **direct (₹6)** as you
  stabilize crews. Plan **₹6–8/tree/cycle → ₹24–33/tree/yr**.

### The pitch number
- **₹3–7 is almost certainly the incumbent's PER-CYCLE rate for a LIGHTER job** (sample or
  annual, no 360, no live platform). Your locked scope (census + quarterly + 360 + platform +
  carbon) is a *premium* product, not the incumbent's commodity pass.
- **Recommended pitch: ₹7/tree/cycle (= ₹28/tree/yr quarterly)** for the full premium. You're at
  the top of the incumbent's per-cycle band but delivering ~5× (continuous 360 walk + live map +
  carbon + certificates + sharing they cannot match). Margin: thin in year-1 ramp, healthy at
  steady-state (₹6 cost).
- If the client is hard-anchored to ₹3–5: **don't do census-quarterly at that price** (you'd lose
  money). Offer the *lighter* tier at that price (semi-annual or 15–25% sample, GPS+photo+platform,
  360 as paid add-on) and reserve census+quarterly+360 for ₹7.

### Validate before quoting EXACT (one number rules all)
Run a **1-day pilot in one dense Chennai plot**: measure real trees/photographed/day. Every rupee
above scales linearly off it. Also count **km of path per site** → number of 360 spheres → confirm
the 360 labour line. Then the ₹/tree is exact, not estimated.
