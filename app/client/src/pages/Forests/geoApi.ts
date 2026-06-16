/**
 * Geo-tagging API helpers — thin typed wrappers over the shared axios `api`
 * (raw-token auth, baseURL /api/v1). Backed by routes/forest.ts:
 *   GET  /forest/:id/geo          -> center, boundary, counts, tagged trees
 *   POST /forest/:id/trees/list   -> paginated tree register (lat/lng nullable)
 *   POST /forest/:id/trees/geo    -> set/update ONE tree's coordinates
 */
import { api } from '@/lib/api';

export interface GeoTree {
  tree_unique_id: string | null;
  lat: number | null;
  lng: number | null;
  species: string | null;
}

export interface ForestGeo {
  center: { lat: number | null; lng: number | null };
  boundary: { lat: number; lng: number }[];
  counts: { tagged: number; total: number };
  trees: GeoTree[];
}

export interface RegisterTree {
  id: string;
  tree_unique_id: string | null;
  plant_name: string | null;
  plant_species: string | null;
  species_common_name: string | null;
  planted_on: string | null;
  oxygen_generated: string | null;
  lat: string | number | null;
  lng: string | number | null;
}

export async function getForestGeo(forestId: string): Promise<ForestGeo> {
  const res = await api.get<{ data: ForestGeo }>(`/forest/${forestId}/geo`);
  return res.data.data;
}

export async function listForestTrees(
  forestId: string,
  params: { limit?: number; offset?: number; search?: string } = {},
): Promise<{ data: RegisterTree[]; pagination: { total: number } }> {
  const res = await api.post<{ data: RegisterTree[]; pagination: { total: number } }>(
    `/forest/${forestId}/trees/list`,
    { limit: 500, offset: 0, search: '', ...params },
  );
  return res.data;
}

export interface TagTreeResult {
  id: string;
  tree_unique_id: string | null;
  lat: number | null;
  lng: number | null;
}

export async function tagTreeGeo(
  forestId: string,
  body: { tree_id?: string; tree_unique_id?: string; lat: number; lng: number },
): Promise<TagTreeResult> {
  const res = await api.post<{ data: TagTreeResult }>(
    `/forest/${forestId}/trees/geo`,
    body,
  );
  return res.data.data;
}
