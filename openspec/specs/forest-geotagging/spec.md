# Forest Geo-tagging Specification

## Purpose
Locate every forest and every tree on a map so sponsors and the public can see
WHERE living proof exists and verify it independently.

## Requirements

### Requirement: Per-tree geo-tagging
The system SHALL store a latitude/longitude per tree and let authorised users set
it via device GPS, tapping the map, or manual entry.

#### Scenario: Capture by device GPS
- WHEN a SuperAdmin/Admin captures a tree's location over HTTPS using the device
- THEN the tree's `forest_tree_geo_lat`/`forest_tree_geo_long` are saved and the
  tree appears on the public map

#### Scenario: Read-only for non-capture roles
- WHEN a user without capture rights opens the geo-tagging view
- THEN they can verify positions but cannot edit them

### Requirement: Public forest map
The system SHALL expose an unauthenticated map of every active forest that has a
centre coordinate, drilling into a forest to show its trees.

#### Scenario: Forest markers cluster at scale
- WHEN many forests fall near each other
- THEN they collapse into a count cluster that expands on zoom

#### Scenario: Trees coloured by health
- WHEN a user drills into a forest
- THEN each tree pin is coloured by status (healthy / drying / damaged / dead)
  and a popup shows species, status, height, DBH, estimated CO₂e and a life-record link

### Requirement: Forest boundary
The system SHALL store an optional polygon boundary per forest and report its area
in hectares (EUDR-grade GeoJSON).

#### Scenario: Boundary drawn on the public map
- WHEN a forest has a boundary of 3+ points
- THEN the map renders the polygon and shows the computed area in hectares
