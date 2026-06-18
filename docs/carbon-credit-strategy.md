# Linking each sapling to a carbon credit — strategy

Researched 2026 (6-agent swarm + synthesis). How a tree on our platform becomes a credible, sellable carbon credit, grounded in our existing data model (`forest_plant_timelines` visit log: per-tree DBH/height/status/photo/GPS monthly).

## The link (end to end)
1. **Measure** — each visit records DBH (stem diameter at 1.3 m) + height + status + photo + GPS.
2. **Biomass** — measured DBH/H/species → allometric equation: `AGB = 0.0673·(WD·DBH²·H)^0.976` (Chave 2014) or an Indian species equation.
3. **Whole-tree carbon** — `BGB = 0.24·AGB` (IPCC dry-tropical root:shoot); `(AGB+BGB)·0.47` carbon `·3.667` = kg CO₂e **stock** at that visit.
4. **Sequestration = stock change** — creditable amount is the **delta** between visits, tagged to a vintage year. Dead tree (status=Dead) freezes/reverses stock (our survival log does this).
5. **Aggregate** — tree → cohort → site → vintage → credit-ready batch (gross tCO₂e) across all sites.
6. **Discount** — −≥10% uncertainty, −15–20% buffer pool (permanence), −leakage (~0 for census). Net ≈ **70–75% of gross**.
7. **Issue** — a VVB audits the ledger+photos vs the methodology; the **registry** issues serial-numbered credits. 1 credit = 1 tCO₂e. Only now is a "credit" real.

**One surviving native tree ≈ 0.4–0.9 tCO₂e over 20 years** (a few kg in yrs 1–3). The credit is manufactured by **aggregating thousands**; our per-tree dMRV is what makes the aggregate auditable + premium-priced.

## Fix the methodology (our current math is indefensible)
`carbon_offset_per_day × age_days` is **linear** while real sequestration is an **S-curve** — it over-credits saplings, under-credits mid-life trees, and throws away the measured DBH we already store. No registry certifies a flat daily rate. Replace with the measured-allometry, stock-change pipeline above. Keep the linear rate only as a labelled "pre-measurement estimate" before a tree's first DBH reading.

## Recommended path (two-track)
- **Launch on Plan Vivo (PV Climate)** — lowest barrier, built for distributed smallholder/NGO plots, India precedent (Khasi Hills), ex-ante issuance (early cash), ≥60% community-revenue rule fits CommuniTREE. Lower price/liquidity.
- **Build the data product to Verra VM0047 (ARR, census-based) spec** — purpose-built for GPS-identified counted trees, ICVCM-approved (A-rated ~$24–40/t band). Our monthly DBH+photo+survival **exceeds** its monitoring minimum. Migrate/dual-list to Verra as volume grows.
- **NOT** India CCTS as the foreign path — domestic only (~$2–6/t), foreign sale largely blocked, requires start ≥ 1 Jan 2025, exclusivity (can't also be in Verra). Future domestic-buyer channel only.
- **Hard rule:** only **post-1-Jan-2025 plantings** are reliably creditable.

## Economics (the honest part)
- Price 2025-26: high-integrity Verra/GS ARR removals ~$22–24/t avg, A-rated up to ~$40–50; Indian projects ~$15–30/t = **5–10× domestic CCTS** (~$2–6/t).
- Net of haircuts ≈ 70–75% of gross sellable. Revenue per **mature** tree-year ≈ ₹9–30 gross; **near zero in yrs 1–3**; first issuance ~2–3 yrs out.
- A 10,000-tree forest nets only ~$1–3k/yr in carbon at maturity.
- **Conclusion: carbon is a credibility / premium-rating LAYER, not a standalone revenue engine.** B2C gifting (₹299–999) + B2B CSR (₹3–8/tree/mo) stay primary; carbon + per-tree dMRV lift them into the audit-grade premium band (B-rated $11 → A-rated $40).

## Data gaps to close (ranked)
1. **DBH ambiguity (biggest risk)** — `forest_plant_timelines.diameter` is a unitless number with no breast-height convention. If it's basal/canopy not DBH@1.3m, every carbon number is wrong + a VVB rejects it. Standardize to true DBH (cm) + measurement SOP + scale-reference card.
2. **No wood density** per species — add `wood_density` to master_plantspecies, populate ~96 species (Global Wood Density DB / ICFRE).
3. **No allometric equations/registry** — add `equation_id`/`allometry_family`/`small_stem_equation_id`/`source_citation`; map each species to a published Indian/South-Asian equation + a <10cm sapling equation (generic curves are ~40% off on saplings).
4. **No baseline/additionality** — historical satellite land-cover per site at start date; matched control plots / performance benchmark.
5. **No permanence apparatus** — per-site land-tenure/carbon-rights agreements (highest hard-fail risk on community/farmer land), 40-yr management+monitoring plan, configurable buffer %, AFOLU NPRT.
6. **No uncertainty stats** — 90% CI per batch + ≥10% deduction + independent re-measure QA.
7. **Fraud surface** — server-side EXIF/GPS validation, photo-hash dedup, append-only audit log, in-app-camera-only capture (pull forward from OIAS roadmap), optional Merkle anchor.
8. **Legacy cohort** — segment post-1-Jan-2025 registrable pool vs legacy marketing-only via `planting_date`.
9. **Indian legal/tax** — Section-8/for-profit SPV for carbon sales; foreign sales as export of services (FEMA, not FCRA); GST + 12A counsel; carbon-rights contracts BEFORE first sale.

## Build plan (platform)
1. **[S]** Standardize `diameter` → true DBH@1.3m (unit, method, SOP, scale card). *Everything depends on it.*
2. **[M]** Enrich master_plantspecies: wood_density + equation mapping for ~96 species + sapling equation.
3. **[M]** Per-tree append-only **carbon ledger** (row per visit: dbh, height, agb, bgb, C, tCO₂e stock, delta, vintage, equation_id, method_version); dead = freeze/reverse.
4. **[M]** Aggregation + **batch** layer (tree→cohort→site→vintage→batch; gross − buffer − uncertainty = net; registry-agnostic export).
5. **[S]** Eligible-cohort segmentation (`planting_date ≥ 2025-01-01`).
6. **[M]** Public **methodology/transparency** page tying every credit on /map back to its tree-ledger rows + photos. *The moat vs satellite-only platforms; the B→A rating lever.*
7. **[M]** Data-integrity hardening (EXIF/GPS validation, photo-hash dedup, audit log, sealed capture).
8. **[L]** Baseline + permanence package (satellite, control plots, tenure agreements, 40-yr plan, NPRT).
9. **[L]** Indian legal/tax structuring (SPV, FEMA, GST, carbon-rights).

## Founder decisions (see chat)
1. Registry first: **Plan Vivo → build to Verra** (rec).
2. Cohort: **post-2025 only** (rec).
3. Entity: **Section-8/SPV, export-of-services** (rec).
4. Develop: **hybrid — aggregator for first issuance, retain the dataset** (rec).
5. Marketing: **"estimated / verification-ready removals," never "credit" pre-audit** (rec).
