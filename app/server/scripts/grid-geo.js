/**
 * grid-geo — compute EXACT per-tree coordinates from a box's planting grid.
 * No per-tree GPS needed: give one corner + bearing + spacing + rows×cols and
 * geodesy places every sapling. Accurate to cm (GPS can't resolve 1 ft).
 *
 *   node grid-geo.js spec.json     # spec = [{box}], prints/【inserts】 trees
 */
const R = 6378137; // WGS84 mean radius (m)
const d2r = (d) => (d * Math.PI) / 180, r2d = (r) => (r * 180) / Math.PI;

// destination point: start (lat,lng) + bearing(deg) + distance(m) -> [lat,lng]
function dest(lat, lng, brg, dist) {
  const br = d2r(brg), la1 = d2r(lat), lo1 = d2r(lng), dr = dist / R;
  const la2 = Math.asin(Math.sin(la1) * Math.cos(dr) + Math.cos(la1) * Math.sin(dr) * Math.cos(br));
  const lo2 = lo1 + Math.atan2(Math.sin(br) * Math.sin(dr) * Math.cos(la1), Math.cos(dr) - Math.sin(la1) * Math.sin(la2));
  return [r2d(la2), r2d(lo2)];
}
function haversine(a, b, c, d) { // metres between two lat/lngs
  const dla = d2r(c - a), dlo = d2r(d - b);
  const x = Math.sin(dla / 2) ** 2 + Math.cos(d2r(a)) * Math.cos(d2r(c)) * Math.sin(dlo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// Lay out one box: corner = first tree; rows run along `bearing`, columns 90° right.
function layoutBox(box) {
  const { corner, bearing, rows, cols, spacing_ft, prefix, start } = box;
  const sp = spacing_ft * 0.3048; // ft -> m
  const trees = [];
  let n = start;
  for (let r = 0; r < rows; r++) {
    const [rlat, rlng] = dest(corner.lat, corner.lng, bearing, r * sp);          // down the row
    for (let c = 0; c < cols; c++) {
      const [lat, lng] = dest(rlat, rlng, bearing + 90, c * sp);                 // across the column
      trees.push({ id: `${prefix}${String(n).padStart(3, '0')}`, row: r, col: c, lat: +lat.toFixed(7), lng: +lng.toFixed(7) });
      n++;
    }
  }
  return trees;
}

// ---- PROOF RUN: 1 box, 10x10 = 100 trees, 1 ft spacing, near Trichy ----
const box = { corner: { lat: 10.7950, lng: 78.7100 }, bearing: 0, rows: 10, cols: 10, spacing_ft: 1, prefix: 'B1-', start: 1 };
const t = layoutBox(box);
console.log('trees generated:', t.length);
console.log('first:', JSON.stringify(t[0]));
console.log('next in row (should be ~0.305 m / 1 ft east):', JSON.stringify(t[1]),
  '| dist=', haversine(t[0].lat, t[0].lng, t[1].lat, t[1].lng).toFixed(3), 'm');
console.log('start of row 2 (should be ~0.305 m / 1 ft north):', JSON.stringify(t[10]),
  '| dist=', haversine(t[0].lat, t[0].lng, t[10].lat, t[10].lng).toFixed(3), 'm');
console.log('last (corner-to-corner 9ft x 9ft):', JSON.stringify(t[99]),
  '| diag=', haversine(t[0].lat, t[0].lng, t[99].lat, t[99].lng).toFixed(3), 'm (expect ~3.88 m)');

// ---- 4-CORNER (bilinear) layout: plant in any square/rect, give me 4 corners ----
// corners order: TL, TR, BR, BL (top-left, clockwise). rows down, cols across.
function layoutQuad({ corners, rows, cols, prefix, start }) {
  const [TL, TR, BR, BL] = corners;
  const lerp = (a, b, t) => ({ lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t });
  const trees = []; let n = start;
  for (let r = 0; r < rows; r++) {
    const v = rows > 1 ? r / (rows - 1) : 0;
    for (let c = 0; c < cols; c++) {
      const u = cols > 1 ? c / (cols - 1) : 0;
      const top = lerp(TL, TR, u), bot = lerp(BL, BR, u), p = lerp(top, bot, v);
      trees.push({ id: `${prefix}${String(n).padStart(3, '0')}`, row: r, col: c, lat: +p.lat.toFixed(7), lng: +p.lng.toFixed(7) });
      n++;
    }
  }
  return trees;
}

// PROOF: 30 saplings (6 rows x 5 cols) in a 4ft x 5ft rectangle, 4 real corners.
const SP = (ft) => ft * 0.3048;
const c0 = { lat: 10.79500, lng: 78.71000 };
const quad = {
  corners: [
    c0,                                                   // TL
    dest(c0.lat, c0.lng, 90, SP(4)).reduce((_, __, i, a) => ({ lat: a[0], lng: a[1] }), {}), // TR (+4ft east)
    (() => { const [la, ln] = dest(c0.lat, c0.lng, 90, SP(4)); const [la2, ln2] = dest(la, ln, 180, SP(5)); return { lat: la2, lng: ln2 }; })(), // BR
    (() => { const [la, ln] = dest(c0.lat, c0.lng, 180, SP(5)); return { lat: la, lng: ln }; })(), // BL (+5ft south)
  ],
  rows: 6, cols: 5, prefix: 'TEST-', start: 1,
};
const q = layoutQuad(quad);
console.log('\n=== 30-sapling box (6x5, 4ft x 5ft) ===');
console.log('count:', q.length);
console.log('TL tree:', JSON.stringify(q[0]));
console.log('TR tree (4ft across):', JSON.stringify(q[4]), '| edge=', haversine(q[0].lat,q[0].lng,q[4].lat,q[4].lng).toFixed(2),'m (≈1.22m=4ft)');
console.log('BL tree (5ft down):', JSON.stringify(q[25]), '| edge=', haversine(q[0].lat,q[0].lng,q[25].lat,q[25].lng).toFixed(2),'m (≈1.52m=5ft)');
console.log('neighbor spacing:', haversine(q[0].lat,q[0].lng,q[1].lat,q[1].lng).toFixed(3),'m (≈1ft)');
