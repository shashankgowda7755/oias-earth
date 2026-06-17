/**
 * Offline capture queue + read-cache for the field PWA, backed by IndexedDB
 * (idb-keyval). Captures made with no signal are stored here (photo as a Blob)
 * and flushed to the API when connectivity returns. Forest/tree lists are
 * cached so a planter who opened a forest online can still work offline.
 */
import { get, set, update } from 'idb-keyval';

export interface PendingCapture {
  localId: string;
  forestId: string;
  treeId: string;
  treeLabel: string;
  timeline_date: string;
  status_id: number;
  height?: string;
  diameter?: string;
  lat?: number;
  lng?: number;
  photo?: Blob;
  createdAt: number;
}

const QKEY = 'field:queue';

export async function enqueue(c: PendingCapture): Promise<void> {
  await update<PendingCapture[]>(QKEY, (q = []) => [...q, c]);
}
export async function getQueue(): Promise<PendingCapture[]> {
  return (await get<PendingCapture[]>(QKEY)) ?? [];
}
export async function removeFromQueue(localId: string): Promise<void> {
  await update<PendingCapture[]>(QKEY, (q = []) => q.filter((x) => x.localId !== localId));
}

export async function cacheForests(list: unknown): Promise<void> {
  await set('field:forests', list);
}
export async function getCachedForests<T>(): Promise<T[]> {
  return (await get<T[]>('field:forests')) ?? [];
}
export async function cacheTrees(forestId: string, list: unknown): Promise<void> {
  await set(`field:trees:${forestId}`, list);
}
export async function getCachedTrees<T>(forestId: string): Promise<T[]> {
  return (await get<T[]>(`field:trees:${forestId}`)) ?? [];
}
