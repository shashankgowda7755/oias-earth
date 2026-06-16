# Forest Create + Bulk Tree/Gift Contracts (from user-provided artifacts)

## 1. Forest create/upsert — FULL payload (`forest_create_payload.jsonc`)
This is the complete `POST /api/v1/forest/upsert` (a.k.a. forest/create) body. Resolves the prior open question about the forest write shape. It populates the many JSON columns on `forests` + generates `forest_boxes` + `forest_trees`.

### Top-level groups
- **Basic**: forest_name, forest_desc, forest_internal_id, forest_geo_lat, forest_geo_long, forest_address, forest_city, forest_state, forest_country.
- **Grid**: box_rows, box_columns, box_to_box_distance, tree_rows, tree_columns, tree_to_tree_distance, direction_angle, boundary_gap, pathway_spacing.
- **Project**: project_site, project_period, plantation_date.
- **Assignees (UUIDs, looked up from list endpoints)**: employee_id (site manager), sponsor_id, user_role_id. (JSON comment: "Get ID from network call tab".)
- **box_data[]**: `{ id, row, column, tree_to_tree_distance, prefix, start, row_position, column_position, species_data[] }`. Each `species_data` = `{ species_id, planted_on, count, height, diameter, species_common_name, species_name }`. -> generates trees: prefix+running number = tree_unique_id; `count` trees per species per box.

### Enums (exact values)
- plantation_strategy: `mixed_species | intense_plantation | others` (+ plantation_strategy_other)
- irrigation_method: `borewell | drip | sprinkler | others` (+ irrigation_method_other)
- climate: `summer | winter | monsoon | others` (+ climate_other)
- soil_type: `red_soil | black_soil | sandy_soil | others` (+ soil_type_other)
- land_ownership.agreement_status: `agreement_confirmed | agreement_pending | no_agreement`
- species_details.health: `good | average | poor | others` (+ health_other)
- additional_sponsor_logo[].type.value: `initiated_by | sponsored_by | supported_by | in_collaboration_with`
- report_images[].slide_type: `first_slide | content_slide | project_impact_slide`

### Rich/reporting JSON columns (each maps to a `forests.<col>` jsonb)
- additional_sponsor_logo[] `{type:{label,value}, name, logo(url)}`
- land_ownership `{name, agreement_status}`
- land_area `{total_area, planted_area}`
- digipin, last_inspection_date, permission_letter(url), site_layout(url)
- authorization_details `{authorized_by_name, authorized_by_designation, authorized_date, authorized_period, project_context}`
- area_population_statistics_details `{total_jurisdiction_area, population, population_density, green_cover, environmental_need, google_earth_image[]:{image,year,population}}`
- direct_and_indirect_beneficiaries `{site_supervisor, watering_team, de_weeding_crew, plant_health_specialist, people_visiting, people_living_near, schools_colleges}`
- forest_value_flow_impact_report `{short_term, medium_term, long_term : {land_value, tree_value, oxygen_generated, carbon_sequestration}}`
- species_details `{health(+other), mortality_rate, other_issues, additional_scope}`
- maintenance_workforce[] per quarter `{year, quarter, total_holidays_weekly_off, total_holidays_festival, total_watering_days, total_raining_days, full_time_gardeners, part_time_gardeners, total_part_time_labour_days}`
- plant_growth_data `{target_height_range[]:{year,min,max}, actual_height_range[]:{year,quarter,min,max}}`
- soil_ph_level[] per quarter `{year, quarter, reading_date, meter_image, meter_reading}`
- temperature_humidity[] per quarter `{year, quarter, reading_date, inside_plantation:{image,humidity,temperature}, outside_plantation:{...}}`
- environmental_need_indicators[] `{heading, description}`
- security_and_infrastructure `{description, image_data[]:{name,description,image}}`
- plantation_progress[] per quarter `{year, quarter, image}`
- dashboard_images[] `{name, description, image}`
- report_images[] `{slide_type, image}`

Note: this rich payload is far beyond the simplified 2-step "Add Forest" wizard observed in the SuperAdmin UI. It is the canonical full-forest record used for the report/dashboard. There is a `forest-report-to-json` skill that produces exactly this JSON from a quarterly report (report -> JSON -> forest/upsert). So the create path supports JSON import, not only the wizard.

## 2. Bulk tree / gift allocation sheet (`bulk_tree_gift_sheet.csv`, Google Sheet gid 1834015868)
800 rows, forest INCHCAPE40 (Inchcape Forest). Columns:
`forest_unique_id, forest_name, tree_unique_id, species_id, species_common_name, species_name, height, dia, planted_on, gift_recipient_name, gift_recipient_email_id, tree_url`
- Each row = one planted tree mapped to a gift recipient (Inchcape Shipping employees, @iss-shipping.com).
- `tree_url` = public certificate page `https://bethetreehugger.co/tree/<forest_unique_id>/<tree_unique_id>` (e.g. /tree/INCHCAPE40/AA001).
- Species used: 37 Portia Tree, 17 Indian Beech, 9 Moha, 5 Guava, 86 Indian willow.
- Maps to: `forest_trees` (tree_unique_id, species, height/dia, planted_on, geo) + `gift_forest_plants` / `donor_trees` (gift recipient name/email, certificate URL). This is the bulk-upload format for assigning sponsored trees to individuals.

## 3. Other Sheet (gid 2082403732) — INACCESSIBLE
Google Sheet `1r9JMqtEU90i…` returns HTTP 401 (private). Needs share "anyone with link" or a CSV download to analyze. Likely the forest data-entry / report template that feeds the forest JSON (to confirm once shared).

## Build implications
- Server `forest/upsert` must accept this full payload and persist every JSON column + generate boxes/trees from box_data.
- Add a JSON-import create path (paste/upload this JSON) in addition to the wizard.
- Add a bulk tree/gift CSV importer (sheet 2 format) -> trees + gift recipients + cert URLs.
- Reports render from the rich forest JSON (maintenance, soil ph, temp/humidity, growth, impact, progress) + report_images slides.
- Seed master_plantspecies with the 96 species; seed forests with this Vandalur sample.
