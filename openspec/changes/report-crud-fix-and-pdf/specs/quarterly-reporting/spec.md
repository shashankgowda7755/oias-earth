## ADDED Requirements

### Requirement: Admins can create, edit and delete forest reports

The Reports module SHALL persist report records through the backend's CRUD
verbs — create and update via `POST /report/upsert` (no id = insert, id in body
= update) and delete via `POST /report/delete` — not REST routes the server does
not expose. A create/edit/delete initiated from the UI MUST succeed (no 404) and
the list MUST refresh.

#### Scenario: Create a report from the UI

- **WHEN** an admin fills the Add Report form and clicks Create
- **THEN** the report is persisted (`/report/upsert` 200) and appears in the
  Reports list

### Requirement: A report is openable and downloadable

Each report row SHALL offer a **View report** action that opens the rendered
quarterly report (`/report/forest/:forest_id?year=&quarter=`). The rendered
report SHALL offer a one-click **Download PDF** that produces an actual PDF file
in the browser (no dependence on the OS print dialog).

#### Scenario: Download the report as a file

- **WHEN** a user clicks Download PDF on a rendered report
- **THEN** a multi-page PDF file (one slide per page) is generated client-side
  and saved, without opening the print dialog
