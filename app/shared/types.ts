/**
 * Shared TypeScript types for the CommuniTREE / OIAS Earth admin rebuild.
 *
 * SOURCE OF TRUTH
 * ---------------
 * Derived from spec/data_model_full.json (52 PostGraphile entities) and
 * spec/rest_list_shapes.json (live REST list response shapes).
 *
 * NAMING CONVENTION (important — two surfaces, two casings)
 * ---------------------------------------------------------
 * The original system exposes the SAME Postgres columns through two APIs:
 *   - GraphQL (PostGraphile): camelCase  (e.g. firstName, forestUniqueId)
 *   - REST list endpoints:    snake_case (e.g. first_name, forest_unique_id)
 *
 * Our rebuild standardises on the REST layer (see project brief AUTH CONTRACT).
 * Therefore:
 *   - DB columns + REST JSON  => snake_case        (the `*Row` interfaces below
 *                                                   and the DB column comments).
 *   - Domain/app-facing types => camelCase         (the entity interfaces, used
 *                                                   in code that is casing-agnostic).
 *
 * Each entity below documents its snake_case <-> camelCase mapping so the
 * frontend and SQL layers stay in sync. The `*Row` aliases describe the EXACT
 * snake_case shape the REST list endpoints return (verified against
 * rest_list_shapes.json) — these are what the React Query hooks consume.
 *
 * TODO(openQuestions): The spec leaves several things uncertain (forest wizard
 * steps 3-6 field requiredness, exact filter param names, login user object
 * shape, GraphQL-vs-REST for writes). Those are flagged inline. Do not invent
 * business rules beyond what the spec documents.
 */

/* ------------------------------------------------------------------ */
/* Common primitives                                                   */
/* ------------------------------------------------------------------ */

export type UUID = string;
/** ISO-8601 timestamp string (Postgres timestamptz serialised by pg/JSON). */
export type ISODateString = string;
/** ISO date (YYYY-MM-DD) for `date` columns. */
export type DateOnlyString = string;

