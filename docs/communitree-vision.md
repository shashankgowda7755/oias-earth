# COMMUNITREE — Living Proof Venture (vision + build status)

Working title: **COMMUNITREE** · Brand: **COMMUNITREE** (https://communitree.co.in/)
Source: venture blueprint v1, 2026-06-11.

## Thesis
Competitors sell a **birth certificate** (geotag + certificate at planting). This
product maintains a **life record**: longitudinal, independently verifiable proof
a tree is still alive. Built as an independent product; afforestation orgs are tenants.

## Architecture (3 layers)
1. **Capture** — field app, in-app camera only; GPS + EXIF + device id sealed at
   capture; planter-signed; offline-first; duplicate/tamper detection.
2. **Verify** — photos <100KB → Arweave (free tier); monthly Merkle root anchored
   on Polygon (paise per batch); optional soulbound token per tree; quarterly
   satellite/NDVI cross-check.
3. **Experience** — owner tree page (growth timeline), CSR survival dashboard,
   public verify-any-tree registry, on-site QR plaques.

## Revenue engines (one verified dataset)
- **A · B2C gifting** ₹299–999 / tree.
- **B · B2B CSR** ₹3–8 / tree / month (BRSR/ESG audit exports).
- **C · White-label SaaS** for other NGOs / event firms.
- **D · Carbon-ready dMRV** (slowest; do not lead with it).

## Guardrails
- Build **clean-room**; do not fork the licensed incumbent codebase.
- **Paper before pixels**: platform IP = new entity; tenant owns its data/brand;
  reimbursement ≠ ownership.
- **Integrity is the brand**: publish dead trees too; one faked record kills it.
- **Vocabulary**: "permanent verified record / living proof / tamper-proof
  timeline". Avoid "NFT"/"crypto" in consumer/CSR contexts. No tradable tokens.

## Build status (on communitree-rebuild.vercel.app)
| Piece | Status |
|---|---|
| Per-tree geo-tagging (admin) — GPS / tap-map / manual | ✅ shipped |
| Public live forest map `/map` (no login, drill-down to trees) | ✅ shipped |
| Persistent DB (Neon Postgres) + live API | ✅ shipped |
| Map basemap | OSM (keyless). Google tiles/satellite = needs user's own GCP key |
| Arweave permanent storage | ⏳ roadmap |
| Polygon Merkle anchoring | ⏳ roadmap |
| Field capture app (sealed EXIF, planter-signed) | ⏳ roadmap |
| Satellite/NDVI cross-check | ⏳ roadmap |
| CSR dashboard / public survival index | ⏳ roadmap |
| Carbon-standard data alignment | ⏳ roadmap |
