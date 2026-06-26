## ADDED Requirements

### Requirement: Row-action menus are leftmost and consistent in every admin table

In every admin data table, the row-action menu (the ⋮ kebab → View / Edit /
Delete and any table-specific actions) SHALL render in the **leftmost column**,
**sticky-pinned** so it stays visible while the table scrolls horizontally, on
**both desktop and mobile**. No table may place its row actions on the right.
Tables with no row actions are exempt.

#### Scenario: Any table with row actions

- **WHEN** an admin views any table that has row actions (Forests, Employees,
  Sponsors, Users, Reports, Jobs)
- **THEN** the ⋮ kebab is the first (leftmost) column and stays pinned/visible
  on horizontal scroll, on both desktop and a mobile-width viewport
