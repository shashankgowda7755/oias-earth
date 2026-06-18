# Plan — Interactive 360° Hotspot Forest (Street-View-style tour)

## Vision (user)
Turn a forest into a navigable 360° experience. Capture the whole site as multiple
360 photos (scenes). The visitor moves between scenes like Google Street View. Each
sapling (~100) gets a HOTSPOT pinned on the panorama; clicking it opens that tree's
module (life record: photos, growth, carbon, status). Fully interactive — move
around, click any tree, see its proof.

## Build-on (already shipped this session)
- `@photo-sphere-viewer/core` + `PanoViewer.tsx` (single equirect, lazy-loaded, WebGL + flat fallback).
- `forest_panoramas` (per-forest embed/image), SponsorPortal "Walk the forest" section.
- Per-tree `/tree/:id` (TreeProof) records; `forest_trees` with geo + status.
- PSV official plugins fit exactly: **MarkersPlugin** (hotspots) + **VirtualTourPlugin** (multi-scene nav graph).

## Data model (migration 014)
- `forest_scenes` — one 360 capture point: id, forest_id, label, image_url
  (self-host `/panoramas/...` or https equirect), lat, lng (optional, for map + GPS nav),
  default_yaw, default_pitch, sphere_correction (pan/tilt/roll), display_order, is_active, created_at.
- `scene_links` — navigation between scenes (the "move here" arrows): id, from_scene_id,
  to_scene_id, yaw, pitch, label. (Street-View hop.)
- `scene_hotspots` — a tree pinned on a panorama: id, scene_id, tree_id (FK forest_trees),
  yaw, pitch, label, is_active. Click → `/tree/:tree_id`.

## API
- public `GET /public/forest/:id/scenes` → { scenes:[{id,label,image_url,default_yaw,default_pitch,
  links:[{to,yaw,pitch,label}], hotspots:[{tree_id,yaw,pitch,tree_unique_id,species,status}]}] }.
  Drives the whole tour in one fetch. Image URLs validated by existing `isAllowedPanoUrl`.
- admin (assertForestAccess): CRUD scenes / links / hotspots. Hotspot + link placement =
  admin clicks the panorama in an editor → PSV returns yaw/pitch → save.

## Frontend
- `ForestTour.tsx` — PSV core + MarkersPlugin + VirtualTourPlugin, all DYNAMIC-imported
  (zero initial-bundle cost, same pattern as PanoViewer). Renders scenes, nav arrows
  (links), tree markers (hotspots). Click tree marker → mini-card → "Open life record"
  → `/tree/:id` (or in-tour drawer). Loading + empty + no-WebGL flat fallback states.
- Entry: a "Explore the forest in 360°" CTA on the sponsor portal + a dedicated
  `/forest/:id/tour` route (full-screen, shareable).
- Admin tour editor (in the forest Geo-tagging tab or a new "360 Tour" tab): add scene
  (paste/upload image), click-to-place tree hotspots (search tree → drop pin), draw nav
  links between scenes, set default view.

## Capture workflow
Planter shoots 360 at N positions across the site (phone Street View app / Theta /
Insta360) → uploads each as a scene image → admin places tree hotspots + links in the
editor. ~100 saplings tagged across the scenes.

## Scope / phasing
- v1: scenes + tree hotspots + nav links + viewer + admin editor (manual yaw/pitch).
- defer: GPS auto-projection of tree lat/lng onto the panorama (needs capture heading);
  VR/cardboard mode; ambient audio; auto-tour autoplay.

## Risks / open
- Storage at scale: each scene 2–4 MB; many scenes × many forests → needs object storage
  (R2 / Vercel Blob) — the existing deferred storage gap. v1 self-host a few in `/public`.
- Hotspot accuracy: manual placement is exact; GPS auto-projection is the hard part (deferred).
- Bundle: PSV plugins lazy-loaded (no initial hit).
- Integrity: a tour of generic/sample panoramas must be labelled sample, like the existing 360.

---

# REVIEW OUTCOME (/autoplan, 4-lens, Claude dual-voice — Codex 402 all session)

**Verdict: NO-GO as written; CONDITIONAL-GO on a reduced demo v1.** Weighted 3.6/10
(CEO 3.2, UX 5, Eng 4, DX 3). The PSV plugin choice is sound; the plan is killed by
one codebase-confirmed fact and over-scoped against the June-18 "phase-4, only if
retention moves" decision.

## Hard blocker (all 4 lenses)
**No object storage exists.** App = one Vercel serverless fn; uploads → ephemeral
`UPLOADS_DIR`; this is the SAME root cause as the live photo-404 bug. Hosting 2-4 MB
panorama bytes reproduces it. → v1 uses **external HTTPS equirect URLs only**
(`isAllowedPanoUrl` already accepts them); self-hosted bytes wait for a separate
storage workstream (which also fixes the photo bug).

## User-direction challenges (the review pushes back)
- **"100 hotspots on one panorama"** = unclickable dot-cloud + ~50 min admin labor +
  untested MarkersPlugin perf. → spread ~5-15/scene, cap render ~30/scene + count
  badge + searchable list.
- **"click any tree, see its proof" (precision)** = manual yaw/pitch is best-effort,
  drifts on re-crop/zoom; no GPS→panorama projection. Never call it survey-grade in
  CSR/Verra docs.
- **Full viewer + nav-graph + admin editor** = phase-2 build mislabelled phase-4.
  Ship a 1-forest curated demo, measure retention, THEN earn the editor.

## Revised v1 (recommended)
1 flagship forest, 3-5 scenes, 5-15 hotspots/scene. External HTTPS equirect URLs.
Migration 014 (`forest_scenes` + `scene_hotspots`; defer `scene_links`). Public
`GET /public/forest/:id/scenes` (field-whitelisted) + `fetchForestScenes()`.
`ForestTour.tsx` = PSV core + MarkersPlugin (lazy), LINEAR prev/next nav, marker →
in-tour drawer → "View full proof" /tree/:id. Loading/empty/error + no-WebGL
tree-list fallback. Data hand-loaded by eng (SQL) — NO web editor in v1. `is_demo`
banner. Accessibility (button hotspots, ARIA, keyboard) + retention instrumentation.

## Must-fix before build
Decide storage (→ external URLs v1); migration 014 idempotent w/ FK NOT NULL +
UNIQUE(scene,tree) + CHECK(yaw/pitch); single nested scenes payload, field-whitelisted;
harden `isAllowedPanoUrl` with scheme denylist (reject data:/javascript:/file:);
MarkersPlugin TEXT mode only (no innerHTML); validate tree belongs to forest; demo banner.

## Deferred
Object storage + presigned upload (own workstream, also fixes photo-404); admin web
editor (after thesis proven + wireframes); VirtualTourPlugin scene-graph + `scene_links`;
GPS→panorama auto-projection; sphere_correction / free-text label / VR / audio / autoplay.
