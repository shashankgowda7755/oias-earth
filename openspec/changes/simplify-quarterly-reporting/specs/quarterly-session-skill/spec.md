## ADDED Requirements

### Requirement: Operator can complete a quarterly report session in ~10 minutes via Claude skill

The system SHALL provide a Claude Code skill (`/quarterly-session`) that automates
the full quarterly data-entry session. The operator MUST only supply the ~7 values
that can only be measured on-site (inside temp, humidity, soil pH, workforce counts,
watering days, plant height, photos). Every other field MUST be auto-filled by the
skill via existing API endpoints or carried from the prior quarter.

Usage:
```
/quarterly-session <forest_internal_id> <year> <Q1|Q2|Q3|Q4>
```

Example:
```
/quarterly-session CGICGI57 2026 Q3
```

#### Scenario: Full automated session for Q2-Q4

- **WHEN** the operator runs `/quarterly-session CGICGI57 2026 Q3` and is logged
  into the prod app
- **THEN** Claude navigates to the forest's report-data editor, triggers weather
  auto-fill (`GET /forest/:id/weather?write=1`) and city-stats auto-fill, reports
  what was filled, asks the operator for the 7 manual delta values in a single
  prompt, fills each field, opens the report preview, screenshots slides 15/16/17/20,
  and asks for send confirmation — total operator input: one block of 7 numbers + 2
  photos + "YES"

#### Scenario: Auto-fills report back to operator

- **WHEN** auto-fill APIs respond
- **THEN** Claude shows a summary: "Weather filled: 12 rain days · 31°C · 68%.
  City stats filled: Pune, 332 km², 31.2 lakh." so the operator can verify before
  filling manual values

#### Scenario: Missing lat/long — weather skipped

- **WHEN** the forest has no lat/long set
- **THEN** weather auto-fill is skipped with a clear message; operator enters
  outside temp/humidity manually along with the other delta values

#### Scenario: Operator reviews preview before send

- **WHEN** Claude opens the report preview
- **THEN** it screenshots slides 15 (Soil pH), 16 (Temperature), 17 (Env Need),
  20 (Security) specifically, since these are the slides most likely to have gaps,
  and asks "Does the report look correct? Type YES to send or NO to go back."

### Requirement: Skill is discoverable and self-documented

The skill file (`.claude/skills/quarterly-session/SKILL.md`) MUST contain:
- Usage syntax with example
- Step-by-step instructions numbered 1–10
- List of auto-filled vs manually-entered fields
- Expected total operator time (~10 minutes)

The skill MUST be listed as available in the Claude Code session so the operator
can invoke it with `/quarterly-session` without reading documentation first.
