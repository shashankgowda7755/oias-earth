/**
 * Flagship forest seed — ONE richly-monitored, geo-tagged forest so every public
 * surface (map, tree life-record, carbon, sponsor portal) shows real-shaped data
 * instead of a single demo tree.
 *
 *   node scripts/seed-flagship-forest.js          # insert
 *   node scripts/seed-flagship-forest.js --clean  # remove
 *
 * NOTE: this is SIMULATED monitoring data for demonstration. Measurements are
 * modelled growth curves, NOT field captures, and NO photographic evidence is
 * fabricated (integrity rule: never fake a record). Trees scatter inside a real
 * boundary polygon with an honest health distribution (some drying / dead).
 * All rows carry forest_unique_id 'FLAGSHIP-%' so they are trivially removable.
 * After running, execute scripts/build-carbon-ledger.js to populate carbon.
 *
 * Requires DATABASE_URL in env.
 */
const { Client } = require('pg');

const FOREST_UID = 'FLAGSHIP-TRY-A';
const SPONSOR_ID = 'eaadc2ee-f4d3-49be-8892-e52bdfdaa64b'; // IDFC First Bank (has a logo)

// ~200m x 200m block near Tiruchirappalli, Tamil Nadu (~4 ha). Axis-aligned, so
// uniform scatter in the lat/lng ranges always lands inside the boundary.
const LAT_MIN = 10.7941, LAT_MAX = 10.7959;
const LNG_MIN = 78.7091, LNG_MAX = 78.7109;
const CENTER_LAT = (LAT_MIN + LAT_MAX) / 2;
const CENTER_LNG = (LNG_MIN + LNG_MAX) / 2;
const BOUNDARY = [
  { lat: LAT_MIN, lng: LNG_MIN },
  { lat: LAT_MAX, lng: LNG_MIN },
  { lat: LAT_MAX, lng: LNG_MAX },
  { lat: LAT_MIN, lng: LNG_MAX },
];

const N_TREES = 220;
const PLANTED_ON = '2024-07-15';
const NOW_DAYS = 700; // age at the latest visit (≈ 2026-06)

// Species palette (id, common name, wood density g/cm3) — native-weighted.
const SPECIES = [
  { id: 14, name: 'Neem', wd: 0.68, w: 5 },
  { id: 17, name: 'Indian Beech', wd: 0.59, w: 4 },
  { id: 35, name: 'Arjun', wd: 0.74, w: 4 },
  { id: 13, name: 'Jamun', wd: 0.74, w: 4 },
  { id: 70, name: 'Teak', wd: 0.62, w: 3 },
  { id: 31, name: 'Mango', wd: 0.51, w: 3 },
  { id: 48, name: 'Shisham', wd: 0.77, w: 2 },
  { id: 45, name: 'Amaltas', wd: 0.71, w: 2 },
  { id: 19, name: 'Sirish', wd: 0.56, w: 2 },
  { id: 66, name: 'Bijasal', wd: 0.74, w: 1 },
];
const SPECIES_BAG = SPECIES.flatMap((s) => Array(s.w).fill(s));

const PETS = [
  "Aarav's tree", "Diya's tree", "In memory of Amma", "Our wedding tree",
  "Baby Vihaan", "Thatha's grove", "Class of 2024", "For Meera",
];

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Status mix: mostly healthy, a few drying/damaged/dead (honest).
function rollStatus() {
  const r = Math.random();
  if (r < 0.87) return 1; // Healthy
  if (r < 0.93) return 2; // Drying
  if (r < 0.96) return 3; // Damaged
  return 4; // Dead
}

// Growth curves (rough, young-sapling, per species + per-tree vigour).
function heightAt(ageDays, vigour) {
  return Math.round((0.6 + (ageDays / 365) * 1.55 * vigour) * 100) / 100; // m
}
function dbhAt(ageDays, vigour) {
  return Math.round((1.0 + (ageDays / 365) * 2.9 * vigour) * 10) / 10; // cm
}