/** Audit columns present on most tables (snake_case as stored + returned). */
export interface AuditColumns {
  created_by: UUID | null;
  updated_by: UUID | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

/** Standard list pagination block ({data, pagination:{...}} style endpoints). */
export interface Pagination {
  total: number;
  page: number;
  limit: number;
}

/** Body accepted by every `/list` + `/search` endpoint. */
export interface ListRequest {
  page?: number;
  limit?: number;
  search?: string;
  // TODO(openQuestions): exact filter field names are not documented in the
  // spec ("only {page,limit} confirmed"). `filters` is accepted but currently
  // only `search` (ILIKE on the name column) is wired in the server.
  filters?: Record<string, unknown>;
}

/** Most list endpoints: {data, pagination}. */
export interface ListResponse<T> {
  data: T[];
  pagination: Pagination;
}

/**
 * employee/list uses a flattened pagination shape instead of nesting it.
 * NOTE (spec openQuestions): "Pagination response inconsistency: employee/list
 * uses {total,page,limit}; others use {pagination:{...}} — backend likely two
 * code paths." We faithfully reproduce both. IMPROVEMENT: normalise on the
 * nested {pagination} shape everywhere in a v2.
 */
export interface FlatListResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

/* ------------------------------------------------------------------ */
/* MasterRole  (master_roles)                                          */
/*   id:int name is_active timestamps                                  */
/* ------------------------------------------------------------------ */

export interface MasterRole {
  id: number;
  name: string | null;
  isActive: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** roles/list returns only {id, name} (verified rest_list_shapes.json). */
export interface RoleListRow {
  id: number;
  name: string;
}

/* ------------------------------------------------------------------ */
/* UserProfile  (user_profiles)                                        */
/*   snake_case columns:                                               */
/*   id, first_name, last_name, address, email_id, mobile_no:bigint,   */
/*   mobile_country_code, user_id:int, is_active, is_verified, otp,     */
/*   image_url, created_by, updated_by, created_at, updated_at         */
/* ------------------------------------------------------------------ */

export interface UserProfile {
  id: UUID;
  firstName: string | null; // first_name
  lastName: string | null; // last_name
  address: string | null; // address
  emailId: string | null; // email_id
  /** mobile_no — bigint in DB; serialised as string to avoid JS precision loss. */
  mobileNo: string | null;
  mobileCountryCode: string | null; // mobile_country_code
  userId: number | null; // user_id (legacy int auth id)
  isActive: boolean; // is_active
  isVerified: boolean; // is_verified
  otp: string | null; // otp
  imageUrl: string | null; // image_url
  createdBy: UUID | null; // created_by
  updatedBy: UUID | null; // updated_by
  createdAt: ISODateString; // created_at
  updatedAt: ISODateString; // updated_at
}

/* ------------------------------------------------------------------ */
/* UserRole  (user_roles)                                              */
/*   id:uuid profile_id:uuid->user_profiles role_id:int->master_roles  */
/*   is_active timestamps created_by updated_by                        */
/* ------------------------------------------------------------------ */

export interface UserRole {
  id: UUID;
  profileId: UUID | null; // profile_id
  roleId: number | null; // role_id
  isActive: boolean; // is_active
  createdBy: UUID | null;
  updatedBy: UUID | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/* ------------------------------------------------------------------ */
/* UserRoleForestAccess  (user_role_forest_accesses)                   */
/*   join user_roles<->forests (scoped forest access for non-super)    */
/* ------------------------------------------------------------------ */

export interface UserRoleForestAccess {
  id: UUID;
  userRoleId: UUID | null; // user_role_id
  forestId: UUID | null; // forest_id
  isActive: boolean;
  createdBy: UUID | null;
  updatedBy: UUID | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/**
 * users/list joins user_roles + master_roles onto user_profiles.
 * Verified snake/camel MIX exactly as returned by the live endpoint
 * (firstName/lastName/imageUrl are camelCase, but user_role_id is snake_case —
 * we reproduce the observed shape faithfully).
 */
export interface UserListRow {
  id: number | UUID; // observed numeric legacy id in sample (271)
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  username: string | null;
  role: string | null; // master_roles.name
  roleId: number | null; // master_roles.id
  user_role_id: UUID | null; // user_roles.id
  email: string | null; // user_profiles.email_id
  mobile: string | null; // user_profiles.mobile_no
}

/* ------------------------------------------------------------------ */
/* Sponsor  (sponsors)                                                 */
/* ------------------------------------------------------------------ */

export interface Sponsor {
  id: UUID;
  sponsorName: string | null; // sponsor_name
  sponsorLogo: string | null; // sponsor_logo
  sponsorForestLogo: string | null; // sponsor_forest_logo
  sponsorTreeLogo: string | null; // sponsor_tree_logo
  sponsorOgImageUrl: string | null; // sponsor_og_image_url
  establishedYear: string | null; // established_year
  websiteUrl: string | null; // website_url
  industry: string | null; // industry
  headquarters: string | null; // headquarters
  isActive: boolean; // is_active
  createdBy: UUID | null;
  updatedBy: UUID | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** sponsors/list raw snake_case row (note createdAt/updatedAt are camelCase). */
export interface SponsorListRow {
  id: UUID;
  sponsor_name: string | null;
  sponsor_logo: string | null;
  is_active: boolean;
  sponsor_forest_logo: string | null;
  sponsor_tree_logo: string | null;
  sponsor_og_image_url: string | null;
  established_year: string | null;
  website_url: string | null;
  industry: string | null;
  headquarters: string | null;
  created_by: UUID | null;
  updated_by: UUID | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/* ------------------------------------------------------------------ */
/* Employee  (employees)                                               */
/* ------------------------------------------------------------------ */

export interface Employee {
  id: UUID;
  name: string | null;
  profileImage: string | null; // profile_image
  designation: string | null;
  contactNo: string | null; // contact_no
  emailId: string | null; // email_id
  isActive: boolean;
  createdBy: UUID | null;
  updatedBy: UUID | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** employee/list raw snake_case row. */
export interface EmployeeListRow {
  id: UUID;
  name: string | null;
  profile_image: string | null;
  designation: string | null;
  contact_no: string | null;
  email_id: string | null;
  created_by: UUID | null;
  updated_by: UUID | null;
  is_active: boolean;
  created_at: ISODateString;
  updated_at: ISODateString;
}

/* ------------------------------------------------------------------ */
/* Forest  (forests)                                                   */
/*   Largest entity. Many JSON columns (jsonb in DB).                  */
/* ------------------------------------------------------------------ */

/** Generic JSON value alias for the many jsonb columns on forests/reports. */
export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [key: string]: Json };

export interface Forest {
  id: UUID;
  forestName: string | null; // forest_name
  forestDesc: string | null; // forest_desc
  forestUniqueId: string | null; // forest_unique_id
  forestInternalId: string | null; // forest_internal_id
  forestUrl: string | null; // forest_url
  forestGeoLat: string | null; // forest_geo_lat
  forestGeoLong: string | null; // forest_geo_long
  forestGeoRadius: string | null; // forest_geo_radius
  forestGeoShape: string | null; // forest_geo_shape
  forestBoundary: Json; // forest_boundary (jsonb)
  forestOxygen: string | null; // forest_oxygen (numeric as string)
  forestCarbonoffset: string | null; // forest_carbonoffset
  forestAddress: string | null; // forest_address
  forestCity: string | null; // forest_city
  forestState: string | null; // forest_state
  forestCountry: string | null; // forest_country
  isActive: boolean; // is_active
  totalTrees: number | null; // total_trees
  averageAge: number | null; // average_age
  totalSpeciesPlanted: number | null; // total_species_planted
  totalDrying: number | null; // total_drying
  totalDamaged: number | null; // total_damaged
  totalEmptyPits: number | null; // total_empty_pits
  totalDead: number | null; // total_dead
  boxRows: number | null; // box_rows
  boxColumn: number | null; // box_column
  boxToBoxDistance: number | null; // box_to_box_distance
  treeRow: number | null; // tree_row
  treeColumn: number | null; // tree_column
  treeToTreeDistance: number | null; // tree_to_tree_distance
  directionAngle: number | null; // direction_angle
  boundaryGap: number | null; // boundary_gap
  projectSite: string | null; // project_site
  projectDetails: Json; // project_details (jsonb)
  projectPeriod: number | null; // project_period
  plantationDate: DateOnlyString | null; // plantation_date
  plantationStrategy: string | null; // plantation_strategy
  plantationStrategyOther: string | null; // plantation_strategy_other
  irrigationMethod: string | null; // irrigation_method
  irrigationMethodOther: string | null; // irrigation_method_other
  climate: string | null; // climate
  climateOther: string | null; // climate_other
  soilType: string | null; // soil_type
  soilTypeOther: string | null; // soil_type_other
  soilPhLevel: Json; // soil_ph_level (jsonb)
  temperatureHumidity: Json; // temperature_humidity (jsonb)
  landOwnership: Json; // land_ownership (jsonb)
  landArea: Json; // land_area (jsonb)
  authorizationDetails: Json; // authorization_details (jsonb)
  permissionLetter: string | null; // permission_letter
  areaPopulationStatisticsDetails: Json; // area_population_statistics_details (jsonb)
  directAndIndirectBeneficiaries: Json; // direct_and_indirect_beneficiaries (jsonb)
  forestValueFlowImpactReport: Json; // forest_value_flow_impact_report (jsonb)
  speciesDetails: Json; // species_details (jsonb)
  maintenanceWorkforce: Json; // maintenance_workforce (jsonb)
  plantGrowthData: Json; // plant_growth_data (jsonb)
  environmentalNeedIndicators: Json; // environmental_need_indicators (jsonb)
  securityAndInfrastructure: Json; // security_and_infrastructure (jsonb)
  plantationProgress: Json; // plantation_progress (jsonb)
  additionalSponsorLogo: Json; // additional_sponsor_logo (jsonb)
  dashboardImages: Json; // dashboard_images (jsonb)
  reportImages: Json; // report_images (jsonb)
  siteLayout: string | null; // site_layout
  pathwaySpacing: number | null; // pathway_spacing
  digipin: string | null; // digipin
  lastInspectionDate: ISODateString | null; // last_inspection_date
  isUpdated: boolean; // is_updated
  createdBy: UUID | null;
  updatedBy: UUID | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** Nested sponsor mini-object embedded in forest/list rows. */
export interface ForestListSponsorRef {
  id: UUID;
  sponsor_name: string | null;
  sponsor_logo: string | null;
  sponsor_forest_logo: string | null;
  sponsor_tree_logo: string | null;
  sponsor_og_image_url: string | null;
}

/** Nested {id, first_name} user ref used in forest/list + reports/list. */
export interface UserMiniRef {
  id: UUID;
  first_name: string | null;
}

/** forest/list raw row (subset of columns + joined sponsors[]). */
export interface ForestListRow {
  id: UUID;
  forest_name: string | null;
  forest_geo_lat: string | null;
  forest_geo_long: string | null;
  forest_oxygen: string | null;
  forest_carbonoffset: string | null;
  forest_address: string | null;
  forest_city: string | null;
  forest_state: string | null;
  forest_country: string | null;
  is_active: boolean;
  created_at: ISODateString;
  updated_at: ISODateString;
  created_by: UserMiniRef | null;
  updated_by: UserMiniRef | null;
  forest_unique_id: string | null;
  forest_internal_id: string | null;
  total_trees: number | null;
  average_age: number | null;
  total_species_planted: number | null;
  box_rows: number | null;
  box_column: number | null;
  tree_row: number | null;
  tree_column: number | null;
  project_period: number | null;
  plantation_date: DateOnlyString | null;
  is_updated: boolean;
  sponsors: ForestListSponsorRef[];
}

/* ------------------------------------------------------------------ */
/* Report  (reports)                                                   */
/* ------------------------------------------------------------------ */

export interface Report {
  id: UUID;
  year: number | null;
  quarter: number | null;
  reportDate: ISODateString | null; // report_date
  plantationDate: ISODateString | null; // plantation_date
  startDate: ISODateString | null; // start_date
  endDate: ISODateString | null; // end_date
  mode: string | null;
  type: string | null;
  version: number | null;
  reportData: Json; // report_data (jsonb)
  projectPeriod: number | null; // project_period
  skip: Json; // skip (jsonb array)
  forestId: UUID | null; // forest_id
  isActive: boolean;
  createdBy: UUID | null;
  updatedBy: UUID | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** Joined forest mini-object on reports/list. */
export interface ReportForestRef {
  id: UUID;
  forest_name: string | null;
  forest_unique_id: string | null;
}

/** reports/list raw row with nested Forest/CreatedBy/UpdatedBy. */
export interface ReportListRow {
  id: UUID;
  year: number | null;
  quarter: number | null;
  report_date: ISODateString | null;
  plantation_date: ISODateString | null;
  start_date: ISODateString | null;
  end_date: ISODateString | null;
  mode: string | null;
  type: string | null;
  version: number | null;
  project_period: number | null;
  forest_id: UUID | null;
  skip: Json;
  created_by: UUID | null;
  updated_by: UUID | null;
  is_active: boolean;
  created_at: ISODateString;
  updated_at: ISODateString;
  Forest: ReportForestRef | null;
  CreatedBy: UserMiniRef | null;
  UpdatedBy: UserMiniRef | null;
}

/** reports/list adds a filter_limit metadata block (contents undocumented). */
export interface ReportListResponse extends ListResponse<ReportListRow> {
  // TODO(openQuestions): "reports returns filter_limit hinting at filter
  // metadata" — exact shape unknown. We return an object of available filter
  // bounds (e.g. distinct years/quarters) as a faithful best-effort.
  filter_limit: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/* Job  (jobs)  — read-only async job monitor                          */
/* ------------------------------------------------------------------ */

export interface Job {
  id: UUID;
  jobId: string; // job_id
  jobType: string | null; // job_type
  jobDescription: Json; // job_description (jsonb)
  status: string; // status
  payload: Json; // payload (jsonb)
  result: Json; // result (jsonb)
  createdBy: UUID; // created_by
  updatedBy: UUID; // updated_by
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** jobs/list raw snake_case row. */
export interface JobListRow {
  id: UUID;
  job_id: string;
  job_type: string | null;
  job_description: Json;
  status: string;
  payload: Json;
  result: Json;
  created_by: UUID;
  updated_by: UUID;
  created_at: ISODateString;
  updated_at: ISODateString;
}

/* ------------------------------------------------------------------ */
/* ForestTree  (forest_trees)                                          */
/* ------------------------------------------------------------------ */

export interface ForestTree {
  id: UUID;
  forestId: UUID | null; // forest_id
  masterPlantSpeciesId: number | null; // master_plant_species_id
  forestTreeName: string | null; // forest_tree_name
  forestTreePetname: string | null; // forest_tree_petname
  forestTreeHeight: string | null; // forest_tree_height
  forestTreeDia: string | null; // forest_tree_dia
  forestTreeAge: number | null; // forest_tree_age
  forestTreeOxygen: string | null; // forest_tree_oxygen
  forestTreeCarbonoffset: string | null; // forest_tree_carbonoffset
  forestTreeGeoLat: string | null; // forest_tree_geo_lat
  forestTreeGeoLong: string | null; // forest_tree_geo_long
  treeUniqueId: string | null; // tree_unique_id
  treeStatusId: number | null; // tree_status_id -> tree_status_master
  planterId: number | null; // planter_id -> planters
  planterReasonId: number | null; // planter_reason_id -> master_planting_reasons
  plantingMessage: string | null; // planting_message
  plantedOn: DateOnlyString | null; // planted_on
  plantedBy: string | null; // planted_by
  boxId: UUID | null; // box_id -> forest_boxes
  clusterIds: UUID[] | null; // cluster_ids (uuid[])
  sponsoredBy: UUID | null; // sponsored_by -> sponsors
  assignedTo: UUID | null; // assigned_to
  isDisplay: boolean; // is_display
  isActive: boolean; // is_active
  landmark: string | null; // landmark
  createdBy: UUID | null;
  updatedBy: UUID | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/* ------------------------------------------------------------------ */
/* ForestCluster  (forest_clusters)                                    */
/* ------------------------------------------------------------------ */

export interface ForestCluster {
  id: UUID;
  forestId: UUID | null; // forest_id
  lat: string; // lat
  lng: string; // lng
  zoom: number | null; // zoom
  treeCount: number | null; // tree_count
  tree: Json; // tree (jsonb)
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/* ------------------------------------------------------------------ */
/* Join tables                                                         */
/* ------------------------------------------------------------------ */

export interface ForestSponsor {
  id: UUID;
  forestId: UUID | null; // forest_id
  sponsorId: UUID | null; // sponsor_id
  isActive: boolean;
  createdBy: UUID | null;
  updatedBy: UUID | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface ForestsEmployee {
  id: UUID;
  forestId: UUID | null; // forest_id
  employeeId: UUID | null; // employee_id
  isActive: boolean;
  createdBy: UUID | null;
  updatedBy: UUID | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface ForestsReport {
  id: UUID;
  forestId: UUID | null; // forest_id
  reportId: UUID | null; // report_id
  isActive: boolean;
  createdBy: UUID | null;
  updatedBy: UUID | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/* ------------------------------------------------------------------ */
/* Lookup / master tables                                              */
/* ------------------------------------------------------------------ */

export interface MasterPlantspecy {
  id: number;
  speciesCategory: string | null; // species_category
  speciesName: string | null; // species_name
  speciesDesc: string | null; // species_desc
  commonName: string | null; // common_name
  speciesOxygenLevel1: string | null; // species_oxygen_level1
  speciesOxygenLevel2: string | null; // species_oxygen_level2
  speciesOxygenLevel3: string | null; // species_oxygen_level3
  speciesOxygenLevel4: string | null; // species_oxygen_level4
  speciesOxygenLevel5: string | null; // species_oxygen_level5
  oxygenPerDay: number | null; // oxygen_per_day
  carbonOffsetPerDay: number | null; // carbon_offset_per_day
  rate: number | null; // rate
  saplingOrder: number | null; // sapling_order
  isSaplingOrderFromWhatsapp: boolean; // is_sapling_order_from_whatsapp
  isTimberProduction: boolean; // is_timber_production
  isNestingHabitat: boolean; // is_nesting_habitat
  isFloweringPlant: boolean; // is_flowering_plant
  isFruitBearing: boolean; // is_fruit_bearing
  isActive: boolean; // is_active
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** Shape returned by /master-plantspecies/search (snake_case rows). */
export interface MasterPlantspecyRow {
  id: number;
  species_category: string | null;
  species_name: string | null;
  common_name: string | null;
  species_desc: string | null;
  oxygen_per_day: number | null;
  carbon_offset_per_day: number | null;
  rate: number | null;
  is_active: boolean;
}

export interface Planter {
  id: number;
  name: string | null;
  /** mobile_no — bigint; serialised as string. */
  mobileNo: string | null;
  isActive: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface TreeStatusMaster {
  id: number;
  status: string | null;
  isActive: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface MasterPlantingReason {
  id: number;
  reason: string | null;
  isActive: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * Login response. The original login user object shape was not captured
 * (spec openQuestions). We return the fields the client stores in
 * localStorage: token, role, profileId, userDetails.
 */
export interface AuthUser {
  profileId: UUID;
  userRoleId: UUID;
  username: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: string; // master_roles.name e.g. "SuperAdmin"
  roleId: number;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

/** JWT payload signed by the auth route + verified by the middleware. */
export interface JwtPayload {
  profileId: UUID;
  userRoleId: UUID;
  username: string;
  role: string;
  roleId: number;
}

/** Standard error envelope returned by the API ({error:true,message}). */
export interface ApiError {
  error: true;
  message: string;
}
