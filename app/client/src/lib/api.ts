/**
 * Single axios instance + typed helpers for the OIAS Earth admin REST layer.
 *
 * AUTH CONTRACT (CONFIRMED by live test, see spec/write_contracts.md):
 *   - Every /api/v1 call sends the RAW JWT in `Authorization` with NO
 *     "Bearer " prefix. Sending "Bearer <token>" yields 500 "jwt malformed";
 *     absent/wrong header yields 403 "Missing Authorisation Token!".
 *   - The original GraphQL surface used "Bearer <token>". This rebuild
 *     standardises every admin read/write on the REST layer, so we always send
 *     the raw token. (Documented divergence — no GraphQL client here.)
 *
 * WRITE CONTRACT (CONFIRMED, spec/write_contracts.md):
 *   - Create/Update => POST /api/v1/<entity>/upsert as multipart/form-data
 *     (text fields + optional logo/image File fields). NO id => INSERT;
 *     id present => UPDATE. Response { data: <record> }.
 *   - Delete => POST /api/v1/<entity>/delete with body { id, <entity>_id }.
 *     HARD delete. Response { message }.
 *
 * PAGINATION (spec openQuestions[7]): employee/list returns
 *   {data,total,page,limit}; all other lists return {data,pagination:{...}}.
 *   listEntity() normalises both into Paginated<T>.
 */
import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
} from 'axios';
import { getToken, clearSession, type UserDetails } from './auth-storage';
import type {
  EntityName,
  Paginated,
  Pagination,
} from '../types/entities';

/** Same-origin base path; Vite proxies /api/v1 -> Express in dev. */
export const API_BASE_URL = '/api/v1';

/**
 * Auth service base. The original ran on a separate host
 * (dev-auth.oiasearth.com). In the rebuild the Express server exposes the
 * same path under the proxied /api/v1, so we default to that. Override with
 * VITE_AUTH_BASE_URL if the auth service is split out again.
 */
const AUTH_BASE_URL =
  (import.meta.env?.VITE_AUTH_BASE_URL as string | undefined) ?? API_BASE_URL;

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach the RAW token (no Bearer prefix). See header doc.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.set('Authorization', token);
  }
  return config;
});

// Response interceptor: on 401/403, drop the stale session. Components/router
// observe the cleared session and bounce to the login screen.
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      clearSession();
    }
    return Promise.reject(normalizeError(error));
  },
);

/** A flat, display-ready error. Components render `.message`. */
export interface ApiError {
  message: string;
  status?: number;
  raw?: unknown;
}

function normalizeError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data as
      | { message?: string; error?: string }
      | undefined;
    const message =
      data?.message ||
      data?.error ||
      error.message ||
      'Something went wrong. Please try again.';
    return { message, status, raw: error.response?.data };
  }
  return { message: 'Unexpected error', raw: error };
}

/* ----------------------------- Auth ----------------------------- */

export interface LoginResponse {
  token: string;
  // Login user object shape is an OPEN QUESTION (openQuestions[1]); permissive.
  user?: UserDetails;
  role?: string;
  profileId?: string;
  [key: string]: unknown;
}

/**
 * POST /auth/login {username,password} -> { token, ... }.
 * Returns the raw response so AuthContext can pull token/role/profileId/user
 * out of whatever shape the backend sends.
 */
export async function login(
  username: string,
  password: string,
): Promise<LoginResponse> {
  const { data } = await axios.post<LoginResponse>(
    `${AUTH_BASE_URL}/auth/login`,
    { username, password },
    { headers: { 'Content-Type': 'application/json' } },
  );
  return data;
}

/**
 * POST /auth/demo-login -> { token, ... }. Password-free admin session for the
 * pre-launch "click Dashboard, straight in" flow. 404s when the server has
 * ALLOW_DEMO_LOGIN=false. TEMPORARY — remove with the server route before launch.
 */
export async function demoLogin(): Promise<LoginResponse> {
  const { data } = await axios.post<LoginResponse>(
    `${AUTH_BASE_URL}/auth/demo-login`,
    {},
    { headers: { 'Content-Type': 'application/json' } },
  );
  return data;
}

/* ----------------------------- Lists ----------------------------- */

export interface ListParams {
  page?: number;
  limit?: number;
  /** Server-side search term (CONFIRMED: list body = {page,limit,search}). */
  search?: string;
  /** Per-column filters (inferred — openQuestions[5]). */
  filters?: Record<string, unknown>;
}

/** Raw {pagination} list shape (users, sponsors, forest, reports, jobs, roles). */
interface RawPaginatedResponse<T> {
  data: T[];
  pagination?: Partial<Pagination>;
  filter_limit?: Record<string, unknown>;
}

/** Raw flat employee shape: {data,total,page,limit}. */
interface RawFlatResponse<T> {
  data: T[];
  total?: number;
  page?: number;
  limit?: number;
}

