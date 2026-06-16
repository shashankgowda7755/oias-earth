/**
 * Shared helpers for list endpoints: pagination param parsing and a safe
 * count+rows runner.
 */
import { query } from '../db';
import type { ListRequest } from '../../../shared/types';

export interface PageParams {
  page: number;
  limit: number;
  offset: number;
  search: string;
}

/**
 * Parse {page, limit, search} from a POST body with sane bounds.
 * Defaults match the observed UI: page 1, limit 10 (RowsPerPage default).
 */
export function parsePageParams(body: unknown): PageParams {
  const b = (body ?? {}) as Partial<ListRequest>;
  const page = Math.max(1, Number.isFinite(Number(b.page)) ? Math.trunc(Number(b.page)) : 1);
  const rawLimit = Number.isFinite(Number(b.limit)) ? Math.trunc(Number(b.limit)) : 10;
  // Clamp limit to [1, 100] to protect the DB from unbounded queries.
  const limit = Math.min(100, Math.max(1, rawLimit));
  const search = typeof b.search === 'string' ? b.search.trim() : '';
  return { page, limit, offset: (page - 1) * limit, search };
}

/** Run a COUNT(*) and return the integer total. */
export async function countTotal(
  fromAndWhere: string,
  params: ReadonlyArray<unknown>
): Promise<number> {
  const r = await query<{ total: string }>(
    `SELECT COUNT(*)::text AS total ${fromAndWhere}`,
    params
  );
  return Number(r.rows[0]?.total ?? 0);
}
