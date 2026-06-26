## ADDED Requirements

### Requirement: Row-action menus are leftmost in every admin table

Every admin data table that has row actions SHALL render its row-action menu
(the kebab: View / Edit / Delete and any table-specific actions) in the leftmost
column, sticky-pinned so it stays visible while the table scrolls horizontally,
on both desktop and mobile. A table MUST NOT place its row actions on the right.
Tables without row actions are exempt.

#### Scenario: Any table with row actions

- **WHEN** an admin views any table that has row actions (Forests, Employees,
  Sponsors, Users, Reports, Jobs)
- **THEN** the kebab is the first (leftmost) column and stays pinned and visible
  on horizontal scroll, on both desktop and a mobile-width viewport