function normalizePagination(
  raw: RawPaginatedResponse<unknown> | RawFlatResponse<unknown>,
  requested: { page: number; limit: number },
): Pagination {
  // {pagination:{...}} variant
  if ('pagination' in raw && raw.pagination) {
    return {
      total: raw.pagination.total ?? raw.data.length,
      page: raw.pagination.page ?? requested.page,
      limit: raw.pagination.limit ?? requested.limit,
    };
  }
  // flat {total,page,limit} variant (employee/list)
  const flat = raw as RawFlatResponse<unknown>;
  return {
    total: flat.total ?? raw.data.length,
    page: flat.page ?? requested.page,
    limit: flat.limit ?? requested.limit,
  };
}

/**
 * Normalised list result keyed `rows`/`total` rather than `data`/`pagination`.
 * The task asks listEntity to expose {rows,total,page,limit}; we provide that
 * here while ALSO keeping the historical {data,pagination} fields populated, so
 * existing module hooks (Users/Sponsors/Employees/Forests/Reports/Jobs) that
 * read `.data` / `.pagination.total` keep compiling. New code should prefer
 * `.rows` / `.total`.
 */
export interface ListResult<T> extends Paginated<T> {
  /** Alias of `data` (the page of rows). */
  rows: T[];
  /** Alias of `pagination.total`. */
  total: number;
  /** Alias of `pagination.page`. */
  page: number;
  /** Alias of `pagination.limit`. */
  limit: number;
}

/**
 * POST /api/v1/<name>/list — paginated, normalised list read.
 * Body: {page,limit,search?} (CONFIRMED). `filters` is forwarded when present
 * (reports/list returns filter_limit metadata — openQuestions[5]).
 *
 * Works for every entity regardless of which pagination shape the backend uses.
 * `name` is the REST route segment (e.g. 'users', 'employee', 'forest').
 * Returns {rows,total,page,limit} AND the legacy {data,pagination,filter_limit}.
 */
export async function listEntity<T>(
  name: EntityName,
  params: ListParams = {},
): Promise<ListResult<T>> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;
  const body: Record<string, unknown> = { page, limit };
  if (params.search) body.search = params.search;
  if (params.filters) body.filters = params.filters;

  const { data } = await api.post<
    RawPaginatedResponse<T> | RawFlatResponse<T>
  >(`/${name}/list`, body);

  const rows = data.data ?? [];
  const pagination = normalizePagination(data, { page, limit });
  const filter_limit =
    'filter_limit' in data
      ? (data as RawPaginatedResponse<T>).filter_limit
      : undefined;

  return {
    data: rows,
    pagination,
    filter_limit,
    rows,
    total: pagination.total,
    page: pagination.page,
    limit: pagination.limit,
  };
}

/* ----------------------------- Writes (upsert / delete) ----------------------------- */
/**
 * CONFIRMED write contract (spec/write_contracts.md), overriding the earlier
 * generic-REST guess (POST /<name>, PATCH /<name>/:id, DELETE /<name>/:id):
 *
 *   POST /api/v1/<name>/upsert   create OR update — multipart/form-data
 *                                (no id => INSERT, id present => UPDATE)
 *   POST /api/v1/<name>/delete   { id, <name>_id }  — HARD delete
 *
 * `name` is the write route segment. NB list routes are plural but the write
 * whitelist is SINGULAR for sponsors (`sponsor`) and reports (`report`); pass
 * the singular segment to writes (the EntityName union accepts both).
 */

/** Fields that the live API accepts as File uploads, by upsert route. */
export type UpsertFiles = Record<string, File | File[] | null | undefined>;

/** Scalar form values for an upsert (string/number/boolean/null). */
export type UpsertValue = string | number | boolean | null | undefined;
export type UpsertValues = Record<string, UpsertValue>;

/** Append a scalar to FormData with the live API's coercions. */
function appendScalar(fd: FormData, key: string, value: UpsertValue): void {
  if (value === undefined || value === null) return; // omit empties
  // Booleans + numbers go over the wire as strings (multipart has no types).
  fd.append(key, typeof value === 'string' ? value : String(value));
}

/** Build the multipart body for an upsert from scalar values + File fields. */
export function buildUpsertFormData(
  values: UpsertValues,
  files?: UpsertFiles,
): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(values)) {
    appendScalar(fd, key, value);
  }
  if (files) {
    for (const [key, file] of Object.entries(files)) {
      if (!file) continue;
      if (Array.isArray(file)) {
        for (const f of file) fd.append(key, f);
      } else {
        fd.append(key, file);
      }
    }
  }
  return fd;
}

/**
 * Returns true if any File field is present (so we must send multipart).
 * When no files are present we POST JSON — lighter and easier for the server
 * to parse — which the live upsert also accepts for text-only entities.
 */
function hasAnyFile(files?: UpsertFiles): boolean {
  if (!files) return false;
  return Object.values(files).some((f) =>
    Array.isArray(f) ? f.length > 0 : Boolean(f),
  );
}

/**
 * POST /api/v1/<name>/upsert. Create when `values` has no `id`; update when it
 * does (true upsert — same pattern as the async forest_upsert_v1 job).
 *
 * - With File fields => multipart/form-data.
 * - Without files    => JSON fallback (no FormData overhead).
 *
 * Returns the created/updated record (`response.data.data`).
 */
