# dom-crash-resilience Specification

## Purpose
TBD - created by archiving change harden-dom-crash-guard. Update Purpose after archive.
## Requirements
### Requirement: Client survives third-party DOM mutation without crashing

The client SHALL NOT throw an uncaught exception or render the global error
boundary when a third-party browser extension has detached or relocated a DOM
node that React's reconciler later targets via `insertBefore` or `removeChild`.
A global guard MUST be installed before the React root mounts and MUST recover
gracefully (append the node, or treat the removal as a no-op) instead of
propagating the native DOM exception.

#### Scenario: Save commits while an extension has mutated the DOM

- **WHEN** a user triggers a Save (or any state update that re-renders) and a
  DOM-mutating extension has detached the reference node React expects
- **THEN** the screen continues to render, the action completes, and no
  "Something went wrong" error boundary is shown

#### Scenario: insertBefore reference node is no longer a child

- **WHEN** `Node.prototype.insertBefore` is called with a reference node whose
  `parentNode` is not the receiving element
- **THEN** the new node is appended to the receiving element instead of throwing,
  and React re-orders it correctly on its next commit

#### Scenario: removeChild target is already detached

- **WHEN** `Node.prototype.removeChild` is called with a child whose `parentNode`
  is not the receiving element
- **THEN** the call is a no-op and returns the child without throwing

#### Scenario: Guard installs exactly once

- **WHEN** the guard installer runs (including React StrictMode double-invocation
  in development)
- **THEN** `Node.prototype.insertBefore`/`removeChild` are wrapped only once and
  not re-wrapped on subsequent calls

### Requirement: Admin always loads the latest deployed build

The admin surface SHALL always fetch the current `index.html` and JS bundles
from the network rather than a stale service-worker-cached app shell. The field
PWA service worker MUST be scoped so that only `/field*` routes are served the
precached offline shell; all other (admin) routes MUST be excluded from the
service worker's navigation fallback. A new service worker MUST take control
without requiring multiple reloads.

#### Scenario: Admin route loads after a new deploy

- **WHEN** a user opens any admin route (not under `/field`) after a new version
  has been deployed
- **THEN** the latest `index.html` and hashed JS chunks are fetched from the
  network and no stale cached shell is served

#### Scenario: Field route remains offline-capable

- **WHEN** a planter opens a `/field` route while offline after having loaded it
  online
- **THEN** the precached app shell is served and the field capture flow works

#### Scenario: New service worker activates promptly

- **WHEN** an updated service worker is installed
- **THEN** it calls `skipWaiting`/`clientsClaim` and takes control without
  requiring the user to reload more than once

