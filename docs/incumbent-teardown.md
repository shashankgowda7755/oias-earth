# Incumbent teardown — admin.bethetreehugger.co (corporate sponsor portal)

Clean-room recon 2026-06-18 via gstack /browse on a live PNB Housing login.
Observations only — no code, markup, or assets copied. Used as inspiration for
the communitree-rebuild "top 1%" target.

## What the login is
The portal is a **corporate sponsor view** (logged in as PNB Housing: "since
1988", pnbhousing.com, Industry Bank, HQ New Delhi). It is NOT the full
super-admin / planting back office. Planting, user mgmt, species mgmt and field
capture are elsewhere (separate superadmin or the field app).

## Information architecture (only 2 tabs)
- **Forest selector** (top-center dropdown "Select Forest", radio): this corporate
  has forests `PNB` and `PNB Housing Finance Limited` (site: ELCOT, Sholinganallur).
  Has a delete-forest control.
- **Dashboard tab**
  - 10 stat tiles (horizontal scroll): Oxygen generated `1,683.64 KT`, Carbon
    offset `931.00 KT`, Trees planted `10,800`, Species planted `8`, Average age
    `1.9 yrs`, Tree alive `10,800`, Trees drying `0`, Trees damaged `0`, Empty
    pits `0`, Trees dead `0`.
  - Left card: forest name + a chart that says **"No Data"** (empty/broken) +
    "Sponsored by" + sponsor logo.
  - Right: **Google Map** showing a SINGLE big sponsor-logo medallion at the
    forest location. Does NOT render individual trees.
- **Trees tab**
  - Paginated table, **Total Count 10,800** (1,080 pages × 10). Columns: Plant ID,
    Plant Name, Pet Name, Plant Species, Planted By, Planted On, Height (ft), Tree
    Dia (In), Age (Days), Oxygen Generated (Kgs), Carbon Offset (Kgs), Lat and
    Long, LandMark, Status, View(Details), Generate(QR Code).
  - Search box, **Download Data** (export), page-size combobox, deactivate-row
    (confirm dialog "Are you sure, would you like to deactivate?").
- **Tree Details** (modal): header pet name + ID + Alive badge + Share icon;
  Sponsored-by logo, Planted on/by, Lat-Long; **Gallery** (single photo); **Stats**
  tiles (height/dia/age/O₂/carbon); mini Google map. Static snapshot only.
- **QR Code** (modal): tree ID + QR image (scan → public tree page presumed).

## Their weaknesses (our openings)
1. **Map is a single logo blob.** 10,800 geotagged trees collapse to one medallion;
   no per-tree pins, no clusters, no satellite, no boundary, no NDVI. Geo data is
   trapped in a table column.
2. **Carbon/oxygen numbers are inflated + unit-confused.** "931.00 KT" carbon for
   10,800 young trees ≈ 86 t/tree — impossible. Linear `per-day × age` model
   (185.63 kg O₂ / 103.13 kg C for every Arjun regardless of real growth). No
   methodology page, no buffer, no uncertainty, not registry-aligned.
3. **Per-tree coords are synthetic spreads.** AA001–AA010 differ only in the 5th–6th
   decimal (~1 m apart, monotonic) = auto-spread from one point, not individually
   GPS-captured. Same trap our old `spreadTreeGeo` had.
4. **Tree page is a dead snapshot.** One photo, current stats only. No growth chart,
   no visit timeline, no survival history, no verification/integrity signals.
5. **"No Data" chart** on the flagship dashboard card — looks broken to a sponsor.
6. **No public living-proof surface** seen from here (portal is gated/per-corporate).

## What they do well (worth matching)
- Clean, calm green/white aesthetic; fast table; corporate profile card.
- **Logo medallion on the map** tied to the sponsor — strong brand moment (we already do this).
- **Pet Name** per tree (personalization / gift-tree emotional hook).
- **QR per tree** + **Share** per tree.
- **Health taxonomy**: Alive / Drying / Damaged / Empty pits / Dead.
- **Download Data** self-serve export for the sponsor's ESG team.
- Multi-forest selector per corporate.

## Where communitree-rebuild ALREADY beats it
- Public clustered satellite map (Esri) with sponsor-logo pins that expand to
  real per-tree positions + EUDR boundary polygon + area(ha) + NASA Worldview NDVI.
- TreeProof page: survival badge, growth chart, visit timeline, 3 verification
  badges (photo-unique / GPS-consistent / monitored), downloadable QR plaque.
- Scientific carbon: Chave-2014 allometry + real per-species wood density
  (GWD/ICRAF), root:shoot, 18% buffer + 10% uncertainty, anchored to Bitcoin
  (OpenTimestamps), public /carbon methodology page. Labelled "estimated /
  verification-ready", never "credit".
- Capture integrity (SHA-256 photo dedupe, geo-suspect flagging), offline field PWA.

## Top-1% gap (what to build/polish next, map-first per user ask)
- A genuinely interactive forest map: pin → tree, real per-tree capture (not
  spread), cluster counts, satellite + boundary + NDVI, sponsor medallion, the
  health-status color taxonomy on pins.
- Adopt their good hooks: Pet Name, per-tree Share, Download Data (we have ESG CSV).
- Beat their dead snapshot everywhere with our timeline + growth + verification.
- Keep the calm aesthetic but add the cinematic/living-instrument layer.
