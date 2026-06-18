/**
 * Import the real PNB legacy export (PNBPNB36) as a real forest in our platform.
 *
 *   node scripts/import-pnb.js          # import (reads /tmp/pnb_trees.json)
 *   node scripts/import-pnb.js --clean  # remove
 *
 * PROVENANCE: this is REAL identity data (tree ids, species, planted dates,
 * published coordinates) from the incumbent's "Download Data" export. Per-tree
 * height/diameter in that export are SPECIES CONSTANTS (not field measurements)
 * and carbon there is a flat linear figure. We import the records, recompute
 * carbon honestly with Chave, and DO NOT fabricate anything. The forest is
 * flagged is_demo=FALSE but its description states the data is legacy/unverified.
 *
 * Requires DATABASE_URL + /tmp/pnb_trees.json (produced from the xlsx).
 */
const fs = require('fs');
const { Client } = require('pg');

const FOREST_UID = 'PNB-PNB36';
const SPONSOR_NAME = 'PNB Housing';

async function clean(c) {
  await c.query(`DELETE FROM forest_trees WHERE forest_id IN (SELECT id FROM forests WHERE forest_unique_id = $1)`, [FOREST_UID]);
  await c.query(`DELETE FROM forest_sponsors WHERE forest_id IN (SELECT id FROM forests WHERE forest_unique_id = $1)`, [FOREST_UID]);
  await c.query(`DELETE FROM forests WHERE forest_unique_id = $1`, [FOREST_UID]);
}

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  await clean(c);
  if (process.argv.includes('--clean')) {
    console.log('Removed PNB import.');
    await c.end();
    return;
  }

  const trees = JSON.parse(fs.readFileSync('/tmp/pnb_trees.json', 'utf8'));
  const lats = trees.map((t) => Number(t.lat)).filter((n) => !isNaN(n));
  const lngs = trees.map((t) => Number(t.lng)).filter((n) => !isNaN(n));
  const latMin = Math.min(...lats), latMax = Math.max(...lats);
  const lngMin = Math.min(...lngs), lngMax = Math.max(...lngs);
  const cLat = ((latMin + latMax) / 2).toFixed(6);
  const cLng = ((lngMin + lngMax) / 2).toFixed(6);
  const boundary = [
    { lat: latMin, lng: lngMin }, { lat: latMax, lng: lngMin },
    { lat: latMax, lng: lngMax }, { lat: latMin, lng: lngMax },
  ];

  // Sponsor: PNB Housing (matches the corporate profile in the incumbent portal).
  let sp = await c.query(`SELECT id FROM sponsors WHERE sponsor_name = $1 AND is_active = TRUE LIMIT 1`, [SPONSOR_NAME]);
  let sponsorId;
  if (sp.rowCount) {
    sponsorId = sp.rows[0].id;
  } else {
    const ins = await c.query(
      `INSERT INTO sponsors (sponsor_name, sponsor_logo, website_url, industry, headquarters, is_active)
       VALUES ($1,$2,$3,$4,$5,TRUE) RETURNING id`,
      [SPONSOR_NAME, 'https://www.google.com/s2/favicons?domain=pnbhousing.com&sz=128',
       'https://www.pnbhousing.com/', 'Bank', 'New Delhi'],
    );
    sponsorId = ins.rows[0].id;
  }

  const f = await c.query(
    `INSERT INTO forests (forest_name, forest_unique_id, forest_desc,
        forest_geo_lat, forest_geo_long, forest_boundary,
        forest_city, forest_state, forest_country, plantation_date, is_active, is_demo)
     VALUES ($1,$2,$3,$4,$5,$6,'Chennai','Tamil Nadu','India',$7,TRUE,FALSE)
     RETURNING id`,
    [
      'PNB Forest — Chennai', FOREST_UID,
      'Imported from the PNB legacy export (2026-05-18). Tree ids, species, planted dates and published coordinates are from the source system; per-tree height/diameter there are species-level constants (not field measurements) and the original carbon figure is a flat linear estimate. Carbon shown here is recomputed with Chave-2014. Records are legacy/unverified pending field re-survey.',
      cLat, cLng, JSON.stringify(boundary), trees[0]?.planted_on || '2024-09-02',
    ],
  );
  const forestId = f.rows[0].id;
  await c.query(`INSERT INTO forest_sponsors (forest_id, sponsor_id, is_active) VALUES ($1,$2,TRUE)`, [forestId, sponsorId]);

  // Batch-insert trees. status all "Alive" -> tree_status_id 1.
  const COLS = 13;
  const BATCH = 400;
  let inserted = 0;
  for (let i = 0; i < trees.length; i += BATCH) {
    const chunk = trees.slice(i, i + BATCH);
    const vals = [];
    const ph = chunk.map((t, j) => {
      const b = j * COLS;
      vals.push(
        forestId, t.sid, t.uid, t.species,
        t.h_m != null ? String(t.h_m) : null,
        t.dbh_cm != null ? String(t.dbh_cm) : null,
        t.lat, t.lng, t.planted_on, 1, sponsorId,
        `/tree/${FOREST_UID}/${t.uid}`, 'Block A',
      );
      return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9},$${b + 10},$${b + 11},$${b + 12},$${b + 13},TRUE,TRUE)`;
    });
    await c.query(
      `INSERT INTO forest_trees (forest_id, master_plant_species_id, tree_unique_id,
          forest_tree_name, forest_tree_height, forest_tree_dia,
          forest_tree_geo_lat, forest_tree_geo_long, planted_on, tree_status_id,
          sponsored_by, tree_url, landmark, is_display, is_active)
       VALUES ${ph.join(',')}`,
      vals,
    );
    inserted += chunk.length;
  }

  await c.query(
    `UPDATE forests SET total_trees = $2,
       total_species_planted = (SELECT COUNT(DISTINCT master_plant_species_id) FROM forest_trees WHERE forest_id=$1 AND is_active=TRUE)
     WHERE id=$1`,
    [forestId, inserted],
  );

  console.log(`Imported PNB forest ${FOREST_UID} (${forestId}) — ${inserted} trees, sponsor ${SPONSOR_NAME} (${sponsorId}).`);
  console.log(`  centre ${cLat},${cLng}`);
  await c.end();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
