## ADDED Requirements

### Requirement: A job that cannot complete is shown as error, never indefinitely pending

The Jobs list SHALL NOT present a job as `pending` indefinitely. Because no async
worker runs on the serverless host, a job left in `pending` beyond a short grace
window (15 minutes) MUST be surfaced as `error` with an explanatory result, so
the operator sees a terminal state rather than a forever-spinner. Jobs written
`completed` inline (e.g. the synchronous forest upsert) are unaffected.

#### Scenario: A stalled pending job

- **WHEN** the Jobs list includes a job that has been `pending` for longer than
  the grace window
- **THEN** it is shown with status `error` and a "Job stalled" result, not as
  `pending`
