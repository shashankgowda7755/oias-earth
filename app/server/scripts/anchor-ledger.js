/**
 * Anchor the carbon ledger to Bitcoin via OpenTimestamps (free, no wallet).
 * Builds a SHA-256 Merkle root over all carbon-ledger rows, submits it to the
 * OpenTimestamps public calendars, and stores the root + proof in carbon_anchors.
 * Anyone can later verify the root against the ledger and the Bitcoin timestamp.
 *
 *   node scripts/anchor-ledger.js
 */
const crypto = require('crypto');
const { Client } = require('pg');
const OpenTimestamps = require('opentimestamps');

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest();

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const rows = (
    await c.query(
      `SELECT id, tree_id, timeline_id, co2e_kg, co2e_delta_kg, vintage_year, method_version
         FROM forest_tree_carbon_ledger ORDER BY id`,
    )
  ).rows;

  let level = rows.length ? rows.map((r) => sha256(Buffer.from(JSON.stringify(r)))) : [sha256(Buffer.from('empty'))];
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(sha256(Buffer.concat([level[i], level[i + 1] || level[i]])));
    }
    level = next;
  }
  const root = level[0];
  const rootHex = root.toString('hex');

  const t = (
    await c.query(
      `SELECT count(*)::int rows, count(DISTINCT tree_id)::int trees,
              COALESCE(sum(co2e_delta_kg),0) co2 FROM forest_tree_carbon_ledger`,
    )
  ).rows[0];

  let otsB64 = null;
  let status = 'pending';
  try {
    const det = OpenTimestamps.DetachedTimestampFile.fromHash(new OpenTimestamps.Ops.OpSHA256(), root);
    await OpenTimestamps.stamp(det);
    otsB64 = Buffer.from(det.serializeToBytes()).toString('base64');
    status = 'bitcoin-pending';
  } catch (e) {
    status = 'error:' + String(e.message || e).slice(0, 60);
  }

  await c.query(
    `INSERT INTO carbon_anchors (root_hash, ledger_rows, tree_count, total_co2e_kg, ots_proof, ots_status)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [rootHex, t.rows, t.trees, Number(t.co2) || 0, otsB64, status],
  );
  console.log(`anchored root ${rootHex.slice(0, 16)}… status=${status} rows=${t.rows} trees=${t.trees}`);
  await c.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
