## MODIFIED Requirements

### Requirement: Forest boundary
The system SHALL store an optional polygon boundary per forest and report its area
in hectares (EUDR-grade GeoJSON). Authorised users SHALL be able to edit the
polygon vertex-by-vertex — adding, moving, inserting, and deleting corners — and
import a boundary from a KML or GeoJSON file. While editing, the system SHALL show
a live area (hectares) and perimeter (metres) readout. The edited polygon SHALL be
persisted as real latitude/longitude points to `forests.forest_boundary`, and the
species-matrix layout SHALL clip its grid to the saved polygon.

#### Scenario: Boundary drawn on the public map
- WHEN a forest has a boundary of 3+ points
- THEN the map renders the polygon and shows the computed area in hectares

#### Scenario: Append a corner by tapping
- WHEN an authorised user is in boundary-edit mode and taps the map
- THEN a new corner is appended to the ring at that latitude/longitude and the
  polygon outline updates

#### Scenario: Move a vertex by dragging
- WHEN an authorised user drags a boundary vertex handle and releases it
- THEN that vertex moves to the dropped position, the full updated ring is emitted,
  and the area/perimeter readout recomputes

#### Scenario: Insert a vertex on an edge
- WHEN an authorised user clicks the midpoint handle on a boundary edge
- THEN a new vertex is inserted between that edge's two endpoints without
  disturbing the rest of the ring

#### Scenario: Delete a vertex
- WHEN an authorised user double-taps a boundary vertex and the ring has more than
  3 points
- THEN that vertex is removed; a ring already at 3 points is left unchanged so it
  stays a valid polygon

#### Scenario: Live area and perimeter while editing
- WHEN the boundary has 2 or more points in edit mode
- THEN the area in hectares (metric shoelace) and perimeter in metres (haversine)
  are displayed and update on every vertex change, and the map does not re-fit so
  the view stays steady

#### Scenario: Import a boundary from KML or GeoJSON
- WHEN an authorised user imports a `.kml`, `.geojson`, or `.json` file containing
  a polygon ring of 3+ points
- THEN the largest ring is parsed into latitude/longitude vertices and loaded into
  edit mode; a file with no usable polygon is rejected with an error

#### Scenario: Save persists real coordinates and clips the matrix
- WHEN an authorised user saves the edited boundary
- THEN the ring is stored to `forests.forest_boundary` (an empty ring clears it),
  and the species-matrix grid is clipped to the saved polygon via point-in-polygon

## ADDED Requirements

### Requirement: Map-driven place geocoding for forest location
The forest location picker SHALL let a user set coordinates by searching for a
place name or address (keyless OSM Nominatim), dropping the map pin at the match.
Whenever the pin moves — by search, by clicking the map, or by dragging the pin —
the system SHALL reverse-geocode the coordinates and auto-fill the editable
Address field plus the city, state, and country, while keeping the latitude and
longitude inputs as the source of truth. The system MUST NOT overwrite an
already-saved address on the initial load of an existing forest.

#### Scenario: Search a place to drop the pin
- WHEN a user enters a place name or address in the location search and submits
- THEN the pin is dropped/recentred at the top match and the coordinate inputs are
  set to that latitude/longitude

#### Scenario: Reverse-geocode fills the address on pin move
- WHEN the pin is moved by clicking the map, dragging the pin, or picking a search
  result
- THEN the Address field and the city/state/country are filled from the
  reverse-geocoded place, and all remain editable

#### Scenario: Saved address preserved on edit
- WHEN an existing forest with a saved address is opened and its coordinates sync
  for the first time
- THEN no reverse-geocode runs on that initial sync and the saved address,
  city, state, and country are left untouched

#### Scenario: Typed coordinates move the pin
- WHEN a user types a latitude/longitude into the inputs
- THEN the pin moves to those coordinates and the map recentres on them
