/**
 * Integrity — SuperAdmin review queue for capture-integrity flags: visits whose
 * GPS is far from the forest centre (possible spoof) or whose photo is a reused
 * duplicate. Reads GET /admin/integrity. A human reviews; nothing is auto-deleted.
 */
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Flag {
  timeline_id: number;
  date: string | null;
  geo_suspect: boolean;
  geo_distance_m: number | null;
  photo_duplicate: boolean;
  tree_id: string;
  tree_unique_id: string | null;
  forest_id: string;
  forest_name: string | null;
}

function fmt(d: string | null): string {
  if (!d) return '—';
  const t = new Date(d);
  return isNaN(t.getTime()) ? d : t.toLocaleDateString();
}

export default function Integrity() {
  const [rows, setRows] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ data: Flag[] }>('/admin/integrity')
      .then((r) => setRows(r.data.data))
      .catch((e) => setErr(e?.response?.data?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="p-6 text-sm text-textSecondary">Loading integrity queue…</p>;
  if (err) return <p className="p-6 text-sm text-red-600">{err}</p>;

  return (
    <div className="p-1">
      <div className="mb-3">
        <h2 className="text-lg font-medium text-textPrimary">Capture integrity</h2>
        <p className="text-sm text-textSecondary">
          Visits flagged for review: GPS far from the forest, or a reused photo. Click a tree to inspect its record.
        </p>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-input border border-border bg-paper p-6 text-center text-sm text-textSecondary">
          ✓ No integrity flags — every capture passes (GPS within forest, photos unique).
        </div>
      ) : (
        <div className="overflow-hidden rounded-input border border-border">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-textSecondary">
              <tr>
                <th className="px-4 py-2">Tree</th>
                <th className="px-4 py-2">Forest</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Flag</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.timeline_id} className="border-t border-border">
                  <td className="px-4 py-2 font-medium">{r.tree_unique_id ?? r.tree_id.slice(0, 8)}</td>
                  <td className="px-4 py-2 text-textSecondary">{r.forest_name}</td>
                  <td className="px-4 py-2 text-textSecondary">{fmt(r.date)}</td>
                  <td className="px-4 py-2">
                    {r.geo_suspect && (
                      <span className="mr-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                        GPS {r.geo_distance_m != null ? `${(r.geo_distance_m / 1000).toFixed(1)}km off` : 'off'}
                      </span>
                    )}
                    {r.photo_duplicate && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800">duplicate photo</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <a href={`/tree/${r.tree_id}`} target="_blank" rel="noreferrer" className="text-primary">
                      View ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
