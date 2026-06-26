## ADDED Requirements

### Requirement: Admin shell defaults to a summarizing HOME landing

The admin shell SHALL present a HOME section as its default landing view after
sign-in, rendered as a bento grid that summarizes the platform at a glance. HOME
MUST be the initially-active section, MUST appear first in the section navigation
(sidebar and tab nav), and MUST switch to other sections in place without leaving
`/dashboard`. The grid MUST collapse to a single column on narrow (mobile)
viewports.

#### Scenario: Admin signs in and lands on HOME

- **WHEN** an authenticated admin opens `/dashboard`
- **THEN** the HOME section is the active view, shown as a bento grid, and HOME is
  the first entry in the sidebar and tab navigation

#### Scenario: HOME collapses on mobile

- **WHEN** the dashboard is viewed below ~760px wide
- **THEN** the bento grid renders as a single column and each tile spans one
  column instead of overflowing

### Requirement: HOME shows live platform KPIs

HOME SHALL display key platform metrics computed from the live forests dataset
returned by `fetchForestsMap()`: total forests, total trees, percent geo-tagged,
and percent survival. Percentages MUST be derived from the same dataset
(`tagged_trees / total_trees` and `(alive_trees ?? tagged_trees) / total_trees`)
and MUST NOT divide by zero when there are no trees. While data is loading the
metrics MUST render a neutral placeholder rather than zero or a crash, and counts
MUST be formatted for the Indian locale.

#### Scenario: KPIs reflect the loaded dataset

- **WHEN** `fetchForestsMap()` resolves with forests
- **THEN** the Forests, Trees, Geo-tagged, and Survival tiles show values computed
  from that dataset, with counts formatted `en-IN`

#### Scenario: KPIs while loading

- **WHEN** the forests dataset has not yet loaded
- **THEN** each KPI tile shows a placeholder (`—`) and no value computation throws

#### Scenario: No trees yet

- **WHEN** the dataset contains forests but zero total trees
- **THEN** the Geo-tagged and Survival percentages render as `0%` rather than
  producing a divide-by-zero result

### Requirement: HOME embeds the live map and recent forests

HOME SHALL include a prominent live-map tile embedding the interactive
`HeartbeatMap` populated with the same forest pins, and a recent-forests tile
listing the top forests by tree count. Selecting a recent forest MUST navigate to
that forest's public view at `/forest/:id`.

#### Scenario: Live map tile renders pins

- **WHEN** HOME has loaded the forests dataset
- **THEN** the live-map tile renders the interactive `HeartbeatMap` with the
  loaded forest pins

#### Scenario: Recent forests are ranked and navigable

- **WHEN** HOME has loaded the forests dataset
- **THEN** the recent-forests tile lists the top forests by `total_trees`, and
  clicking a row navigates to `/forest/:id` for that forest

#### Scenario: Recent forests empty state

- **WHEN** the dataset contains no forests
- **THEN** the recent-forests tile shows an empty-state message instead of an
  empty or broken list

### Requirement: HOME routes to sections, the map, and reports in one click

HOME SHALL provide quick actions and shortcuts that route the operator without
manual navigation: quick-action buttons that switch the active section in place
(at minimum Forests, Reports, Sponsors, Integrity), a reports shortcut that opens
the Reports section, and a header link that opens the public live map at `/map`.
Section-switching actions MUST keep the URL at `/dashboard`.

#### Scenario: Quick action opens a section

- **WHEN** the operator clicks a HOME quick action (e.g. Forests or Sponsors)
- **THEN** the dashboard switches to that section in place and the URL stays
  `/dashboard`

#### Scenario: Reports shortcut

- **WHEN** the operator clicks the reports shortcut "Open →"
- **THEN** the dashboard switches to the Reports section

#### Scenario: Open the live map

- **WHEN** the operator clicks the header "Open live map →" link
- **THEN** the public live map at `/map` is opened
