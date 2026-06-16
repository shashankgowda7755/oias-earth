/**
 * Reports module API helpers.
 *
 * Reads use the shared `listEntity('reports', ...)` (POST /api/v1/reports/list)
 * which returns Paginated<ReportRow> plus the `filter_limit` metadata object.
 *
 * Writes need a small wrapper because of a route/segment mismatch in the
 * backend contract:
 *   - LIST  segment is `reports` (plural)  -> /api/v1/reports/list
 *   - CRUD  segment is `report`  (singular) -> /api/v1/report, /report/:id
 * (see server/src/routes/crud.ts ENTITIES key `report`). The shared
 * `EntityName` union only includes 'reports', so createEntity/updateEntity/
 * deleteEntity can't address the singular CRUD route in a type-safe way.
 *
 * SHARED-CONTRACT GAP (flagged in the return message): either add 'report' to
 * EntityName + have the server alias 'reports' for CRUD, or expose a reports
 * write helper in lib/api.ts. Until then we POST/PATCH/DELETE through the shared
 * `api` axios instance directly to `/report`, which still goes through the
 * raw-token interceptor and error normalisation. No new auth logic here.
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
  const { data } = await api.post<{ data: { id: string } }>(
    `/${REPORT_CRUD_SEGMENT}`,
    payload,
  );
  return data.data;
}

export async function updateReport(
  id: string,
  payload: ReportWritePayload,
): Promise<{ id: string }> {
  const { data } = await api.patch<{ data: { id: string } }>(
    `/${REPORT_CRUD_SEGMENT}/${id}`,
    payload,
  );
  return data.data;
}

export async function deleteReport(id: string): Promise<{ id: string }> {
  // Soft delete (is_active=false) per server CRUD; openQuestions[4].
  const { data } = await api.delete<{ data: { id: string } }>(
    `/${REPORT_CRUD_SEGMENT}/${id}`,
  );
  return data.data;
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
