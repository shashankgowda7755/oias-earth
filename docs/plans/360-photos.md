# Plan — 360° panoramas as living proof

> **DECISION (2026-06-18, /autoplan): APPROVED with reframe.**
> Build order: (1) persistent object storage + presigned upload — fixes the live
> `/tmp` photo-404 bug; (2) fixed-point repeat-photo **time-slider** ("watch it
> grow") on a new public `/forest/:id` page; (3) keep widening the moat (DBH /
> ledger / NDVI); (4) **360 deferred** to a curated flagship add-on, greenlit only
> if the slider moves CSR retention. The 360-specific sections below are the
> deferred phase-4 spec; phases 1-2 are the active work.
> **BLOCKER:** phase 1 needs a storage backend + credentials (user action).

## Problem
Today a tree's proof is a flat photo per visit. Sponsors and the public can't
*feel* the forest, and a single frame can't show a canopy closing over time. The
incumbent has exactly one flat photo per tree — beatable.

## Proposal
Add **360° panoramas at the plot/forest level, captured at each monitoring
visit**, displayed as an immersive viewer with a **time-slider** that compares the
same spot across visits ("watch the forest grow"). Per-forest, NOT per-tree.

## Scope (v1)
- Capture: field PWA gains a "360 capture" path — upload a panorama (equirectangular
  JPEG) taken with a phone pano app or a 360 cam (Insta360 / Ricoh Theta). GPS +
  timestamp + planter sealed at capture, same integrity as photos.
- Storage: panoramas (5–20 MB) go to **object storage** (S3-compatible / R2), NOT
  Vercel `/tmp`. Store URL + sha256 + capture metadata.
- Data: new asset kind `pano360` on `forest_plant_timeline_assets` (or a forest-level
  `forest_panoramas` table keyed by forest_id + visit date + lat/lng + heading).
- Viewer: lazy-loaded Photo Sphere Viewer / Pannellum (code-split chunk, loads only
  when a panorama is opened — must not regress the bundle trim).
- Display: forest page + `/portal` get a "Walk the forest" panorama with a visit
  time-slider; the public map forest popup links to it.
- Integrity: real in-field captures only; no fabricated demo spheres. is_demo
  forests show none rather than fake ones.

## Non-goals (v1)
- Per-tree 360 (overkill for a sapling).
- In-browser 360 stitching / capture (use existing camera apps).
- VR headset mode, Matterport-style mesh, drone orthomosaics.

## Dependencies / risks
- **Object storage must exist first** — this is the gating dependency (also needed
  for the vision's Arweave layer). Without it, v1 cannot ship.
- Mobile upload of 10–20 MB on field connectivity → need resumable/queued upload +
  client-side downscale.
- Viewer + image weight must stay lazy so the homepage stays ~88 KB gz.

## Success
A sponsor opens their forest, drags a slider, and sees the same plot greener at
each visit — verifiable, dated, GPS-anchored. One artifact no competitor has.

---

## /autoplan REVIEW REPORT (2026-06-18)
Voices: 4 independent Claude lenses (CEO, Design, Eng, DX). Codex unavailable
(402 deactivated_workspace) → **subagent-only**.

### CONSENSUS TABLE
| Dimension | Verdict |
|---|---|
| Right scope (per-plot-per-visit)? | DISAGREE → reframe (see User Challenge) |
| Right *medium* (360 vs repeat-photo)? | All lenses: time-slider is the magic, 360 is the canvas |
| Architecture sound as written? | NO — `/tmp` upload already broken in prod |
| Serves the carbon/dMRV thesis? | NO — engagement feature, not proof |
| Capture path viable today? | NO — 10MB multer cap rejects 5-20MB spheres |
| Integrity preserved? | Only if panos excluded from photo-badge logic + is_demo suppressed |

### CRITICAL — discovered live bug (independent of 360)
`api/index.js` writes uploads to `/tmp/uploads`, served by `express.static`
(`index.ts:41`). On Vercel `/tmp` is per-invocation + ephemeral → **existing
visit photos 404 after any cold start, and sha256 dedupe (008) is defeated on
cold start (recycled photos not flagged).** This is broken in production NOW.
Object storage is the prerequisite for BOTH this fix and 360.

### Architecture consensus (Eng lens)
- **Storage: Cloudflare R2** (S3-compatible, zero egress — panos are hammered by
  the public). Arweave = anchor the sha256 only, never store bytes (no deletion /
  right-to-erasure on Arweave; a sphere can capture a face/plate).
- **Upload: presigned direct browser→R2.** Vercel caps request bodies ~4.5MB; the
  bytes must never transit the function. Commit `{key, sha256, heading}` after PUT.
- **Data model: extend `forest_plant_timeline_assets` with `type='pano360'` +
  `metadata jsonb`** (heading/fov/cam). NOT a new table (would fork the integrity
  layer). Migration 013, idempotent. Add a CHECK/enum on `type`.

### Design consensus (4/10 as written)
- Home = a NEW public `/forest/:id` page (mirror `/tree/:id`); panorama is its hero.
  `/portal` + map popup link to it, don't embed.
- Specify states: LQIP preview + **tap-to-load gate** (protect mobile data),
  WebGL/error fallback to flat frame, mobile scroll-trap fix (contained card).
- Time-slider: handle the 1-visit case; **stepped + heading-locked** across dates.
  **Split/swipe compare > dissolve** (alignment-tolerant, more credible). Dissolve
  needs exposure+heading normalization field phones won't deliver → skip v1.

### DX consensus (biggest risk = silent-success lie)
- `Field.tsx` `save()` shows "Saved offline — will sync" even on QuotaExceeded /
  failed upload → planter believes proof exists when it doesn't. Fix feedback
  honesty (real progress %, per-item queue status, explicit quota/failure).
- IndexedDB queue rewrites the whole array per capture (`queue.ts:27`) → 20MB
  panos = quota bomb. Key per capture; client-downscale to ~3-5MB before enqueue.
- Hardware: cheap 360 cam (Theta SC2 / Insta360) + ONE supervised first capture.
  TTHW today ~8-15min w/ high failure → target <90s, >95% first-try.

### CEO verdict: reframe + resequence
1. Object storage as a first-class infra milestone (justified by photos + Arweave,
   NOT by 360). Fixes the live bug above.
2. Fixed-point repeat photography + time-slider on FLAT photos — ~90% of the
   "watch it grow" emotion at ~5% cost, any field phone, composes with dMRV.
3. Keep widening the real moat (DBH standardization → ledger → NDVI cross-check).
4. 360 = later curated add-on on 3-5 flagship sponsor forests, greenlit only if
   the slider demonstrably moves CSR retention.