async function clean(c) {
  await c.query(
    `DELETE FROM forest_tree_carbon_ledger WHERE forest_id IN (SELECT id FROM forests WHERE forest_unique_id LIKE 'FLAGSHIP-%')`,
  );
  await c.query(
    `DELETE FROM forest_plant_timeline_assets WHERE timeline_id IN (
       SELECT tl.id FROM forest_plant_timelines tl
       JOIN forest_trees ft ON ft.id = tl.plant_id
       JOIN forests f ON f.id = ft.forest_id WHERE f.forest_unique_id LIKE 'FLAGSHIP-%')`,
  );
  await c.query(
    `DELETE FROM forest_plant_timelines WHERE plant_id IN (
       SELECT ft.id FROM forest_trees ft JOIN forests f ON f.id = ft.forest_id
       WHERE f.forest_unique_id LIKE 'FLAGSHIP-%')`,
  );
  await c.query(
    `DELETE FROM forest_trees WHERE forest_id IN (SELECT id FROM forests WHERE forest_unique_id LIKE 'FLAGSHIP-%')`,
  );
  await c.query(
    `DELETE FROM forest_sponsors WHERE forest_id IN (SELECT id FROM forests WHERE forest_unique_id LIKE 'FLAGSHIP-%')`,
  );
  await c.query(`DELETE FROM forests WHERE forest_unique_id LIKE 'FLAGSHIP-%'`);
}

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  await clean(c);
  if (process.argv.includes('--clean')) {
    console.log('Removed FLAGSHIP forest + trees + timelines + ledger.');
    await c.end();
    return;
  }

  const f = await c.query(
    `INSERT INTO forests (forest_name, forest_unique_id, forest_desc,
        forest_geo_lat, forest_geo_long, forest_boundary,
        forest_city, forest_state, forest_country,
        plantation_date, plantation_strategy, irrigation_method, climate, soil_type,
        project_site, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'India',$9,'Grid','Drip','Tropical','Loam',$10,TRUE)
     RETURNING id`,
    [
      'Tiruchirappalli Living Proof Block A',
      FOREST_UID,
      'A 4-hectare native restoration block under continuous tree-by-tree monitoring.',
      CENTER_LAT.toFixed(6),
      CENTER_LNG.toFixed(6),
      JSON.stringify(BOUNDARY),
      'Tiruchirappalli',
      'Tamil Nadu',
      PLANTED_ON,
      'GNF Living Proof Site',
    ],
  );
  const forestId = f.rows[0].id;
  await c.query(
    `INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active) VALUES ($1,$2,TRUE)`,
    [forestId, SPONSOR_ID],
  );

  // Visit schedule (days after planting). Latest = NOW_DAYS.
  const VISIT_DAYS = [0, 240, 470, NOW_DAYS];
  const baseDate = new Date(PLANTED_ON + 'T00:00:00Z');
  const dateAt = (d) => {
    const dt = new Date(baseDate.getTime() + d * 86400000);
    return dt.toISOString().slice(0, 10);
  };

  let counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  let visitTotal = 0;

  for (let i = 1; i <= N_TREES; i++) {
    const sp = pick(SPECIES_BAG);
    const lat = rnd(LAT_MIN, LAT_MAX);
    const lng = rnd(LNG_MIN, LNG_MAX);
    const vigour = rnd(0.8, 1.25);
    const finalStatus = rollStatus();
    counts[finalStatus]++;
    const uid = `A${String(i).padStart(3, '0')}`;
    const petName = Math.random() < 0.3 ? pick(PETS) : null;

    // Dead trees stop being measured at the visit they died (2nd or 3rd).
    let deathVisit = -1;
    if (finalStatus === 4) deathVisit = Math.random() < 0.5 ? 2 : 3;
    const lastVisitIdx = deathVisit >= 0 ? deathVisit : VISIT_DAYS.length - 1;
    const ageNow = VISIT_DAYS[lastVisitIdx];
    const hNow = heightAt(ageNow, vigour);
    const dNow = dbhAt(ageNow, vigour);

    const t = await c.query(
      `INSERT INTO forest_trees (forest_id, master_plant_species_id, tree_unique_id,
          forest_tree_name, forest_tree_petname,
          forest_tree_height, forest_tree_dia, forest_tree_age,
          forest_tree_geo_lat, forest_tree_geo_long,
          planted_on, tree_status_id, sponsored_by, landmark,
          tree_url, is_display, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,TRUE,TRUE)
       RETURNING id`,
      [
        forestId, sp.id, uid, sp.name, petName,
        String(hNow), String(dNow), ageNow,
        lat.toFixed(6), lng.toFixed(6),
        PLANTED_ON, finalStatus, SPONSOR_ID, 'Block A',
        `/tree/${FOREST_UID}/${uid}`,
      ],
    );
    const treeId = t.rows[0].id;

    for (let v = 0; v <= lastVisitIdx; v++) {
      const age = VISIT_DAYS[v];
      const isLast = v === lastVisitIdx;
      // Status per visit: healthy until the final state shows up at the last visit.
      let statusId = 1;
      if (isLast && finalStatus !== 1) statusId = finalStatus;
      const h = heightAt(age, vigour);
      const d = dbhAt(age, vigour);
      await c.query(
        `INSERT INTO forest_plant_timelines (plant_id, species_id, status_id,
            height, diameter, age, latitude, longitude, timeline_date,
            dbh_unverified, dbh_method, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,FALSE,'tape',TRUE)`,
        [
          treeId, sp.id, statusId,
          h, d, age,
          (lat + rnd(-0.00002, 0.00002)).toFixed(6),
          (lng + rnd(-0.00002, 0.00002)).toFixed(6),
          dateAt(age),
        ],
      );
      visitTotal++;
    }
  }

  // Refresh the forest's cached rollups so the admin dashboard agrees.
  await c.query(
    `UPDATE forests SET
       total_trees = (SELECT COUNT(*) FROM forest_trees WHERE forest_id=$1 AND is_active=TRUE),
       total_species_planted = (SELECT COUNT(DISTINCT master_plant_species_id) FROM forest_trees WHERE forest_id=$1 AND is_active=TRUE),
       total_dead = (SELECT COUNT(*) FROM forest_trees WHERE forest_id=$1 AND is_active=TRUE AND tree_status_id=4),
       total_drying = (SELECT COUNT(*) FROM forest_trees WHERE forest_id=$1 AND is_active=TRUE AND tree_status_id=2),
       total_damaged = (SELECT COUNT(*) FROM forest_trees WHERE forest_id=$1 AND is_active=TRUE AND tree_status_id=3)
     WHERE id=$1`,
    [forestId],
  );

  console.log(`Flagship forest ${FOREST_UID} (${forestId})`);
  console.log(`  trees: ${N_TREES}  visits: ${visitTotal}`);
  console.log(`  status mix → healthy ${counts[1]}, drying ${counts[2]}, damaged ${counts[3]}, dead ${counts[4]}`);
  console.log('Next: node scripts/build-carbon-ledger.js');
  await c.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
