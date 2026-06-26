## ADDED Requirements

### Requirement: The admin opens on a bento overview

The admin dashboard SHALL default to a "Home" overview rendered as a bento grid:
KPI tiles (forest count, total trees, geo-tagged %, survival %), a live-map tile,
a recent-forests list whose entries open that forest, quick actions, and a
reports shortcut. All figures derive from real data (no fabricated numbers).
Section tabs remain available for drill-in.

#### Scenario: Land on the admin

- **WHEN** an admin opens the dashboard
- **THEN** the Home bento shows the live KPIs, a map, and recent forests, and a
  recent-forest entry navigates to that forest
