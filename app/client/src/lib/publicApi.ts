/**
 * Public (no-auth) API helpers for the live forest map. Plain fetch — these
 * endpoints are mounted before requireAuth, so no token is sent or needed.
 */
const BASE = '/api/v1/public';

export interface ForestPin {
  id: string;
  name: string | null;
  unique_id: string | null;
  lat: number | null;
  lng: number | null;
  city: string | null;
  state: string | null;
  country: string | null;
  total_trees: number;
  tagged_trees: number;
  alive_trees?: number;
  survival_pct?: number | null;
  sponsor_name?: string | null;
  sponsor_logo?: string | null;
}

export interface PublicTree {
  id: string;
  tree_unique_id: string | null;
  pet_name?: string | null;
  lat: number | null;
  lng: number | null;
  species: string | null;
  height?: number | null;
  dbh?: number | null;
  status_id?: number | null;
  status?: string | null;
  survival?: 'alive' | 'dead';
  co2e_kg?: number | null;
  last_seen?: string | null;
}

export interface TreeVisit {
  id: number;
  date: string | null;
  status: string | null;
  status_id: number | null;
  height: number | null;
  diameter: number | null;
  age: number | null;
  lat: number | null;
  lng: number | null;
  photos: string[];
  co2e_kg?: number;
  co2e_delta_kg?: number;
  geo_suspect?: boolean;
  photo_duplicate?: boolean;
}

export interface CarbonSummary {
  measured_trees: number;
  gross_tco2e: number;
  net_tco2e: number;
  buffer_pct: number;
  uncertainty_pct: number;
  method: string;
  label: string;
  anchor?: {
    root_hash: string;
    ledger_rows: number | null;
    status: string | null;
    anchored_at: string | null;
  } | null;
}

export async function fetchCarbonSummary(): Promise<CarbonSummary> {
  const r = await fetch(`${BASE}/carbon`);
  if (!r.ok) throw new Error('Failed to load carbon summary');
  const j = (await r.json()) as { data: CarbonSummary };
  return j.data;
}

export interface TreeProof {
  tree: {
    id: string;
    tree_unique_id: string | null;
    species: string | null;
    species_name: string | null;
    forest_id: string | null;
    forest_name: string | null;
    forest_unique_id: string | null;
    city: string | null;
    state: string | null;
    planted_on: string | null;
    lat: number | null;
    lng: number | null;
    is_demo?: boolean;
  };
  summary: {
    survival: 'alive' | 'dead' | 'unknown';
    visit_count: number;
    latest_status: string | null;
    latest_height: number | null;
    growth_cm: number | null;
    last_seen: string | null;
    co2e_kg?: number;
    co2e_net_kg?: number;
    carbon_method?: string;
    carbon_label?: string;
    verification?: {
      photos_unique: boolean;
      gps_consistent: boolean;
      monitored: boolean;
    };
  };
  visits: TreeVisit[];
}

export interface LookupResult {
  type: 'tree' | 'forest';
  id: string;
  name?: string | null;
}

export async function lookup(q: string): Promise<LookupResult | null> {
  const r = await fetch(`${BASE}/lookup?q=${encodeURIComponent(q)}`);
  if (!r.ok) return null;
  const j = (await r.json()) as { data: LookupResult | null };
  return j.data;
}

export async function fetchTreeProof(id: string): Promise<TreeProof> {
  const r = await fetch(`${BASE}/tree/${id}`);
  if (!r.ok) throw new Error('Tree not found');
  const j = (await r.json()) as { data: TreeProof };
  return j.data;
}

export interface Sponsor {
  name: string | null;
  logo: string | null;
  website: string | null;
}

export interface SponsorForest {
  id: string;
  name: string | null;
  unique_id: string | null;
  city: string | null;
  state: string | null;
  lat: number | null;
  lng: number | null;
  total_trees: number;
  tagged_trees: number;
  alive_trees: number;
  survival_pct: number | null;
}
export interface SponsorSite {
  sponsor: { name: string | null; logo: string | null; website: string | null; industry: string | null; headquarters: string | null };
  forests: SponsorForest[];
  totals: {
    forests: number; trees: number; alive: number; tagged: number;
    survival_pct: number | null; gross_tco2e: number; net_tco2e: number;
  };
}
export async function fetchSponsor(id: string): Promise<SponsorSite> {
  const r = await fetch(`${BASE}/sponsor/${id}`);
  if (!r.ok) throw new Error('Sponsor not found');
  const j = (await r.json()) as { data: SponsorSite };
  return j.data;
}

export async function fetchSponsors(): Promise<Sponsor[]> {
  const r = await fetch(`${BASE}/sponsors`);
  if (!r.ok) throw new Error('Failed to load sponsors');
  const j = (await r.json()) as { data: Sponsor[] };
  return j.data;
}

export async function fetchForestsMap(): Promise<ForestPin[]> {
  const r = await fetch(`${BASE}/forests-map`);
  if (!r.ok) throw new Error('Failed to load forests');
  const j = (await r.json()) as { data: ForestPin[] };
  return j.data;
}

export interface LeaderRow {
  id: string;
  name: string | null;
  logo: string | null;
  forests: number;
  trees: number;
  alive: number;
  survival_pct: number | null;
}
export async function fetchLeaderboard(): Promise<LeaderRow[]> {
  const r = await fetch(`${BASE}/leaderboard`);
  if (!r.ok) throw new Error('Failed');
  const j = (await r.json()) as { data: LeaderRow[] };
  return j.data;
}

export async function fetchForestBoundary(
  id: string,
): Promise<{ boundary: { lat: number; lng: number }[]; area_ha: number | null }> {
  const r = await fetch(`${BASE}/forest/${id}/boundary`);
  if (!r.ok) return { boundary: [], area_ha: null };
  const j = (await r.json()) as { data: { boundary: { lat: number; lng: number }[]; area_ha: number | null } };
  return j.data;
}

export async function fetchForestTrees(id: string): Promise<PublicTree[]> {
  const r = await fetch(`${BASE}/forest/${id}/trees`);
  if (!r.ok) throw new Error('Failed to load trees');
  const j = (await r.json()) as { data: PublicTree[] };
  return j.data;
}
