-- =====================================================================
-- 009_carbon_anchors.sql
-- On-chain anchoring of the carbon ledger via OpenTimestamps (free, no wallet,
-- anchors a hash to the Bitcoin blockchain). Each row = one snapshot: a Merkle
-- root over the carbon-ledger rows at that moment, plus the OTS proof. Makes the
-- ledger tamper-evident: anyone can verify the root + Bitcoin timestamp.
-- =====================================================================

CREATE TABLE IF NOT EXISTS carbon_anchors (
  id           SERIAL PRIMARY KEY,
  root_hash    TEXT NOT NULL,        -- sha256 Merkle root over ledger rows
  ledger_rows  INTEGER,
  tree_count   INTEGER,
  total_co2e_kg DOUBLE PRECISION,
  ots_proof    TEXT,                 -- base64 OpenTimestamps proof (.ots)
  ots_status   TEXT,                 -- 'pending' | 'bitcoin' | 'error'
  anchored_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_carbon_anchors_at ON carbon_anchors(anchored_at DESC);
