# Tasks

- [x] `reportApi.ts`: create/update → `POST /report/upsert`; delete → `POST /report/delete {id, report_id}`
- [x] Fix the stale "REST `/report`" doc comment to the upsert/delete contract
- [x] Reports row menu: add **View report ↗** → `/report/forest/:forest_id?year=&quarter=`
- [x] Client PDF: `reportDownload.ts` (html2canvas per `.rpt-slide` → jsPDF blob → download), dynamic-imported
- [x] Wire the report toolbar **Download PDF** to the client PDF (keep Print as fallback)
- [x] Verify live: old `/report` → 404, `/report/upsert` → 200; create/edit/delete from UI; View opens report; Download saves a file
