## ADDED Requirements

### Requirement: The forest boundary is editable on an interactive satellite map

An admin SHALL be able to trace and refine a forest's boundary on an interactive
satellite map: add a vertex by tapping, move a vertex by dragging, insert a
vertex by clicking an edge, and delete a vertex by double-tapping (while ≥ 3
vertices remain). The editor MUST show a live **area (hectares)** and
**perimeter (metres)** computed from the real lat/lng vertices, and MUST allow
**importing an existing boundary from a KML or GeoJSON file**. Saving persists
the real lat/lng polygon to the forest.

#### Scenario: Refine a traced boundary

- **WHEN** an admin drags a placed corner, clicks an edge to insert a corner, or
  double-taps a corner to delete it
- **THEN** the outline updates live and the area/perimeter readout recomputes
  from the real coordinates

#### Scenario: Import a plot polygon

- **WHEN** an admin imports a KML or GeoJSON file containing a polygon
- **THEN** the boundary is populated from the file's coordinates and can be saved
  or further edited
