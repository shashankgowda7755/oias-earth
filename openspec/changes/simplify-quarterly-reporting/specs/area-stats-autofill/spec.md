## ADDED Requirements

### Requirement: City area and population statistics can be auto-filled from public data

The system SHALL provide a one-click auto-fill for city-level area and population
statistics using public structured data (Wikidata, Wikipedia). The operator MUST
be able to override any auto-filled value. The endpoint MUST NOT require an API
key. Climate type and soil type MAY be extracted from the Wikipedia text extract
as a convenience — they are hints, not verified readings.

#### Scenario: Auto-fill from city name

- **WHEN** an admin clicks "⚡ Auto-fill from city name" in the Area & Population
  section and `forest_city` is set on the forest
- **THEN** the system queries `GET /forest/city-stats?city=&state=&country=`,
  fills `region_name`, `total_jurisdiction_area`, `population`, and
  `population_density` from Wikidata structured claims, and displays the source
  name so the operator can confirm or correct the values

#### Scenario: City not found

- **WHEN** the Wikipedia search finds no article matching the city+state+country
  combination
- **THEN** the button shows "City not found on Wikipedia" and all fields remain
  unchanged; the operator enters values manually

#### Scenario: Climate and soil type extracted

- **WHEN** the Wikipedia extract for the city mentions a known climate or soil
  keyword (e.g. "humid subtropical", "alluvial soil")
- **THEN** the `climate` and `soil_type` response fields are populated with the
  matched category label; these are displayed as hints and the operator can change
  them

#### Scenario: Wikidata returns metro-level population

- **WHEN** Wikidata's population figure covers the full metro area rather than
  the local zone where the forest is planted
- **THEN** the auto-fill succeeds but a notice states "population may reflect the
  full metro, not just the local zone" so the operator can adjust

### Requirement: Source waterfall — Wikidata preferred, Wikipedia summary fallback

The city-stats endpoint MUST try sources in this order:

1. **Wikipedia search** (`action=query&list=search`) to resolve a page title for
   the city+state+country terms
2. **Wikidata** (`wbgetentities`) for structured numeric claims:
   P1082 (population), P2046 (area km²), P1539 (population density)
3. **Wikipedia REST summary** (`/api/rest_v1/page/summary/:title`) for the
   description and extract text from which climate/soil are parsed

A Census India API (`api.data.gov.in`) fallback MAY be added for districts not
well-represented in Wikidata (task 9.6, not yet implemented).

#### Scenario: Wikidata missing area

- **WHEN** Wikidata has no P2046 claim for the city
- **THEN** `total_jurisdiction_area` is null in the response; the operator enters
  it manually; the other fields that were found are still filled
