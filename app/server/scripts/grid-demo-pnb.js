/**
 * grid-demo-pnb — REAL end-to-end demo of the box-grid model on the PNB (Chennai)
 * forest. 4 corners → 30 exact tagged trees → a 360 scene → 30 AUTO-PLACED
 * hotspots (yaw/pitch computed from the camera pose, no manual clicking).
 *   node grid-demo-pnb.js          # build
 *   node grid-demo-pnb.js --clean  # remove (prefix GRID-B1-)
 */
const { Client } = require('pg');
const R = 6378137, d2r = (d) => d * Math.PI / 180, r2d = (r) => r * 180 / Math.PI;
const SP = (ft) => ft * 0.3048;
function dest(lat, lng, brg, dist) {
  const br = d2r(brg), la1 = d2r(lat), lo1 = d2r(lng), dr = dist / R;
  const la2 = Math.asin(Math.sin(la1) * Math.cos(dr) + Math.cos(la1) * Math.sin(dr) * Math.cos(br));
  const lo2 = lo1 + Math.atan2(Math.sin(br) * Math.sin(dr) * Math.cos(la1), Math.cos(dr) - Math.sin(la1) * Math.sin(la2));
  return { lat: r2d(la2), lng: r2d(lo2) };
}
function bearing(a, b, c, d) {
  const y = Math.sin(d2r(d - b)) * Math.cos(d2r(c));
  const x = Math.cos(d2r(a)) * Math.sin(d2r(c)) - Math.sin(d2r(a)) * Math.cos(d2r(c)) * Math.cos(d2r(d - b));
  return (r2d(Math.atan2(y, x)) + 360) % 360;
}
function distM(a, b, c, d) {
  const dla = d2r(c - a), dlo = d2r(d - b);
  const h = Math.sin(dla / 2) ** 2 + Math.cos(d2r(a)) * Math.cos(d2r(c)) * Math.sin(dlo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const lerp = (a, b, t) => ({ lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t });

const PNB_UID = 'PNB-PNB36';
const PREFIX = 'GRID-B1-';
const SPECIES_ID = 35, SPECIES_NAME = 'Arjun'; // Terminalia Arjuna
const ROWS = 6, COLS = 5;                       // 30 saplings
const IMG = '/panoramas/forest-slope-360.jpg';

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const f = await c.query(`SELECT id, forest_geo_lat, forest_geo_long FROM forests WHERE forest_unique_id=$1`, [PNB_UID]);
  if (!f.rowCount) { console.error('PNB forest not found'); process.exit(1); }
  const fid = f.rows[0].id;

  // clean prior demo
  await c.query(`UPDATE scene_links SET is_active=FALSE WHERE from_scene_id IN (SELECT id FROM forest_scenes WHERE forest_id=$1 AND label LIKE 'PNB Grid%')`, [fid]);
  await c.query(`UPDATE scene_hotspots SET is_active=FALSE WHERE scene_id IN (SELECT id FROM forest_scenes WHERE forest_id=$1 AND label LIKE 'PNB Grid%')`, [fid]);
  await c.query(`UPDATE forest_scenes SET is_active=FALSE WHERE forest_id=$1 AND label LIKE 'PNB Grid%'`, [fid]);
  await c.query(`DELETE FROM scene_hotspots WHERE tree_id IN (SELECT id FROM forest_trees WHERE forest_id=$1 AND tree_unique_id LIKE '${PREFIX}%')`, [fid]);
  await c.query(`DELETE FROM forest_trees WHERE forest_id=$1 AND tree_unique_id LIKE '${PREFIX}%'`, [fid]);
  if (process.argv.includes('--clean')) { console.log('Removed GRID-B1 demo.'); await c.end(); return; }

  // 4 corners anchored at PNB centre (a real square/rect on the ground)
  const TL = { lat: Number(f.rows[0].forest_geo_lat), lng: Number(f.rows[0].forest_geo_long) };
  const TR = dest(TL.lat, TL.lng, 90, SP(COLS - 1));         // +4ft east
  const BL = dest(TL.lat, TL.lng, 180, SP(ROWS - 1));        // +5ft south
  const BR = dest(BR0(), 0, 0, 0); function BR0() { const e = dest(TL.lat, TL.lng, 90, SP(COLS - 1)); const s = dest(e.lat, e.lng, 180, SP(ROWS - 1)); return [s.lat, s.lng]; }

  // bilinear grid -> 30 exact coords
  const trees = []; let n = 1;
  for (let r = 0; r < ROWS; r++) {
    const v = r / (ROWS - 1);
    for (let col = 0; col < COLS; col++) {
      const u = col / (COLS - 1);
      const top = lerp(TL, TR, u), bot = lerp(BL, { lat: BR0()[0], lng: BR0()[1] }, u), p = lerp(top, bot, v);
      trees.push({ uid: `${PREFIX}${String(n).padStart(3, '0')}`, lat: +p.lat.toFixed(7), lng: +p.lng.toFixed(7) });
      n++;
    }
  }

  // insert real tagged trees
  for (const t of trees) {
    await c.query(
      `INSERT INTO forest_trees (forest_id, master_plant_species_id, tree_unique_id, forest_tree_name,
          forest_tree_geo_lat, forest_tree_geo_long, planted_on, tree_status_id, tree_url, is_display, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,'2025-07-01',1,$7,TRUE,TRUE)`,
      [fid, SPECIES_ID, t.uid, SPECIES_NAME, String(t.lat), String(t.lng), `/tree/${PNB_UID}/${t.uid}`],
    );
  }
  // map uid -> id
  const ids = await c.query(`SELECT id, tree_unique_id, forest_tree_geo_lat lat, forest_tree_geo_long lng FROM forest_trees WHERE forest_id=$1 AND tree_unique_id LIKE '${PREFIX}%'`, [fid]);

  // camera: 2.5 m south of box centre, facing NORTH (heading 0 = panorama front)
  const centre = { lat: (TL.lat + BL.lat) / 2, lng: (TL.lng + TR.lng) / 2 };
  const cam = dest(centre.lat, centre.lng, 180, 2.5);
  const CAM_H = 1.6, HEADING = 0;
  const scene = await c.query(
    `INSERT INTO forest_scenes (forest_id, label, image_url, lat, lng, default_yaw, default_pitch, display_order, is_demo)
     VALUES ($1,'PNB Grid Block B1 (real grid demo)',$2,$3,$4,0,-10,0,TRUE) RETURNING id`,
    [fid, IMG, cam.lat, cam.lng],
  );
  const sceneId = scene.rows[0].id;

  // AUTO-PLACE hotspots: yaw = bearing(cam->tree) - heading ; pitch = look-down angle
  let placed = 0;
  for (const row of ids.rows) {
    const tlat = Number(row.lat), tlng = Number(row.lng);
    const brg = bearing(cam.lat, cam.lng, tlat, tlng);
    const yaw = ((brg - HEADING) % 360 + 360) % 360;
    const dist = Math.max(0.5, distM(cam.lat, cam.lng, tlat, tlng));
    const pitch = Math.max(-80, Math.min(-3, -r2d(Math.atan2(CAM_H, dist))));
    await c.query(`INSERT INTO scene_hotspots (scene_id, tree_id, yaw, pitch) VALUES ($1,$2,$3,$4) ON CONFLICT (scene_id,tree_id) DO NOTHING`,
      [sceneId, row.id, +yaw.toFixed(2), +pitch.toFixed(2)]);
    placed++;
  }
  console.log(`PNB forest ${fid}`);
  console.log(`  trees inserted: ${trees.length} (${PREFIX}001..${PREFIX}0${trees.length})`);
  console.log(`  scene id ${sceneId} @ camera ${cam.lat.toFixed(6)},${cam.lng.toFixed(6)} facing N`);
  console.log(`  hotspots AUTO-placed: ${placed} (yaw/pitch computed from grid, zero manual clicks)`);
  console.log(`  sample: ${ids.rows[0].tree_unique_id} -> yaw/pitch from camera`);
  await c.end();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
