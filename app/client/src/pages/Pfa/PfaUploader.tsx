/**
 * PFA photo uploader (/pfa, admin) — the office surface for adding report
 * photos. Pick a forest, then drag-and-drop a photo onto a slot; it uploads to
 * object storage and attaches the URL to that forest's report field. Per-quarter
 * slots (soil meter, inside/outside temp, progress) use the chosen FY + quarter.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '@/components/Toast';
import { uploadReportImage } from '../Forests/forestApi';
import { fetchForestOptions, type ForestOption } from '../Reports/reportApi';

interface Slot {
  key: string;
  label: string;
  perQuarter?: boolean;
}
const SLOTS: Slot[] = [
  { key: 'cover', label: 'Cover photo' },
  { key: 'content', label: 'Contents photo' },
  { key: 'impact', label: 'Project impact' },
  { key: 'permission', label: 'Permission letter' },
  { key: 'layout', label: 'Site layout' },
  { key: 'earth', label: 'Aerial / map (adds)' },
  { key: 'security', label: 'Site security (adds)' },
  { key: 'dashboard', label: 'Dashboard (adds)' },
  { key: 'soil_meter', label: 'Soil pH meter', perQuarter: true },
  { key: 'temp_inside', label: 'Inside plantation', perQuarter: true },
  { key: 'temp_outside', label: 'Outside plantation', perQuarter: true },
  { key: 'progress', label: 'Plantation progress', perQuarter: true },
];

export default function PfaUploader() {
  const toast = useToast();
  const [forests, setForests] = useState<ForestOption[]>([]);
  const [forestId, setForestId] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [quarter, setQuarter] = useState(Math.floor(new Date().getMonth() / 3) + 1);
  const [status, setStatus] = useState<Record<string, string>>({});
  const [over, setOver] = useState('');

  useEffect(() => { fetchForestOptions().then(setForests).catch(() => undefined); }, []);

  const upload = async (slot: Slot, file?: File | null) => {
    if (!file) return;
    if (!forestId) { toast.error('Pick a forest first.'); return; }
    setStatus((s) => ({ ...s, [slot.key]: 'uploading' }));
    try {
      const r = await uploadReportImage(forestId, slot.key, file, slot.perQuarter ? { year, quarter } : undefined);
      setStatus((s) => ({ ...s, [slot.key]: r.url }));
      toast.success(`${slot.label} uploaded.`);
    } catch (e) {
      setStatus((s) => ({ ...s, [slot.key]: 'error' }));
      toast.error(e instanceof Error ? e.message : 'Upload failed.');
    }
  };

  return (
    <div className="min-h-screen bg-appbg text-textPrimary">
      <header className="flex h-16 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="text-sm text-textSecondary hover:text-textPrimary">← Dashboard</Link>
          <span className="text-textSecondary">/</span>
          <span className="font-serif text-lg font-semibold">Photo uploader</span>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_1fr]">
          <label className="text-sm">
            <span className="mb-1 block text-textSecondary">Forest</span>
            <select value={forestId} onChange={(e) => setForestId(e.target.value)} className="w-full rounded-button border border-border bg-surface px-3 py-2 text-sm">
              <option value="">Select a forest…</option>
              {forests.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-textSecondary">FY year</span>
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value) || year)} className="w-full rounded-button border border-border bg-surface px-3 py-2 text-sm" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-textSecondary">Quarter</span>
            <select value={quarter} onChange={(e) => setQuarter(Number(e.target.value))} className="w-full rounded-button border border-border bg-surface px-3 py-2 text-sm">
              {[1, 2, 3, 4].map((q) => <option key={q} value={q}>Q{q}</option>)}
            </select>
          </label>
        </div>
        <p className="mt-2 text-xs text-textSecondary">Per-quarter slots (soil meter, inside/outside, progress) use the FY + quarter above. Drag a photo onto a slot, or click it.</p>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {SLOTS.map((slot) => {
            const st = status[slot.key];
            const isUrl = st && st !== 'uploading' && st !== 'error';
            return (
              <label
                key={slot.key}
                onDragOver={(e) => { e.preventDefault(); setOver(slot.key); }}
                onDragLeave={() => setOver('')}
                onDrop={(e) => { e.preventDefault(); setOver(''); upload(slot, e.dataTransfer.files?.[0]); }}
                className={`relative flex aspect-[4/3] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-card border-2 border-dashed p-2 text-center transition-colors ${over === slot.key ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
              >
                <input type="file" accept="image/*" className="hidden" onChange={(e) => upload(slot, e.target.files?.[0])} />
                {isUrl ? (
                  <img src={st} alt={slot.label} className="absolute inset-0 h-full w-full object-cover" />
                ) : null}
                <div className={`relative z-10 ${isUrl ? 'rounded bg-black/55 px-2 py-1' : ''}`}>
                  <div className={`text-xs font-medium ${isUrl ? 'text-white' : 'text-textPrimary'}`}>{slot.label}</div>
                  <div className={`mt-0.5 text-[11px] ${isUrl ? 'text-white/80' : 'text-textSecondary'}`}>
                    {st === 'uploading' ? 'Uploading…' : st === 'error' ? 'Failed — retry' : isUrl ? '✓ uploaded · replace' : slot.perQuarter ? `drop · Q${quarter}` : 'drop or click'}
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        {forestId ? (
          <a href={`/report/forest/${forestId}?year=${year}&quarter=${quarter}`} target="_blank" rel="noopener" className="mt-5 inline-block rounded-button border border-border px-4 py-2 text-sm hover:bg-white/5">
            View report ↗
          </a>
        ) : null}
      </div>
    </div>
  );
}
