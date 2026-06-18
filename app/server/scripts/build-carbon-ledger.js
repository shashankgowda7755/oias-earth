/**
 * Backfill the carbon ledger from existing visits (forest_plant_timelines).
 * Idempotent (ON CONFLICT timeline_id DO NOTHING). Same Chave-2014 math as
 * src/lib/carbon.ts. Run once after migration 007:
 *   node scripts/build-carbon-ledger.js
 */
const { Client } = require('pg');

const agb = (wd, d, h) => (wd > 0 && d > 0 && h > 0 ? 0.0673 * Math.pow(wd * d * d * h, 0.976) : 0);

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const rows = (
    await c.query(
      `SELECT tl.id, tl.plant_id, ft.forest_id, ft.master_plant_species_id AS species_id,
              tl.timeline_date, tl.height, tl.diameter, tl.status_id, sp.wood_density
         FROM forest_plant_timelines tl
         JOIN forest_trees ft ON ft.id = tl.plant_id
         LEFT JOIN master_plantspecies sp ON sp.id = ft.master_plant_species_id
        WHERE tl.is_active = TRUE
        ORDER BY tl.plant_id, tl.timeline_date ASC NULLS LAST, tl.id ASC`,
    )
  ).rows;

  const prev = new Map();
  let n = 0;
  for (const r of rows) {
    const wd = r.wood_density != null ? Number(r.wood_density) : 0.6;
    const h = r.height != null ? Number(r.height) : null;
    const d = r.diameter != null ? Number(r.diameter) : null;
    const dead = r.status_id === 4;
    const p = prev.get(r.plant_id) || 0;
    const a = !dead && h != null && d != null ? agb(wd, d, h) : 0;
    const bgb = 0.24 * a;
    const carbon = (a + bgb) * 0.47;
    const co2e = dead ? p : a > 0 ? carbon * 3.667 : p;
    const vintage = r.timeline_date ? Number(String(r.timeline_date.toISOString?.() ?? r.timeline_date).slice(0, 4)) : null;
    await c.query(
      `INSERT INTO forest_tree_carbon_ledger
         (tree_id, timeline_id, forest_id, species_id, measured_at, dbh_cm, height_m,
          status_id, wood_density, agb_kg, bgb_kg, carbon_kg, co2e_kg, co2e_delta_kg,
          vintage_year, method_version, dbh_unverified)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'v1-chave2014',TRUE)
       ON CONFLICT (timeline_id) DO NOTHING`,
      [r.plant_id, r.id, r.forest_id, r.species_id, r.timeline_date, d, h, r.status_id, wd, a, bgb, carbon, co2e, co2e - p, vintage],
    );
    prev.set(r.plant_id, co2e);
    n++;
  }
  console.log(`Processed ${n} visits into the carbon ledger.`);
  await c.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
