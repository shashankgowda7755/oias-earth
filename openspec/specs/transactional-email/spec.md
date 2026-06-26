# transactional-email Specification

## Purpose
TBD - created by archiving change resend-email-overhaul. Update Purpose after archive.
## Requirements
### Requirement: Single-provider outbound email
The system SHALL send all outbound email (quarterly reports and gift-tree
certificates) through Resend from the verified OIAS Earth sending domain, with no
secondary provider.

#### Scenario: Report sent via Resend
- WHEN an admin sends a quarterly report
- THEN the email is delivered by Resend from `RESEND_FROM`, not via Composio

#### Scenario: Misconfigured sender fails safe
- WHEN `RESEND_API_KEY` is unset
- THEN the send returns a clear "not configured" error and is recorded as failed,
  without throwing a 500

### Requirement: Tracked editable templates
The system SHALL render each email from a template whose default lives in code and
whose copy MAY be overridden by a database row, substituting `{{placeholder}}`
values with HTML escaping.

#### Scenario: DB override wins over code default
- WHEN a SuperAdmin saves a template override for a key
- THEN subsequent sends use the override, and deleting it reverts to the code default

#### Scenario: Placeholder values are escaped
- WHEN a recipient or sponsor name contains HTML characters
- THEN they are escaped in the rendered email body

### Requirement: CC resolution on report sends
The system SHALL CC the available stakeholder addresses when a report is sent.

#### Scenario: Sponsor and contact are CC'd
- WHEN a report is sent for a forest that has an active sponsor email and a forest
  contact email
- THEN both are CC'd, together with any manual cc, deduplicated, with the TO
  address removed from the cc list

### Requirement: Report PDF attachment
The system SHALL attach the rendered report PDF when a send originates from the
report viewer, and SHALL send link-only when no rendered report is available.

#### Scenario: Viewer send carries the PDF
- WHEN an admin sends from the quarterly report viewer
- THEN the report PDF is rendered in the browser and attached alongside the live link

#### Scenario: List send is link-only
- WHEN a report is sent from a context without rendered report slides
- THEN the email is delivered with the link and no attachment

### Requirement: Sent inbox (send log)
The system SHALL persist every send attempt — success and failure — and expose it
to administrators.

#### Scenario: Every attempt is logged
- WHEN any report or gift email is attempted
- THEN a row is written to `email_log` with to/cc/subject/status/attachment/actor,
  whether the send succeeded or failed

#### Scenario: Admin views the inbox
- WHEN an Admin or SuperAdmin opens the Emails tab
- THEN they see the paginated send log, filterable by kind and status

