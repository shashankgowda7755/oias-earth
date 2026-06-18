/**
 * Planters — SuperAdmin onboarding for field workers. List existing planters +
 * create one scoped to forests. Backed by GET/POST /admin/planters and
 * GET /my/forests. Planters log in to the offline field PWA at /field.
 */
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/components';
import { fetchMyForests, type FieldForest } from '@/field/fieldApi';

interface Planter {
  id: string;
  username: string;
  name: string | null;
  forests: string[];
}

export default function Planters() {
  const toast = useToast();
  const [list, setList] = useState<Planter[]>([]);
  const [forests, setForests] = useState<FieldForest[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [pw, setPw] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const load = () =>
    api
      .get<{ data: Planter[] }>('/admin/planters')
      .then((r) => setList(r.data.data))
      .catch(() => undefined)
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    fetchMyForests().then(setForests).catch(() => undefined);
  }, []);

  const toggle = (id: string) =>
    setPicked((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  async function create() {
    if (!username.trim() || pw.length < 6) {
      toast.show('Username + a 6+ char password required.', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.post('/admin/planters', {
        username: username.trim(),
        password: pw,
        name: name.trim() || null,
        forest_ids: [...picked],
      });
      toast.show(`Planter ${username} created.`, 'success');
      setUsername('');
      setName('');
      setPw('');
      setPicked(new Set());
      setLoading(true);
      load();
    } catch (e: any) {
      toast.show(e?.response?.data?.message || 'Failed to create planter', 'error');
    } finally {
      setSaving(false);
    }
  }

  const inp = 'rounded-input border border-border px-3 py-2 text-sm w-full';

  return (
    <div className="p-1">
      <h2 className="text-lg font-medium text-textPrimary">Planters (field workers)</h2>
      <p className="mb-4 text-sm text-textSecondary">
        Field accounts for the offline capture app (/field), scoped to assigned forests.
      </p>

      <div className="mb-6 grid gap-3 rounded-input border border-border p-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
        <label className="text-xs text-textSecondary">Username
          <input className={inp} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="planter_ravi" autoCapitalize="none" />
        </label>
        <label className="text-xs text-textSecondary">Name
          <input className={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ravi Kumar" />
        </label>
        <label className="text-xs text-textSecondary">Password (6+)
          <input className={inp} value={pw} onChange={(e) => setPw(e.target.value)} type="text" placeholder="set a password" />
        </label>
        <button onClick={() => void create()} disabled={saving}
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {saving ? 'Creating…' : 'Create planter'}
        </button>
        <div className="md:col-span-4">
          <div className="mb-1 text-xs text-textSecondary">Assign forests</div>
          <div className="flex flex-wrap gap-2">
            {forests.map((f) => (
              <button key={f.id} type="button" onClick={() => toggle(f.id)}
                className={`rounded-full border px-3 py-1 text-xs ${picked.has(f.id) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-textSecondary'}`}>
                {f.name}
              </button>
            ))}
            {forests.length === 0 && <span className="text-xs text-textSecondary">No forests yet.</span>}
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-textSecondary">Loading…</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-textSecondary">No planters yet — create one above.</p>
      ) : (
        <div className="overflow-hidden rounded-input border border-border">
          <table className="w-full text-sm">
            <thead className="bg-black/5 text-left text-xs uppercase tracking-wide text-textSecondary">
              <tr><th className="px-4 py-2">Username</th><th className="px-4 py-2">Name</th><th className="px-4 py-2">Forests</th></tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-2 font-medium">{p.username}</td>
                  <td className="px-4 py-2 text-textSecondary">{p.name ?? '—'}</td>
                  <td className="px-4 py-2 text-textSecondary">{p.forests.length ? p.forests.join(', ') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
