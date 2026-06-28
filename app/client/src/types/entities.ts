/**
 * Shared entity types for the OIAS Earth admin rebuild.
 *
 * Field shapes are taken from the LIVE REST list responses
 * (spec/rest_list_shapes.json) — these are snake_case as the REST layer
 * returns them, EXCEPT the users + roles + sponsor timestamp fields which
 * the live API already returns camelCase. We keep each type faithful to what
 * the endpoint actually sends rather than normalising, so module agents can
 * render columns directly without guessing.
 *
 * NOTE (open question, spec openQuestions[7]): the backend is inconsistent —
 * employee/list returns {data,total,page,limit} while everything else returns
 * {data,pagination:{...}}. listEntity() in lib/api.ts normalises both to a
 * single Paginated<T> shape, so consumers never see the difference.
 */

/** Normalised pagination returned by listEntity() for every entity. */
export interface Pagination {
  total: number;
  page: number;
  limit: number;
}

/** Normalised list result returned by listEntity(). */
export interface Paginated<T> {
  data: T[];
  pagination: Pagination;
  /** reports/list adds this; passed through untouched. (openQuestions[5]) */
  filter_limit?: Record<string, unknown>;
}

/**
 * Entity names accepted by listEntity / crud helpers — maps to a REST route
 * segment.
 *
 * NOTE (integration): the backend is NOT symmetric between list and CRUD for
 * two entities. List routes are plural (`sponsors/list`, `reports/list`) but
 * the generic CRUD whitelist keys writes off the SINGULAR segment
 * (server/src/routes/crud.ts -> ENTITIES.sponsor / ENTITIES.report). Both the
 * plural (list) and singular (write) segments are therefore valid values here,
 * so modules can pass the right one to listEntity vs create/update/deleteEntity
 * without an `as EntityName` cast. (`employee` and `forest` are already
 * singular for both list and CRUD.)
 */
export type EntityName =
  | 'users'
  | 'roles'
  | 'sponsors'
  | 'sponsor' // CRUD segment for sponsors (singular)
  | 'employee'
  | 'forest'
  | 'reports'
  | 'report' // CRUD segment for reports (singular)
  | 'jobs'
  | 'master-plantspecies' // list segment for the species catalog
  | 'species'; // CRUD segment for master_plantspecies

/* ---- Users (users/list — camelCase as returned live) ---- */
export interface UserRow {
  id: number | string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  username: string;
  role: string;
  roleId: number;
  /**
   * uuid of the user_roles join row (returned by users/list).
   *
   * INTEGRATION NOTE: edit/delete in this rebuild key on the PROFILE id
   * (`UserRow.id`), NOT this join-row id. The server's PATCH/DELETE
   * /api/v1/users/:id take the profile id and update the linked user_roles row
   * internally (server/src/routes/crud.ts). `user_role_id` is retained for
   * parity with the live response and in case a future caller is pointed at the
   * original GraphQL backend, which keyed mutations on the join-row id.
   */
  user_role_id: string;
  email: string | null;
  mobile: string | null;
}

/* ---- Roles (roles/list) ---- */
export interface RoleRow {
  id: number;
  name: string;
}

/* ---- Sponsors (sponsors/list — snake_case + camelCase timestamps) ---- */
export interface SponsorRow {
  id: string;
  sponsor_name: string;
  sponsor_email: string | null;
  sponsor_logo: string | null;
  is_active: boolean;
  sponsor_forest_logo: string | null;
  sponsor_tree_logo: string | null;
  sponsor_og_image_url: string | null;
  established_year: string | null;
  website_url: string | null;
  industry: string | null;
  headquarters: string | null;
  created_by: string | null;
  updated_by: string | null;
  createdAt: string;
  updatedAt: string;
}

/* ---- Species (master-plantspecies/list — camelCase) ---- */
export interface SpeciesRow {
  id: number | string;
  speciesName: string | null;
  commonName: string | null;
  speciesCategory: string | null;
  speciesDesc: string | null;
  oxygenPerDay: number | null;
  carbonOffsetPerDay: number | null;
  rate: number | null;
  woodDensity: number | null;
  isTimberProduction: boolean;
  isFloweringPlant: boolean;
  isFruitBearing: boolean;
  isNestingHabitat: boolean;
  isActive: boolean;
}

/* ---- Employees (employee/list) ---- */
export interface EmployeeRow {
  id: string;
  name: string;
  profile_image: string | null;
  designation: string | null;
  contact_no: string | null;
  email_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Sponsor summary embedded in a forest row's `sponsors` array. */
export interface ForestSponsorSummary {
  id: string;
  sponsor_name: string;
  sponsor_logo: string | null;
  sponsor_forest_logo: string | null;
  sponsor_tree_logo: string | null;
  sponsor_og_image_url: string | null;
}

/** Joined user summary embedded as created_by / updated_by on forests. */
export interface UserSummary {
  id: string;
  first_name: string;
}

/* ---- Forests (forest/list) ---- */
export interface ForestRow {
  id: string;
  forest_name: string;
  forest_geo_lat: string | null;
  forest_geo_long: string | null;
  forest_oxygen: string | null;
  forest_carbonoffset: string | null;
  forest_address: string | null;
  forest_city: string | null;
  forest_state: string | null;
  forest_country: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: UserSummary | string | null;
  updated_by: UserSummary | string | null;
  forest_unique_id: string;
  forest_internal_id: string;
  total_trees: number;
  average_age: number;
  total_species_planted: number;
  box_rows: number;
  box_column: number;
  tree_row: number;
  tree_column: number;
  project_period: number;
  plantation_date: string | null;
  is_updated: boolean;
  sponsors: ForestSponsorSummary[];
}

/** Joined forest summary embedded on a report row. */
export interface ReportForestSummary {
  id: string;
  forest_name: string;
  forest_unique_id: string;
}

/* ---- Reports (reports/list) ---- */
export interface ReportRow {
  id: string;
  year: number;
  quarter: number;
  report_date: string | null;
  plantation_date: string | null;
  start_date: string | null;
  end_date: string | null;
  mode: string | null;
  type: string | null;
  version: number;
  project_period: number;
  forest_id: string;
  /** Free-form report payload (jsonb). Returned by reports/list for edit prefill. */
  report_data?: unknown;
  skip: unknown;
  created_by: string | null;
  updated_by: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  Forest: ReportForestSummary | null;
  CreatedBy: UserSummary | null;
  UpdatedBy: UserSummary | null;
}

/* ---- Jobs (jobs/list) ---- */
export interface JobRow {
  id: string;
  job_id: string;
  job_type: string;
  job_description: Record<string, unknown> | null;
  status: string;
  payload: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}
