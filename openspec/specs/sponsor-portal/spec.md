# Sponsor Portal Specification

## Purpose
Give a corporate sponsor a shareable, honest view of their forests — impact
totals, a per-tree register, and ESG-ready exports.

## Requirements

### Requirement: CSR microsite
The system SHALL expose `/sponsor/:id` showing the sponsor's brand, forests on a
map, survival %, and verification-ready tCO₂e, with a CSV export.

#### Scenario: Impact summary
- WHEN a sponsor microsite loads
- THEN it shows total forests, trees, survival % and net tCO₂e for that sponsor

### Requirement: Sponsor portal with tree register
The system SHALL expose `/portal/:id` with a forest selector, per-forest stat
tiles, and a searchable, paginated, health-coloured tree register with per-tree
life-record links and a tree-level CSV download.

#### Scenario: Switching forests
- WHEN a sponsor selects one of their forests
- THEN the stat tiles and tree register update to that forest

#### Scenario: CSV matches the UI
- WHEN the tree register is exported to CSV
- THEN dead trees show no CO₂e (consistent with the table)

### Requirement: Leaderboard
The system SHALL rank sponsors by tree count and survival without double-counting.

#### Scenario: No fan-out
- WHEN a forest has multiple sponsor links
- THEN tree counts use DISTINCT and are not inflated
