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
  tree_unique_id: string | null;
  lat: number | null;
  lng: number | null;
  species: string | null;
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
