/**
 * Reports module API helpers.
 *
 * Reads use the shared `listEntity('reports', ...)` (POST /api/v1/reports/list)
 * which returns Paginated<ReportRow> plus the `filter_limit` metadata object.
 *
 * Writes use the backend's generic CRUD verbs, NOT REST:
 *   - LIST   segment is `reports` (plural)   -> POST /api/v1/reports/list
 *   - CREATE/UPDATE                          -> POST /api/v1/report/upsert
 *     (no `id` => INSERT; `id` in body => UPDATE)
 *   - DELETE                                 -> POST /api/v1/report/delete
 *     body { id, report_id } (server sends BOTH keys; see crud.ts deleteEntity)
 * (see server/src/routes/crud.ts: `crudRouter.post('/:entity/upsert')` +
 * `/:entity/delete`, ENTITIES key `report`). There is NO REST `/report` or
 * `/report/:id` route — the original wrapper posted to those and 404'd, so
 * reports could never be created/edited/deleted. Fixed to the upsert/delete
 * contract. All calls go through the shared `api` axios instance (raw-token
 * interceptor + error normalisation); no new auth logic here.
 */
import { api } from '../../lib/api';
import { listEntity, type ListParams } from '../../lib/api';
import type { ForestRow, Paginated, ReportRow } from '../../types/entities';
import type { ReportWritePayload } from './reportForms';

/** CRUD URL segment for reports (singular — backend whitelist key). */
const REPORT_CRUD_SEGMENT = 'report';

export function listReports(
  params: ListParams,
): Promise<Paginated<ReportRow>> {
  return listEntity<ReportRow>('reports', params);
}

export async function createReport(
  payload: ReportWritePayload,
): Promise<{ id: string }> {
  // POST /api/v1/report/upsert with no id => INSERT.
  const { data } = await api.post<{ data: { id: string } }>(
    `/${REPORT_CRUD_SEGMENT}/upsert`,
    payload,
  );
  return data.data;
}

export async function updateReport(
  id: string,
  payload: ReportWritePayload,
): Promise<{ id: string }> {
  // POST /api/v1/report/upsert with id in body => UPDATE.
  const { data } = await api.post<{ data: { id: string } }>(
    `/${REPORT_CRUD_SEGMENT}/upsert`,
    { id, ...payload },
  );
  return data.data;
}

export async function deleteReport(id: string): Promise<{ id: string }> {
  // POST /api/v1/report/delete { id, report_id } — hard/soft per server CRUD.
  await api.post(`/${REPORT_CRUD_SEGMENT}/delete`, { id, report_id: id });
  return { id };
}

/** Email the rendered report to a recipient via Composio Gmail. */
export async function sendReport(
  id: string,
  to: string,
): Promise<{ ok: boolean; to: string; messageId?: string; url: string }> {
  const { data } = await api.post(`/${REPORT_CRUD_SEGMENT}/${id}/send`, { to });
  return (data?.data ?? data) as { ok: boolean; to: string; messageId?: string; url: string };
}

/**
 * Forest options for the Forest <select> in the report form.
 * Pulls a generous page of forests (the admin set is small) and maps to
 * {value:id, label:forest_name}. Falls back gracefully if the list is large —
 * the Forests module owns the full table; here we just need a picker.
 */
export interface ForestOption {
  value: string;
  label: string;
}

export async function fetchForestOptions(): Promise<ForestOption[]> {
  const res = await listEntity<ForestRow>('forest', { page: 1, limit: 100 });
  return res.data.map((f) => ({
    value: f.id,
    label: f.forest_unique_id
      ? `${f.forest_name} (${f.forest_unique_id})`
      : f.forest_name,
  }));
}
