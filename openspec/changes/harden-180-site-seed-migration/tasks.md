# Tasks

- [x] Diagnose prod 500 outage via `vercel logs` → `migration failed: duplicate key value violates unique constraint "uq_sponsors_name"`
- [x] Read-only prod DB inspection (`vercel env pull` + `pg`) to confirm the failure mode and current data shape
- [x] Remove `CREATE UNIQUE INDEX uq_sponsors_name` from 027 (zero app references)
- [x] Convert 52 sponsor inserts → `INSERT … SELECT … WHERE NOT EXISTS (upper(trim(sponsor_name)) = upper(trim(...)))`
- [x] Leave `uq_forests_internal_id` + `uq_forest_sponsors` unchanged (prod clean there; back those tables' ON CONFLICT)
- [x] Repro in isolated PGlite: old unique-index creation fails on dup names; new insert is idempotent + case-insensitive; pre-existing dups untouched
- [x] Fresh PGlite boot applies 027 clean (110 forests; login + forest list 200)
- [x] Commit `a724606`; fast-forward `main` (`58a96a5..a724606`)
- [x] Deploy prod (worktree → `vercel --prod`); verify all endpoints 200, no migration errors
- [x] Prod DB integrity post-deploy: 53 sponsors (0 dup names) / 111 forests (all active, 0 dup internal_ids) / 116 links (0 orphan, 0 unlinked)
- [x] Delete pulled prod env file (no secret left on disk)
