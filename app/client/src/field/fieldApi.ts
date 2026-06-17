/**
 * Field PWA API helpers over the shared axios client (raw-token auth).
 *   GET  /my/forests                         -> forests this user can capture in
 *   POST /forest/:id/trees/list              -> trees register
 *   POST /forest/:id/trees/:treeId/visit     -> log a visit (also sets geo)
 */
import { api } from '@/lib/api';

export interface FieldForest {
  id: string;
  name: string | null;
  unique_id: string | null;
  city: string | null;
  state: string | null;
  total_trees: number;
  tagged_trees: number;
}

export interface FieldTree {
  id: string;
  tree_unique_id: string | null;
  plant_species: string | null;
  species_common_name: string | null;
  lat: string | number | null;
  lng: string | number | null;
}

export async function fetchMyForests(): Promise<FieldForest[]> {
  const r = await api.get<{ data: FieldForest[] }>('/my/forests');
  return r.data.data;
}

export async function fetchTrees(forestId: string): Promise<FieldTree[]> {
  const r = await api.post<{ data: FieldTree[] }>(`/forest/${forestId}/trees/list`, {
    limit: 1000,
    offset: 0,
    search: '',
  });
  return r.data.data;
}

export interface VisitPayload {
  timeline_date: string;
  status_id: number;
  height?: string;
  diameter?: string;
  lat?: number;
  lng?: number;
}

export async function submitVisit(
  forestId: string,
  treeId: string,
  p: VisitPayload,
  photo?: Blob,
): Promise<{ id: number }> {
  const fd = new FormData();
  fd.append('timeline_date', p.timeline_date);
  fd.append('status_id', String(p.status_id));
  if (p.height) fd.append('height', p.height);
  if (p.diameter) fd.append('diameter', p.diameter);
  if (p.lat != null) fd.append('lat', String(p.lat));
  if (p.lng != null) fd.append('lng', String(p.lng));
  if (photo) fd.append('photo', photo, 'capture.jpg');
  const r = await api.post<{ data: { id: number } }>(
    `/forest/${forestId}/trees/${treeId}/visit`,
    fd,
  );
  return r.data.data;
}
