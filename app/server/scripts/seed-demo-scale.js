/**
 * Demo data: ~100 forests (50 around Bangalore + spread across TN/Karnataka),
 * round-robin linked to the 3 sponsors, to show how the map clusters at scale.
 *
 *   node scripts/seed-demo-scale.js          # insert demo forests
 *   node scripts/seed-demo-scale.js --clean  # remove them
 *
 * All rows use forest_unique_id 'DEMO-...' so they are trivially removable and
 * never collide with real forests. Requires DATABASE_URL in env.
 */
const { Client } = require('pg');

const SPONSORS = [
  'eaadc2ee-f4d3-49be-8892-e52bdfdaa64b', // IDFC First Bank
  '64904581-84c8-440c-a313-b14b167f480b', // Acuity
  'f5786b29-cd96-40aa-abc4-3628cfd99f5e', // Kishore Forest
];

const CITIES = [
  { name: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946, n: 50, jit: 0.09 },
  { name: 'Chennai', state: 'Tamil Nadu', lat: 13.04, lng: 80.21, n: 18, jit: 0.11 },
  { name: 'Coimbatore', state: 'Tamil Nadu', lat: 11.0168, lng: 76.9558, n: 8, jit: 0.08 },
  { name: 'Madurai', state: 'Tamil Nadu', lat: 9.9252, lng: 78.1198, n: 7, jit: 0.08 },
  { name: 'Mysuru', state: 'Karnataka', lat: 12.2958, lng: 76.6394, n: 7, jit: 0.08 },
  { name: 'Salem', state: 'Tamil Nadu', lat: 11.6643, lng: 78.146, n: 5, jit: 0.06 },
  { name: 'Tiruchirappalli', state: 'Tamil Nadu', lat: 10.7905, lng: 78.7047, n: 5, jit: 0.06 },
];

async function main() {
  const clean = process.argv.includes('--clean');
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  await c.query(
    `DELETE FROM forest_sponsors WHERE forest_id IN (SELECT id FROM forests WHERE forest_unique_id LIKE 'DEMO-%')`,
  );
  await c.query(`DELETE FROM forests WHERE forest_unique_id LIKE 'DEMO-%'`);
  if (clean) {
    console.log('Removed all DEMO forests.');
    await c.end();
    return;
  }

  const jit = (base, j) => (base + (Math.random() * 2 - 1) * j).toFixed(6);
  let total = 0;
  let k = 0;
  for (const city of CITIES) {
    const code = city.name.slice(0, 3).toUpperCase();
    for (let i = 1; i <= city.n; i++) {
      const id = await c.query(
        `INSERT INTO forests (forest_name, forest_unique_id, forest_geo_lat, forest_geo_long,
            forest_city, forest_state, forest_country, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,'India',TRUE) RETURNING id`,
        [
          `${city.name} Grove ${i}`,
          `DEMO-${code}-${i}`,
          jit(city.lat, city.jit),
          jit(city.lng, city.jit),
          city.name,
          city.state,
        ],
      );
      await c.query(
        `INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active) VALUES ($1,$2,TRUE)`,
        [id.rows[0].id, SPONSORS[k % SPONSORS.length]],
      );
      k++;
      total++;
    }
  }
  console.log(`Inserted ${total} demo forests (${CITIES[0].n} in ${CITIES[0].name}).`);
  await c.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