export async function upsertEntity<TRecord = unknown>(
  name: EntityName,
  values: UpsertValues,
  files?: UpsertFiles,
  config?: AxiosRequestConfig,
): Promise<TRecord> {
  if (hasAnyFile(files)) {
    const fd = buildUpsertFormData(values, files);
    const { data } = await api.post<{ data: TRecord }>(
      `/${name}/upsert`,
      fd,
      {
        ...config,
        // Let the browser set the multipart boundary; override the instance
        // default of application/json.
        headers: { ...config?.headers, 'Content-Type': 'multipart/form-data' },
      },
    );
    return data.data;
  }
  // JSON fallback (no files).
  const { data } = await api.post<{ data: TRecord }>(
    `/${name}/upsert`,
    values,
    config,
  );
  return data.data;
}

/** Response of a delete call: { message }. */
export interface DeleteResponse {
  message: string;
}

/**
 * POST /api/v1/<name>/delete with body { id, <name>_id }. HARD delete.
 * Sends BOTH keys (`id` and the entity-specific `<name>_id`) exactly as the
 * live site does. `name` here is the write segment (singular for sponsor/report).
 *
 * The entity-id key uses the singular form of the route segment, e.g.
 *   sponsor -> { id, sponsor_id }
 *   users   -> { id, users_id }  (live sends the route-derived key)
 *   forest  -> { id, forest_id }
 *
 * The generic `TResp` defaults to DeleteResponse; the explicit overload below
 * keeps existing callers that pass a different response generic compiling.
 */
export async function deleteEntity<TResp = DeleteResponse>(
  name: EntityName,
  id: string | number,
  config?: AxiosRequestConfig,
): Promise<TResp> {
  const body = { id, [`${name}_id`]: id };
  const { data } = await api.post<TResp>(`/${name}/delete`, body, config);
  return data;
}

/* ---------------- Back-compat write wrappers (deprecated) ---------------- */
/**
 * DEPRECATED back-compat shims. The confirmed contract has a single write
 * endpoint per entity (`/upsert`), distinguished only by the presence of `id`.
 * These wrappers keep the existing module hooks (which were written against the
 * earlier generic-REST guess) compiling while routing to the correct endpoint.
 *
 * New module code should call `upsertEntity(name, values, files?)` directly so
 * it can attach logo/image File fields. Remove these once all modules migrate.
 */

/** @deprecated use upsertEntity(name, values, files?) — routes to /upsert (INSERT). */
export async function createEntity<TResp = unknown, TBody = unknown>(
  name: EntityName,
  payload: TBody,
  config?: AxiosRequestConfig,
): Promise<TResp> {
  const record = await upsertEntity<unknown>(
    name,
    payload as UpsertValues,
    undefined,
    config,
  );
  // Original callers expect the FULL axios body { data: record }; preserve that
  // shape so `<{ data: { id } }>` generics still line up.
  return { data: record } as TResp;
}

/** @deprecated use upsertEntity(name, { ...values, id }, files?) — routes to /upsert (UPDATE). */
export async function updateEntity<TResp = unknown, TBody = unknown>(
  name: EntityName,
  id: string | number,
  payload: TBody,
  config?: AxiosRequestConfig,
): Promise<TResp> {
  const record = await upsertEntity<unknown>(
    name,
    { ...(payload as UpsertValues), id },
    undefined,
    config,
  );
  return { data: record } as TResp;
}

/* ----------------------------- Forest read-one ----------------------------- */

/** One reconstructed box (from forest_boxes + grouped forest_trees) for edit. */
export interface ForestFullBox {
  id: string;
  row: number | null;
  column: number | null;
  prefix: string | null;
  start: string | null;
  tree_to_tree_distance: string | number | null;
  row_position: number | null;
  column_position: number | null;
  species_data: { species_id: number; count: number; planted_on: string | null }[];
}

/**
 * Full forest record from GET /forest/:id — every scalar + jsonb column plus the
 * joined sponsors/employees, the user-role access, and a reconstructed box_data[].
 * Used to hydrate the edit wizard so no field opens blank.
 */
export interface ForestFullRecord {
  id: string;
  sponsors: { id: string; sponsor_name: string; sponsor_logo: string | null }[];
  employees: { id: string; name: string }[];
  box_data: ForestFullBox[];
  site_manager_id: string | null;
  user_role_id: string | null;
  [key: string]: unknown;
}

/** GET /api/v1/forest/:id — full record for the edit form. */
export async function fetchForestFull(id: string): Promise<ForestFullRecord> {
  const { data } = await api.get<{ data: ForestFullRecord }>(`/forest/${id}`);
  return data.data;
}

/* ----------------------------- Species search ----------------------------- */
/**
 * POST /api/v1/master-plantspecies/search { search } -> { data: [...] }.
 * Async catalog search used by the forest wizard's SpeciesSearchSelect and the
 * shared AutocompleteField. Returns the raw `data` array (caller types it).
 */
export async function speciesSearch<T = unknown>(
  q: string,
  config?: AxiosRequestConfig,
): Promise<T[]> {
  const { data } = await api.post<{ data?: T[] }>(
    '/master-plantspecies/search',
    { search: q },
    config,
  );
  return data.data ?? [];
}
