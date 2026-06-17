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
  };
  visits: TreeVisit[];
}

export async function fetchTreeProof(id: string): Promise<TreeProof> {
  const r = await fetch(`${BASE}/tree/${id}`);
  if (!r.ok) throw new Error('Tree not found');
  const j = (await r.json()) as { data: TreeProof };
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
