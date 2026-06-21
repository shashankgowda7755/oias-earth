/**
 * pnb-room-36 — clean single-scene 360 for PNB: a 5m × 5m planted room with a
 * 6×6 grid = 36 trees, camera at the CENTRE so every pin is close + visible
 * (no horizon blob). Removes the prior LP- demo (1000 trees / 2 scenes) and the
 * RM- set, then rebuilds RM- fresh. Auto-placed hotspots, one per plant.
 *
 *   node pnb-room-36.js          # build
 *   node pnb-room-36.js --clean  # remove (prefix RM-)
 *
 * Needs DATABASE_URL (Neon). Same-origin /panoramas image — no Blob.
 */
const { Client } = require('pg');
const R = 6378137, d2r = (d) => d * Math.PI / 180, r2d = (r) => r * 180 / Math.PI;
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

const PNB_UID = 'PNB-PNB36';
const PREFIX = 'RM-';
const SPECIES_ID = 35, SPECIES_NAME = 'Arjun';
const N = 6;             // 6 x 6 = 36 trees
const ROOM_M = 5;        // 5 m square room
const SPACING = ROOM_M / N; // ~0.83 m → fills the 5 m room evenly
const CAM_H = 1.6;       // camera eye height (m)
const IMG = '/panoramas/pnb-360-scene-a.jpg';

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const f = await c.query(`SELECT id, forest_geo_lat, forest_geo_long FROM forests WHERE forest_unique_id=$1`, [PNB_UID]);
  if (!f.rowCount) { console.error('PNB forest not found'); process.exit(1); }
  const fid = f.rows[0].id;

  // wipe the prior LP- (1000 trees, scenes 7/8) AND any prior RM-
  for (const pfx of ['PNB Living Proof%', 'PNB Planted Room%']) {
    await c.query(`DELETE FROM scene_links WHERE from_scene_id IN (SELECT id FROM forest_scenes WHERE forest_id=$1 AND label LIKE $2)`, [fid, pfx]);
    await c.query(`DELETE FROM scene_hotspots WHERE scene_id IN (SELECT id FROM forest_scenes WHERE forest_id=$1 AND label LIKE $2)`, [fid, pfx]);
    await c.query(`DELETE FROM forest_scenes WHERE forest_id=$1 AND label LIKE $2`, [fid, pfx]);
  }
  for (const pfx of ['LP-%', 'RM-%']) {
    await c.query(`DELETE FROM scene_hotspots WHERE tree_id IN (SELECT id FROM forest_trees WHERE forest_id=$1 AND tree_unique_id LIKE $2)`, [fid, pfx]);
    await c.query(`DELETE FROM forest_trees WHERE forest_id=$1 AND tree_unique_id LIKE $2`, [fid, pfx]);
  }
  if (process.argv.includes('--clean')) { console.log('Removed LP- and RM- demos.'); await c.end(); return; }

  // camera = forest centre; trees on a 6×6 grid CENTRED on the camera.
  // offsets symmetric around 0 so no tree sits on the camera: -2.08..+2.08 m
  const cam = { lat: Number(f.rows[0].forest_geo_lat), lng: Number(f.rows[0].forest_geo_long) };
  const offs = [];
  for (let i = 0; i < N; i++) offs.push((i - (N - 1) / 2) * SPACING); // e.g. -2.08,-1.25,-0.42,0.42,1.25,2.08

  const trees = []; let n = 1;
  for (const dy of offs) {        // north/south metres
    for (const dx of offs) {      // east/west metres
      // place by moving east then north from camera
      const e = dest(cam.lat, cam.lng, 90, dx);
      const p = dest(e.lat, e.lng, 0, dy);
      trees.push({ uid: `${PREFIX}${String(n).padStart(3, '0')}`, lat: +p.lat.toFixed(7), lng: +p.lng.toFixed(7) });
      n++;
    }
  }

  for (const t of trees) {
    await c.query(
      `INSERT INTO forest_trees (forest_id, master_plant_species_id, tree_unique_id, forest_tree_name,
          forest_tree_geo_lat, forest_tree_geo_long, planted_on, tree_status_id, tree_url, is_display, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,'2025-07-01',1,$7,TRUE,TRUE)`,
      [fid, SPECIES_ID, t.uid, SPECIES_NAME, String(t.lat), String(t.lng), `/tree/${PNB_UID}/${t.uid}`],
    );
  }
  const ids = await c.query(`SELECT id, forest_tree_geo_lat lat, forest_tree_geo_long lng FROM forest_trees WHERE forest_id=$1 AND tree_unique_id LIKE '${PREFIX}%'`, [fid]);

  const scene = await c.query(
    `INSERT INTO forest_scenes (forest_id, label, image_url, lat, lng, default_yaw, default_pitch, display_order, is_demo)
     VALUES ($1,'PNB Planted Room — 5×5m (36 trees)',$2,$3,$4,0,-25,0,FALSE) RETURNING id`,
    [fid, IMG, cam.lat, cam.lng],
  );
  const sceneId = scene.rows[0].id;

  // camera at CENTRE, heading 0 = pano front. yaw = bearing to tree; pitch = look-down.
  let placed = 0;
  for (const row of ids.rows) {
    const tlat = Number(row.lat), tlng = Number(row.lng);
    const yaw = ((bearing(cam.lat, cam.lng, tlat, tlng)) % 360 + 360) % 360;
    const dist = Math.max(0.4, distM(cam.lat, cam.lng, tlat, tlng));
    const pitch = Math.max(-80, Math.min(-5, -r2d(Math.atan2(CAM_H, dist))));
    await c.query(`INSERT INTO scene_hotspots (scene_id, tree_id, yaw, pitch) VALUES ($1,$2,$3,$4) ON CONFLICT (scene_id,tree_id) DO NOTHING`,
      [sceneId, row.id, +yaw.toFixed(2), +pitch.toFixed(2)]);
    placed++;
  }

  // tight 5×5m boundary box centred on camera
  const half = ROOM_M / 2 + 0.5;
  const nW = dest(dest(cam.lat, cam.lng, 0, half).lat, cam.lng, 270, half);
  const nE = dest(dest(cam.lat, cam.lng, 0, half).lat, cam.lng, 90, half);
  const sW = dest(dest(cam.lat, cam.lng, 180, half).lat, cam.lng, 270, half);
  const sE = dest(dest(cam.lat, cam.lng, 180, half).lat, cam.lng, 90, half);
  const box = JSON.stringify([
    { lat: nW.lat, lng: nW.lng }, { lat: nE.lat, lng: nE.lng },
    { lat: sE.lat, lng: sE.lng }, { lat: sW.lat, lng: sW.lng },
  ]);
  await c.query(`UPDATE forests SET forest_boundary=$2::jsonb, updated_at=now() WHERE id=$1`, [fid, box]);

  console.log(`PNB Planted Room: scene ${sceneId} | ${trees.length} trees | ${placed} hotspots | ${SPACING.toFixed(2)}m spacing | camera centred`);
  console.log(`Open /forest/${fid}/tour`);
  await c.end();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
