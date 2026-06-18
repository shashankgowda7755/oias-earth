# Carbon dMRV Specification

## Purpose
Compute defensible, registry-aligned CO₂e from measured growth — never a flat
linear rate — and make the method and its limits transparent.

## Requirements

### Requirement: Allometric carbon
The system SHALL compute per-tree CO₂e stock with Chave-2014 allometry using
per-species wood density, root:shoot, carbon fraction and the CO₂ ratio.

#### Scenario: Stock from a measurement
- WHEN a visit records DBH (at breast height) and height
- THEN CO₂e stock = treeCo2eKg(woodDensity, DBH, height) is recorded in the ledger

#### Scenario: No DBH below breast height
- WHEN a tree is shorter than 1.3 m
- THEN it has no DBH and its carbon contribution is 0

### Requirement: Conservative net removals
The system SHALL deduct an 18% permanence buffer and a 10% uncertainty haircut
when reporting net removals, and exclude dead trees from live stock.

#### Scenario: Net shown alongside gross
- WHEN the platform carbon summary is requested
- THEN it returns gross and net tCO₂e and labels them "estimated /
  verification-ready removals — not issued credits"

### Requirement: Tamper-evident ledger
The system SHALL keep an append-only carbon ledger and anchor a Merkle root to
Bitcoin (OpenTimestamps).

#### Scenario: Anchor surfaced publicly
- WHEN the carbon page loads
- THEN it shows the latest anchor (root hash, row count, status)
