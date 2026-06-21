/**
 * pnb-living-proof — PRODUCTION 360 walkthrough for the PNB (Chennai) forest using
 * REAL equirectangular photos (pnb-360-scene-a/b.jpg). Builds TWO camera scenes,
 * a 1-ft-spaced grid of real tagged trees per scene, AUTO-PLACED hotspots (one per
 * plant, yaw/pitch from camera pose — zero manual clicks), and a two-way walk link
 * between the scenes. Boundary is (re)written as a tight box around the two blocks.
 *
 *   node pnb-living-proof.js          # build
 *   node pnb-living-proof.js --clean  # remove (prefix LP-)
 *
 * Needs DATABASE_URL in env (Neon). Same-origin /panoramas/*.jpg images — no Blob.
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
const PREFIX = 'LP-';
const SPECIES_ID = 35, SPECIES_NAME = 'Arjun'; // Terminalia Arjuna
const ROWS = 6, COLS = 5;        // 30 saplings per block
const SPACING_FT = 1;            // "one-one feet" — 1 ft between plants
const CAM_H = 1.6;               // camera height (m)

// Two blocks: A at forest centre, B 10 ft north of A. Each has its own 360 photo.
const BLOCKS = [
  { tag: 'A', label: 'PNB Living Proof — Block A', img: '/panoramas/pnb-360-scene-a.jpg', offNorthFt: 0 },
  { tag: 'B', label: 'PNB Living Proof — Block B', img: '/panoramas/pnb-360-scene-b.jpg', offNorthFt: 10 },
];

function buildGrid(originTL) {
  // bilinear grid from a top-left origin, COLS east x ROWS south at 1-ft spacing
  const TL = originTL;
  const TR = dest(TL.lat, TL.lng, 90, SP((COLS - 1) * SPACING_FT));
  const BL = dest(TL.lat, TL.lng, 180, SP((ROWS - 1) * SPACING_FT));
  const e = dest(TL.lat, TL.lng, 90, SP((COLS - 1) * SPACING_FT));
  const BR = dest(e.lat, e.lng, 180, SP((ROWS - 1) * SPACING_FT));
  const out = [];
  for (let r = 0; r < ROWS; r++) {
    const v = r / (ROWS - 1);
    for (let col = 0; col < COLS; col++) {
      const u = col / (COLS - 1);
      const top = lerp(TL, TR, u), bot = lerp(BL, BR, u), p = lerp(top, bot, v);
      out.push({ lat: +p.lat.toFixed(7), lng: +p.lng.toFixed(7) });
    }
  }
  return { trees: out, TL, TR, BL, BR };
}

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const f = await c.query(`SELECT id, forest_geo_lat, forest_geo_long FROM forests WHERE forest_unique_id=$1`, [PNB_UID]);
  if (!f.rowCount) { console.error('PNB forest not found'); process.exit(1); }
  const fid = f.rows[0].id;

  // clean prior LP- demo (scenes, hotspots, links, trees)
  await c.query(`UPDATE scene_links SET is_active=FALSE WHERE from_scene_id IN (SELECT id FROM forest_scenes WHERE forest_id=$1 AND label LIKE 'PNB Living Proof%')`, [fid]);
  await c.query(`UPDATE scene_hotspots SET is_active=FALSE WHERE scene_id IN (SELECT id FROM forest_scenes WHERE forest_id=$1 AND label LIKE 'PNB Living Proof%')`, [fid]);
  await c.query(`DELETE FROM scene_links WHERE from_scene_id IN (SELECT id FROM forest_scenes WHERE forest_id=$1 AND label LIKE 'PNB Living Proof%')`, [fid]);
  await c.query(`DELETE FROM scene_hotspots WHERE tree_id IN (SELECT id FROM forest_trees WHERE forest_id=$1 AND tree_unique_id LIKE '${PREFIX}%')`, [fid]);
  await c.query(`DELETE FROM forest_scenes WHERE forest_id=$1 AND label LIKE 'PNB Living Proof%'`, [fid]);
  await c.query(`DELETE FROM forest_trees WHERE forest_id=$1 AND tree_unique_id LIKE '${PREFIX}%'`, [fid]);
  if (process.argv.includes('--clean')) { console.log('Removed LP- living-proof demo.'); await c.end(); return; }

  const centre = { lat: Number(f.rows[0].forest_geo_lat), lng: Number(f.rows[0].forest_geo_long) };
  const sceneIds = [];
  const allCorners = [];
  let nGlobal = 1;

  for (const blk of BLOCKS) {
    // block origin (top-left) shifted north by offset, anchored at forest centre
    const TLorigin = blk.offNorthFt ? dest(centre.lat, centre.lng, 0, SP(blk.offNorthFt)) : centre;
    const g = buildGrid(TLorigin);
    allCorners.push(g.TL, g.TR, g.BL, g.BR);

    // insert real tagged trees for this block
    const blkTrees = [];
    for (const t of g.trees) {
      const uid = `${PREFIX}${blk.tag}-${String(nGlobal).padStart(3, '0')}`;
      blkTrees.push({ uid, ...t });
      await c.query(
        `INSERT INTO forest_trees (forest_id, master_plant_species_id, tree_unique_id, forest_tree_name,
            forest_tree_geo_lat, forest_tree_geo_long, planted_on, tree_status_id, tree_url, is_display, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,'2025-07-01',1,$7,TRUE,TRUE)`,
        [fid, SPECIES_ID, uid, SPECIES_NAME, String(t.lat), String(t.lng), `/tree/${PNB_UID}/${uid}`],
      );
      nGlobal++;
    }
    const ids = await c.query(
      `SELECT id, tree_unique_id, forest_tree_geo_lat lat, forest_tree_geo_long lng
         FROM forest_trees WHERE forest_id=$1 AND tree_unique_id LIKE '${PREFIX}${blk.tag}-%'`, [fid]);

    // camera 2.5 m south of block centre, facing NORTH (heading 0 = pano front)
    const bCentre = { lat: (g.TL.lat + g.BL.lat) / 2, lng: (g.TL.lng + g.TR.lng) / 2 };
    const cam = dest(bCentre.lat, bCentre.lng, 180, 2.5);
    const scene = await c.query(
      `INSERT INTO forest_scenes (forest_id, label, image_url, lat, lng, default_yaw, default_pitch, display_order, is_demo)
       VALUES ($1,$2,$3,$4,$5,0,-10,$6,FALSE) RETURNING id`,
      [fid, blk.label, blk.img, cam.lat, cam.lng, BLOCKS.indexOf(blk)],
    );
    const sceneId = scene.rows[0].id;
    sceneIds.push(sceneId);

    // AUTO-PLACE one hotspot per plant
    let placed = 0;
    for (const row of ids.rows) {
      const tlat = Number(row.lat), tlng = Number(row.lng);
      const brg = bearing(cam.lat, cam.lng, tlat, tlng);
      const yaw = ((brg - 0) % 360 + 360) % 360;
      const dist = Math.max(0.5, distM(cam.lat, cam.lng, tlat, tlng));
      const pitch = Math.max(-80, Math.min(-3, -r2d(Math.atan2(CAM_H, dist))));
      await c.query(`INSERT INTO scene_hotspots (scene_id, tree_id, yaw, pitch) VALUES ($1,$2,$3,$4) ON CONFLICT (scene_id,tree_id) DO NOTHING`,
        [sceneId, row.id, +yaw.toFixed(2), +pitch.toFixed(2)]);
      placed++;
    }
    console.log(`  Block ${blk.tag}: scene ${sceneId} @ ${cam.lat.toFixed(6)},${cam.lng.toFixed(6)} | ${blkTrees.length} trees | ${placed} hotspots | ${blk.img}`);
  }

  // two-way walk link between scenes (A faces forward to B, B looks back to A)
  if (sceneIds.length === 2) {
    await c.query(`INSERT INTO scene_links (from_scene_id, to_scene_id, yaw, pitch, label) VALUES ($1,$2,0,-5,'Walk to Block B')`, [sceneIds[0], sceneIds[1]]);
    await c.query(`INSERT INTO scene_links (from_scene_id, to_scene_id, yaw, pitch, label) VALUES ($1,$2,180,-5,'Back to Block A')`, [sceneIds[1], sceneIds[0]]);
    console.log(`  Linked scenes ${sceneIds[0]} <-> ${sceneIds[1]} (two-way walk)`);
  }

  // boundary: tight box around all block corners
  const lats = allCorners.map((p) => p.lat), lngs = allCorners.map((p) => p.lng);
  const pad = SP(2) / R * r2d(1); // ~2 ft pad in degrees (rough)
  const minLat = Math.min(...lats) - pad, maxLat = Math.max(...lats) + pad;
  const minLng = Math.min(...lngs) - pad, maxLng = Math.max(...lngs) + pad;
  const box = JSON.stringify([
    { lat: maxLat, lng: minLng }, { lat: maxLat, lng: maxLng },
    { lat: minLat, lng: maxLng }, { lat: minLat, lng: minLng },
  ]);
  // store on forests.boundary_geojson if the column exists; otherwise skip silently
  try {
    await c.query(`UPDATE forests SET forest_boundary=$2::jsonb, updated_at=now() WHERE id=$1`, [fid, box]);
    console.log('  Boundary updated (forest_boundary jsonb).');
  } catch (e) {
    console.log('  Boundary column not forest_boundary — left existing boundary in place.');
  }

  console.log(`PNB living-proof built on forest ${fid}. Open /forest/${fid}/tour`);
  await c.end();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
