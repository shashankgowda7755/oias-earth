## ADDED Requirements

### Requirement: A bad cold-start migration cannot crash the API

The Vercel cold-start migration runner SHALL execute each migration in its own
error boundary: if a migration throws, the failure is logged and skipped and the
remaining migrations still run, so the serverless function still boots and serves
requests. A single failing or transient migration MUST NOT take the whole site
down with `FUNCTION_INVOCATION_FAILED`.

#### Scenario: One migration errors on cold start

- **WHEN** a migration throws during cold-start migration
- **THEN** the error is logged, the other migrations apply, and the API boots and
  responds (e.g. `/health` returns 200)
