# Auth & Roles Specification

## Purpose
Scope who can see and change which forests, and let field workers capture data
offline.

## Requirements

### Requirement: Raw-token authentication
The system SHALL authenticate REST calls via an `Authorization: <rawToken>`
header (no `Bearer ` prefix) and reject malformed tokens.

#### Scenario: Bearer prefix rejected
- WHEN a request sends `Authorization: Bearer <token>`
- THEN the request is rejected (the contract is the raw token only)

### Requirement: Role-scoped forest access
The system SHALL grant SuperAdmin access to all forests, and scope Admin and
Planter to forests assigned via `user_role_forest_accesses`.

#### Scenario: Planter sees only assigned forests
- WHEN a Planter requests their forests
- THEN only forests they are assigned to are returned

### Requirement: Offline field capture
The system SHALL provide an installable, offline-first PWA at `/field` that queues
captures and syncs on reconnect.

#### Scenario: Capture offline then sync
- WHEN a planter captures a visit with no connectivity
- THEN it is queued locally and posted automatically when back online
