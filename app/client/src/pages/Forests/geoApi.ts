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

export async function setForestBoundary(
  forestId: string,
  boundary: { lat: number; lng: number }[],
): Promise<{ points: number }> {
  const res = await api.post<{ data: { points: number } }>(
    `/forest/${forestId}/boundary`,
    { boundary },
  );
  return res.data.data;
}

export interface Panorama {
  id: number;
  label: string | null;
  provider: string | null;
  embed_url: string;
  captured_on: string | null;
  is_active?: boolean;
}

export async function listPanoramas(forestId: string): Promise<Panorama[]> {
  const res = await api.get<{ data: Panorama[] }>(`/forest/${forestId}/panoramas`);
  return res.data.data;
}

export async function addPanorama(
  forestId: string,
  body: { embed_url: string; label?: string; captured_on?: string },
): Promise<Panorama> {
  const res = await api.post<{ data: Panorama }>(`/forest/${forestId}/panoramas`, body);
  return res.data.data;
}

export async function deletePanorama(forestId: string, pid: number): Promise<void> {
  await api.post(`/forest/${forestId}/panoramas/${pid}/delete`, {});
}

// ---- 360 tour: scenes + hotspots + links ----
export interface SceneRow { id: number; label: string | null; image_url: string; lat: number | null; lng: number | null; default_yaw: number; default_pitch: number; display_order: number; is_demo: boolean }
export interface HotspotRow { id: number; scene_id: number; tree_id: string; yaw: number; pitch: number; tree_unique_id: string | null; species: string | null }
export interface LinkRow { id: number; from_scene_id: number; to_scene_id: number; yaw: number; pitch: number; label: string | null }

export async function listScenes(forestId: string): Promise<{ scenes: SceneRow[]; hotspots: HotspotRow[]; links: LinkRow[] }> {
  const r = await api.get<{ data: { scenes: SceneRow[]; hotspots: HotspotRow[]; links: LinkRow[] } }>(`/forest/${forestId}/scenes`);
  return r.data.data;
}
export async function uploadSceneImage(forestId: string, file: File): Promise<string> {
  const fd = new FormData();
  fd.append('image', file);
  const r = await api.post<{ data: { url: string } }>(`/forest/${forestId}/scenes/upload`, fd);
  return r.data.data.url;
}
/** Upload a 360 image stored IN the database (no external object storage needed). */
export async function uploadSceneImageDb(forestId: string, file: File): Promise<string> {
  const fd = new FormData();
  fd.append('image', file);
  const r = await api.post<{ data: { url: string } }>(`/forest/${forestId}/scenes/upload-db`, fd);
  return r.data.data.url;
}
export async function createScene(forestId: string, body: { image_url: string; label?: string; lat?: number; lng?: number; default_yaw?: number; default_pitch?: number; is_demo?: boolean }): Promise<{ id: number }> {
  const r = await api.post<{ data: { id: number } }>(`/forest/${forestId}/scenes`, body);
  return r.data.data;
}
export async function deleteScene(forestId: string, sid: number): Promise<void> {
  await api.post(`/forest/${forestId}/scenes/${sid}/delete`, {});
}
export async function addHotspot(forestId: string, sid: number, body: { tree_id?: string; tree_unique_id?: string; yaw: number; pitch: number }): Promise<{ id: number }> {
  const r = await api.post<{ data: { id: number } }>(`/forest/${forestId}/scenes/${sid}/hotspots`, body);
  return r.data.data;
}
export async function deleteHotspot(forestId: string, hid: number): Promise<void> {
  await api.post(`/forest/${forestId}/hotspots/${hid}/delete`, {});
}
export async function addLink(forestId: string, sid: number, body: { to_scene_id: number; yaw: number; pitch: number; label?: string }): Promise<{ id: number }> {
  const r = await api.post<{ data: { id: number } }>(`/forest/${forestId}/scenes/${sid}/links`, body);
  return r.data.data;
}
export async function deleteLink(forestId: string, lid: number): Promise<void> {
  await api.post(`/forest/${forestId}/links/${lid}/delete`, {});
}

// ---- Tap-to-Tag Studio: tap creates next sapling + hotspot; edit / delete ----
export interface TapResult { tree_id: string; tree_unique_id: string; hotspot_id: number; lat: string | null; lng: string | null; geo_is_modeled: boolean }
export async function tapTree(forestId: string, sid: number, body: { prefix: string; species_name?: string; species_id?: number; yaw: number; pitch: number }): Promise<TapResult> {
  const r = await api.post<{ data: TapResult }>(`/forest/${forestId}/scenes/${sid}/tap-tree`, body);
  return r.data.data;
}
export async function updateStudioTree(forestId: string, treeId: string, body: { tree_unique_id?: string; species_name?: string; species_id?: number }): Promise<void> {
  await api.post(`/forest/${forestId}/studio/tree/${treeId}`, body);
}
export async function deleteStudioTree(forestId: string, treeId: string): Promise<void> {
  await api.post(`/forest/${forestId}/studio/tree/${treeId}/delete`, {});
}

// ---- Gifting: recipient per tree + email the certificate ----
export interface GiftRow { id: string; gift_tree_id: string; name: string | null; email_id: string | null; message: string | null; is_email_sent: boolean; tree_unique_id: string | null }
export async function listGifts(forestId: string): Promise<{ gifts: GiftRow[]; mailReady: boolean }> {
  const r = await api.get<{ data: GiftRow[]; mail_ready: boolean }>(`/forest/${forestId}/gifts`);
  return { gifts: r.data.data, mailReady: r.data.mail_ready };
}
export async function setGift(forestId: string, treeId: string, body: { name?: string; email?: string; message?: string }): Promise<void> {
  await api.post(`/forest/${forestId}/trees/${treeId}/gift`, body);
}
export async function sendGift(forestId: string, treeId: string): Promise<{ sent_to: string }> {
  const r = await api.post<{ data: { sent_to: string } }>(`/forest/${forestId}/trees/${treeId}/gift/send`, {});
  return r.data.data;
}
export async function sendAllGifts(forestId: string, resend = false): Promise<{ sent: number; total: number; errors: string[] }> {
  const r = await api.post<{ data: { sent: number; total: number; errors: string[] } }>(`/forest/${forestId}/gifts/send-all`, { resend: String(resend) });
  return r.data.data;
}

export const TREE_STATUSES = [
  { id: 1, label: 'Healthy' },
  { id: 2, label: 'Drying' },
  { id: 3, label: 'Damaged' },
  { id: 4, label: 'Dead' },
];

export interface VisitInput {
  timeline_date: string;
  status_id?: number;
  height?: number;
  diameter?: number;
  age?: number;
  lat?: number;
  lng?: number;
  photo?: File | null;
}

/** Log a longitudinal visit (revisit) for one tree. Multipart (optional photo). */
export async function logVisit(
  forestId: string,
  treeId: string,
  v: VisitInput,
): Promise<{ id: number }> {
  const fd = new FormData();
  fd.append('timeline_date', v.timeline_date);
  if (v.status_id != null) fd.append('status_id', String(v.status_id));
  if (v.height != null) fd.append('height', String(v.height));
  if (v.diameter != null) fd.append('diameter', String(v.diameter));
  if (v.age != null) fd.append('age', String(v.age));
  if (v.lat != null) fd.append('lat', String(v.lat));
  if (v.lng != null) fd.append('lng', String(v.lng));
  if (v.photo) fd.append('photo', v.photo);
  const res = await api.post<{ data: { id: number } }>(
    `/forest/${forestId}/trees/${treeId}/visit`,
    fd,
  );
  return res.data.data;
}
