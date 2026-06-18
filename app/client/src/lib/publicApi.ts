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
  sponsor_name?: string | null;
  sponsor_logo?: string | null;
}

export interface PublicTree {
  id: string;
  tree_unique_id: string | null;
  lat: number | null;
  lng: number | null;
  species: string | null;
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
}

export interface CarbonSummary {
  measured_trees: number;
  gross_tco2e: number;
  net_tco2e: number;
  buffer_pct: number;
  uncertainty_pct: number;
  method: string;
  label: string;
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
  };
  visits: TreeVisit[];
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

export async function fetchForestTrees(id: string): Promise<PublicTree[]> {
  const r = await fetch(`${BASE}/forest/${id}/trees`);
  if (!r.ok) throw new Error('Failed to load trees');
  const j = (await r.json()) as { data: PublicTree[] };
  return j.data;
}
