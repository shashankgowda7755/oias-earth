# CommuniTREE → GRI Mapping Spec

**Purpose:** map every data point CommuniTREE already captures to the GRI disclosure it
satisfies, so forest reports and sponsor exports can be GRI-aligned without inventing data.

**Target standards (2026 reporting):**
- **GRI 1: Foundation 2021** + **GRI 2: General Disclosures 2021** + **GRI 3: Material Topics 2021** (Universal)
- **GRI 101: Biodiversity 2024** — *live standard, effective 1 Jan 2026. Replaces the retired GRI 304.*
- **GRI 305: Emissions 2016** — current.

> **Honesty rule.** CommuniTREE CO₂ figures are **estimated, verification-ready removals**, not
> issued carbon credits. GRI permits disclosing estimates *with a methodology note*. Never label
> them "credits" in a GRI context. Removals are disclosed as ecosystem-service / supplementary
> context, NOT as a GRI 305-1/2/3 emissions reduction.

---

## 1. Material topics (GRI 3-2)

For a tree-restoration operator the material topics are:
1. **Climate / GHG removals** → GRI 305 (+ ecosystem services)
2. **Biodiversity** → GRI 101: Biodiversity 2024
3. **Local livelihoods / community** → GRI 413 (future; data partial)

Everything below maps to topics 1 and 2 (the defensible CSR story today).

---

## 2. Climate — GRI 305: Emissions 2016

| GRI code | Disclosure | CommuniTREE source | Status |
|---|---|---|---|
| 305-5 (context) | Reduction of GHG emissions | n/a — we *remove*, not reduce operational emissions | reframe as removal |
| **Removals (supplementary)** | Estimated CO₂e sequestered | `agbKg` → `CARBON_FRACTION` → ×`CO2_PER_C`, grossed by `ROOT_SHOOT`; method tag `CARBON_METHOD` (`lib/carbon.ts`) | ✅ computed per tree |
| Methodology note | Required alongside any estimate | `CARBON_METHOD` constant + allometric basis | ✅ have it |
| 305-1 / 305-2 / 305-3 | Scope 1/2/3 operational emissions | **not tracked** (nursery, transport, irrigation pumping) | ❌ gap — mark "not yet measured" |

**Disclosure line (report-ready):**
> *Estimated cumulative CO₂e removal: X t (allometric, root:shoot {ROOT_SHOOT}, C-fraction
> {CARBON_FRACTION}). Estimate, verification-ready — not issued credits. Method: {CARBON_METHOD}.*

---

## 3. Biodiversity — GRI 101: Biodiversity 2024

| GRI 101 code | Disclosure | CommuniTREE source | Status |
|---|---|---|---|
| 101-2 | Management of biodiversity impacts | plantation strategy, species selection, monitoring cadence | ✅ |
| 101-4 | Identification of biodiversity impacts | site location, plantation_date, baseline land use | ⚠️ baseline land-use not stored explicitly |
| 101-5 | Locations with biodiversity impacts | forest geo / digipin / address / area | ✅ |
| 101-6 | Direct drivers of biodiversity loss being addressed | degraded-land restoration framing | ⚠️ qualitative only |
| **101-7** | **Changes to the state of biodiversity** | survival ring %, species count, tree count over quarters, monitoring photos | ✅ strongest disclosure |
| **101-8** | **Ecosystem services** | carbon sequestration (regulating service), canopy/soil — qualitative | ✅ partial; carbon = quantified |
| 101-1 / 101-3 | Policy to halt loss / access & benefit-sharing | org-level policy + community model | ⚠️ narrative, not in DB |

> Cross-ref for sponsors still on old terms: 101-5≈304-1, 101-7≈304-3, species list≈304-4.

---

## 4. Water — GRI 303 (gap)

- Only `irrigation_method` captured; **no water volume**.
- Decision: either add a `water_used_litres` field per visit, **or** declare 303 *not material*
  for rain-fed/low-irrigation sites (defensible for most CommuniTREE forests).

---

## 5. Org context — Universal (GRI 2)

| GRI 2 code | Source | Status |
|---|---|---|
| 2-1 Organizational details | CommuniTREE org + OIAS Earth | ✅ |
| 2-6 Activities, value chain | forest/sponsor model | ✅ |
| 2-28 Membership associations | n/a | — |
| 2-29 Stakeholder engagement | sponsors, planters, monitoring | ✅ |
| Audit trail (assurance support) | `audit_log` (logins + mutations) | ✅ strong for assurance |

---

## 6. Gap summary (what to add for full alignment)

| Gap | GRI hit | Effort | Recommendation |
|---|---|---|---|
| Operational Scope 1/2/3 | 305-1/2/3 | high | disclose "not yet measured"; phase later |
| Water volume | 303 | low | add field OR declare not-material |
| Baseline land-use | 101-4 | low | add one field at forest creation |
| Policy / ABS narrative | 101-1/101-3 | none (copy) | org-level boilerplate, not per-forest |

**Verdict:** CommuniTREE can produce a **defensible GRI 101 (biodiversity) + GRI 305 (removal
context)** disclosure *today* from existing data. 101-7 (state change via survival ring + species
+ photos) and quantified CO₂ removal are the two strongest, sponsor-ready disclosures.

---

## Phase 2 / 3 (not built yet)

- **P2:** GRI-aligned impact block in `ReportForestQuarterly` — codes 101-5, 101-7, 101-8, 305 removal + methodology note. Reuses computed carbon + survival data.
- **P3:** per-sponsor aggregate GRI content-index export (PDF) across all sponsored forests.
</content>
</invoke>
