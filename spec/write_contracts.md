# Write Contracts (confirmed by live test on staging, 2026-06-16)

Captured by creating + deleting one marked test Sponsor (`ZZ_TEST_CLAUDE Sponsor`). Record was hard-deleted afterward; staging left clean. Resolves the spec's open question "do writes go through GraphQL or REST" — **answer: REST**.

All write calls use REST on `dev-api.bethetreehugger.co`, auth header `Authorization: <rawToken>` (NO `Bearer`).

## List (read)
`POST /api/v1/<entity>/list`
- body: `{ "page": 1, "limit": 10, "search": "" }`
- resp: `{ data: [...snake_case rows...], pagination: { total, page, limit } }` (employee/list uses `{data,total,page,limit}`; reports/list adds `filter_limit`)

## Create / Update — UPSERT (multipart)
`POST /api/v1/<entity>/upsert`
- **Content-Type: multipart/form-data** (because of logo/image file fields). Text columns as form fields + file inputs (e.g. `sponsor_logo`) as files.
- NO `id` in body => INSERT. `id` present => UPDATE. (true upsert; same pattern as the async `forest_upsert_v1` job)
- resp: `{ data: { ...full created/updated record... } }`
- Sponsor required fields observed: `sponsor_name`, `established_year` (valid year), at least one logo file. On upload the file goes to the e2enetworks object store; the returned URL is stored in `sponsor_logo` / `sponsor_forest_logo` / `sponsor_tree_logo`.

Example resp (create):
```json
{ "data": {
  "id": "<uuid>", "sponsor_name": "...", "established_year": "2024",
  "website_url": "...", "industry": "...", "headquarters": "...",
  "is_active": true, "created_by": "<uuid>", "updated_by": "<uuid>",
  "sponsor_logo": "https://bethetreehugger-staging.objectstore.e2enetworks.net/sponsors/sponsor_logo-<ts>-<file>",
  "sponsor_forest_logo": "https://.../sponsor_forest_logo-<ts>-<file>"
} }
```

## Delete (HARD delete)
`POST /api/v1/<entity>/delete`
- body: `{ "id": "<uuid>", "<entity>_id": "<uuid>" }`  (sends both keys, e.g. `id` + `sponsor_id`)
- resp: `{ "message": "Sponsor deleted successfully" }`
- UI confirm dialog warns "This action cannot be undone" and "detaches from all associated forests and trees" => hard delete + cascade detach (despite an `is_active` column existing).

## Row actions
Each table row's kebab/icon menu => **View / Edit / Delete**. Edit reopens the upsert form prefilled (with `id`); Delete => ConfirmDialog => `/delete`.

## Inference for other entities
By symmetry the same trio almost certainly applies per entity: `forest/upsert` (confirmed via job), `employee/upsert|delete`, `users/upsert|delete` (user has the profile+role split), `reports/upsert|delete`. Forest create runs as an **async job** (`job_type: forest_upsert_v1`, visible in Jobs tab) that also processes boxes/trees/clusters — heavier than a simple upsert.
