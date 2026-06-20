/**
 * Object storage — one switch so upload sites don't care which backend is live.
 * Backend chosen by STORAGE_BACKEND ('supabase' | 'blob'), else auto-detected
 * from whichever env is present (Supabase first, then Vercel Blob). No hard
 * dependency on the Supabase SDK: uploads go through its Storage REST API, so
 * switching backends is purely an env change.
 */
import { put } from '@vercel/blob';

type Backend = 'supabase' | 'blob' | 'none';

function detectBackend(): Backend {
  const forced = (process.env.STORAGE_BACKEND || '').toLowerCase();
  if (forced === 'supabase' || forced === 'blob') return forced;
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY && process.env.SUPABASE_BUCKET) return 'supabase';
  if (process.env.BLOB_READ_WRITE_TOKEN) return 'blob';
  return 'none';
}

export function storageBackend(): Backend {
  return detectBackend();
}
export function storageReady(): boolean {
  return detectBackend() !== 'none';
}

/**
 * Upload bytes and return a public URL. Throws if no backend is configured or
 * the upload fails — callers that have a graceful fallback should wrap in try.
 */
export async function putObject(key: string, body: Buffer, contentType: string): Promise<string> {
  const backend = detectBackend();

  if (backend === 'blob') {
    const blob = await put(key, body, { access: 'public', contentType });
    return blob.url;
  }

  if (backend === 'supabase') {
    const base = String(process.env.SUPABASE_URL).replace(/\/+$/, '');
    const bucket = String(process.env.SUPABASE_BUCKET);
    const objectPath = key.replace(/^\/+/, '');
    // Supabase Storage S3-compatible REST: POST raw bytes, service-role key.
    const res = await fetch(`${base}/storage/v1/object/${bucket}/${encodeURI(objectPath)}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${String(process.env.SUPABASE_SERVICE_KEY)}`,
        'content-type': contentType,
        'cache-control': '3600',
        'x-upsert': 'true',
      },
      body,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`supabase storage upload failed (${res.status}): ${detail.slice(0, 200)}`);
    }
    return `${base}/storage/v1/object/public/${bucket}/${encodeURI(objectPath)}`;
  }

  throw new Error(
    'object storage not configured (set SUPABASE_URL + SUPABASE_SERVICE_KEY + SUPABASE_BUCKET, or BLOB_READ_WRITE_TOKEN)',
  );
}
